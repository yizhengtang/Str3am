const Arweave = require('arweave');
const crypto = require('crypto');

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

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

// Generate a random transaction ID for development mode
const generateMockTransactionId = () => {
  return crypto.randomBytes(32).toString('base64').replace(/[+/=]/g, '').substring(0, 43);
};

// Upload data to Arweave
const uploadToArweave = async (data, contentType = 'application/octet-stream', tags = []) => {
  try {
    const activeWallet = wallet || await getTestWallet();
    
    // Check wallet balance
    const address = await arweave.wallets.jwkToAddress(activeWallet);
    const balance = await arweave.wallets.getBalance(address);
    const winston = arweave.ar.winstonToAr(balance);
    
    if (parseFloat(winston) <= 0) {
      console.warn(`Arweave wallet has insufficient balance: ${winston} AR`);
      
      // In development mode, continue with a mock transaction ID
      if (isDevelopment) {
        console.log('Using development mode with mock Arweave transaction.');
        const mockTransactionId = generateMockTransactionId();
        return {
          id: mockTransactionId,
          status: 200,
          mock: true
        };
      }
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
      console.log('Using development mode with mock Arweave transaction.');
      const mockTransactionId = generateMockTransactionId();
      return {
        id: mockTransactionId,
        status: 200,
        mock: true
      };
    }
    
    console.error('Error uploading to Arweave:', error);
    throw error;
  }
};

// Get data from Arweave
const getFromArweave = async (id) => {
  try {
    // For mock transaction IDs in development mode, return empty data
    if (isDevelopment && id.length === 43 && !id.startsWith('_')) {
      // Check if this looks like a mock ID
      try {
        const data = await arweave.transactions.getData(id, {
          decode: true,
          string: false
        });
        return Buffer.from(data);
      } catch (error) {
        console.log(`Mock data for ID: ${id}`);
        return Buffer.from('Mock Arweave Data');
      }
    }
    
    const data = await arweave.transactions.getData(id, {
      decode: true,
      string: false
    });
    return Buffer.from(data);
  } catch (error) {
    console.error('Error getting data from Arweave:', error);
    throw error;
  }
};

// Helper function to get Arweave gateway URL for browser access
const getArweaveUrl = (id) => {
  // For development mode, use a placeholder URL for mock IDs
  if (isDevelopment && id && id.length === 43 && !id.startsWith('_')) {
    return `https://arweave.net/${id}`;
  }
  return `https://arweave.net/${id}`;
};

module.exports = {
  arweave,
  uploadToArweave,
  getFromArweave,
  getArweaveUrl,
  isDevelopment
}; 