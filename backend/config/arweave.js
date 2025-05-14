const Arweave = require('arweave');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

// Create directory for storing uploaded files in development mode
const DEV_UPLOADS_DIR = path.join(__dirname, '..', 'temp', 'uploads');
if (isDevelopment) {
  try {
    if (!fs.existsSync(DEV_UPLOADS_DIR)) {
      fs.mkdirSync(DEV_UPLOADS_DIR, { recursive: true });
      console.log(`Created development uploads directory: ${DEV_UPLOADS_DIR}`);
    }
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }
}

// Initialize Arweave client
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
  timeout: 20000,
  logging: false,
});

// Initialize with wallet from environment or generate a new one for testing
let wallet;
try {
  if (process.env.ARWEAVE_WALLET_JWK) {
    wallet = JSON.parse(process.env.ARWEAVE_WALLET_JWK);
  } else {
    console.warn('No Arweave wallet found in environment. Using a test wallet.');
    console.warn('Please add ARWEAVE_WALLET_JWK to your environment variables for production use.');
    // This will be initialized during first use
    wallet = null;
  }
} catch (error) {
  console.error('Error parsing Arweave wallet:', error);
  wallet = null;
}

// Generate a test wallet if needed (only for development)
const getTestWallet = async () => {
  if (!wallet) {
    wallet = await arweave.wallets.generate();
    console.warn('Generated new test wallet. This should not be used in production.');
  }
  return wallet;
};

/**
 * Generate a deterministic mock transaction ID based on content hash
 * This ensures the same content produces the same mock ID in development
 * @param {Buffer|string} data - The data/content to generate an ID for
 * @param {string} contentType - The content type (for additional entropy)
 * @returns {string} - A mock Arweave transaction ID (43 chars)
 */
const generateMockTransactionId = (data, contentType = '') => {
  // In development mode, create a deterministic ID based on content
  let dataToHash;
  
  if (Buffer.isBuffer(data)) {
    // If it's a large buffer, just use part of it to avoid expensive hashing
    dataToHash = data.length > 1024 ? data.slice(0, 1024) : data;
  } else {
    dataToHash = Buffer.from(String(data));
  }
  
  // Add content type to make different types of content have different IDs
  const contentInfo = contentType ? Buffer.from(contentType) : Buffer.from('');
  
  // Create a hash of the data and content type
  const hash = crypto.createHash('sha256');
  hash.update(dataToHash);
  hash.update(contentInfo);
  
  // Convert to base64 and format to match Arweave ID format
  return hash.digest('base64').replace(/[+/=]/g, '').substring(0, 43);
};

/**
 * Save the file locally in development mode and return its access path
 * @param {Buffer} data - File data to save
 * @param {string} id - Mock Arweave ID to use as filename
 * @param {string} contentType - MIME type of the content
 * @returns {string} - Path where the file was saved
 */
const saveFileLocally = (data, id, contentType) => {
  console.log(`Saving file locally with ID: ${id}, type: ${contentType}`);
  
  // Determine file extension based on content type
  let extension = 'bin'; // Default
  if (contentType.includes('image/jpeg')) extension = 'jpg';
  if (contentType.includes('image/png')) extension = 'png';
  if (contentType.includes('image/gif')) extension = 'gif';
  if (contentType.includes('video/mp4')) extension = 'mp4';
  if (contentType.includes('video/webm')) extension = 'webm';
  
  // Create filename with ID and proper extension
  const filename = `${id}.${extension}`;
  const filePath = path.join(DEV_UPLOADS_DIR, filename);
  
  try {
    // Ensure the directory exists
    if (!fs.existsSync(DEV_UPLOADS_DIR)) {
      fs.mkdirSync(DEV_UPLOADS_DIR, { recursive: true });
      console.log(`Created uploads directory at: ${DEV_UPLOADS_DIR}`);
    }
    
    // Save the file
    fs.writeFileSync(filePath, data);
    console.log(`File saved successfully at: ${filePath} (size: ${data.length} bytes)`);
    
    // Verify the file exists and has the correct size
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`Verified file exists: ${filePath}, size: ${stats.size} bytes`);
    } else {
      console.error(`ERROR: File was not saved properly: ${filePath}`);
    }
    
    return filePath;
  } catch (error) {
    console.error(`Error saving file locally: ${error.message}`);
    console.error(error.stack);
    throw error;
  }
};

// Upload data to Arweave
const uploadToArweave = async (data, contentType = 'application/octet-stream', tags = []) => {
  try {
    console.log(`Uploading to Arweave, contentType: ${contentType}, tags:`, tags);
    
    // In development mode, save file locally instead of uploading to Arweave
    if (isDevelopment) {
      console.log('Using development mode with local file storage.');
      const mockTransactionId = generateMockTransactionId(data, contentType);
      console.log(`Generated mock transaction ID: ${mockTransactionId}`);
      
      // Save the actual file locally so it can be served
      if (Buffer.isBuffer(data)) {
        const localPath = saveFileLocally(data, mockTransactionId, contentType);
        console.log(`Saved to local path: ${localPath}`);
        
        // Get the correct extension from the saved file
        const extension = path.extname(localPath).substring(1);
        console.log(`File extension: ${extension}`);
        
        return {
          id: mockTransactionId,
          status: 200,
          mock: true,
          localPath: `/api/uploads/${mockTransactionId}.${extension}`
        };
      } else {
        console.warn('Data is not a Buffer, not saving locally');
        
        return {
          id: mockTransactionId,
          status: 200,
          mock: true,
          localPath: `/api/uploads/${mockTransactionId}`
        };
      }
    }
    
    // Production mode - real Arweave upload
    const activeWallet = wallet || await getTestWallet();
    
    // Check wallet balance
    const address = await arweave.wallets.jwkToAddress(activeWallet);
    const balance = await arweave.wallets.getBalance(address);
    const winston = arweave.ar.winstonToAr(balance);
    
    if (parseFloat(winston) <= 0) {
      console.warn(`Arweave wallet has insufficient balance: ${winston} AR`);
      throw new Error('Insufficient Arweave wallet balance');
    }
    
    // Create transaction
    const transaction = await arweave.createTransaction({
      data: data instanceof Buffer ? data : Buffer.from(data),
    }, activeWallet);
    
    // Add content type
    transaction.addTag('Content-Type', contentType);
    
    // Add custom tags
    if (Array.isArray(tags)) {
      tags.forEach(tag => {
        if (tag.name && tag.value) {
          transaction.addTag(tag.name, tag.value);
        }
      });
    }
    
    // Sign and submit transaction
    await arweave.transactions.sign(transaction, activeWallet);
    const response = await arweave.transactions.post(transaction);
    
    console.log(`Arweave upload response: status=${response.status}, id=${transaction.id}`);
    
    if (response.status === 200 || response.status === 202) {
      return {
        id: transaction.id,
        status: response.status,
      };
    } else {
      throw new Error(`Failed to upload to Arweave. Status: ${response.status}`);
    }
  } catch (error) {
    // In development mode, continue with a mock transaction ID on error
    if (isDevelopment) {
      console.error('Error uploading to Arweave:', error);
      console.log('Using development mode with local file storage after error.');
      
      const mockTransactionId = generateMockTransactionId(data, contentType);
      console.log(`Generated mock transaction ID after error: ${mockTransactionId}`);
      
      // Save the actual file locally so it can be served
      if (Buffer.isBuffer(data)) {
        const localPath = saveFileLocally(data, mockTransactionId, contentType);
        console.log(`Saved to local path after error: ${localPath}`);
        
        // Get the correct extension from the saved file
        const extension = path.extname(localPath).substring(1);
        
        return {
          id: mockTransactionId,
          status: 200,
          mock: true,
          localPath: `/api/uploads/${mockTransactionId}.${extension}`
        };
      } else {
        return {
          id: mockTransactionId,
          status: 200,
          mock: true,
          localPath: `/api/uploads/${mockTransactionId}`
        };
      }
    }
    
    console.error('Error uploading to Arweave:', error);
    throw error;
  }
};

// Get data from Arweave
const getFromArweave = async (id) => {
  try {
    // For mock transaction IDs in development mode, try to find local file
    if (isDevelopment && id && id.length === 43) {
      console.log(`Looking for local file with ID: ${id}`);
      
      // Try to find the file with any extension
      const files = fs.readdirSync(DEV_UPLOADS_DIR);
      const matchingFile = files.find(file => file.startsWith(id + '.'));
      
      if (matchingFile) {
        const filePath = path.join(DEV_UPLOADS_DIR, matchingFile);
        console.log(`Found local file: ${filePath}`);
        return fs.readFileSync(filePath);
      }
      
      console.log(`No local file found for ID: ${id}`);
      return Buffer.from('Mock Arweave Data for development mode');
    }
    
    const data = await arweave.transactions.getData(id, {
      decode: true,
      string: false
    });
    return Buffer.from(data);
  } catch (error) {
    console.error('Error getting data from Arweave:', error);
    if (isDevelopment) {
      console.log('Returning mock data in development mode after error');
      return Buffer.from('Mock Arweave Data after error');
    }
    throw error;
  }
};

// Helper function to get Arweave gateway URL for browser access
const getArweaveUrl = (id) => {
  if (!id) return null;
  
  // For development mode, use local server URL
  if (isDevelopment) {
    // First try to find the file with the correct extension
    try {
      const files = fs.readdirSync(DEV_UPLOADS_DIR);
      const matchingFile = files.find(file => file.startsWith(id + '.'));
      
      if (matchingFile) {
        // Include the file extension in the URL
        const url = `/api/uploads/${matchingFile}`;
        console.log(`Development mode: Found matching file, serving from: ${url}`);
        return url;
      }
    } catch (error) {
      console.error(`Error looking for file with ID ${id}:`, error);
    }
    
    // Return a local URL that will be handled by our static file middleware
    const url = `/api/uploads/${id}`;
    console.log(`Development mode: No matching file found, serving from local URL: ${url}`);
    return url;
  }
  
  // For production, use Arweave gateway
  return `https://arweave.net/${id}`;
};

module.exports = {
  arweave,
  uploadToArweave,
  getFromArweave,
  getArweaveUrl,
  isDevelopment,
  DEV_UPLOADS_DIR
}; 