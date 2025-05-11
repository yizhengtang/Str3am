const { create } = require('ipfs-http-client');

// Create an IPFS client
const projectId = process.env.IPFS_PROJECT_ID;
const projectSecret = process.env.IPFS_PROJECT_SECRET;

let ipfs;

if (projectId && projectSecret) {
  const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
  
  // Configure IPFS client with Infura
  ipfs = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
      authorization: auth,
    },
  });
} else {
  console.warn('IPFS credentials not provided. File uploads will fail.');
  
  // Create a dummy client that will error when used
  ipfs = {
    add: () => {
      throw new Error('IPFS client not properly configured');
    },
    cat: () => {
      throw new Error('IPFS client not properly configured');
    }
  };
}

// Upload data to IPFS
const uploadToIPFS = async (data) => {
  try {
    const result = await ipfs.add(data);
    return {
      cid: result.path,
      size: result.size
    };
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
};

// Get data from IPFS
const getFromIPFS = async (cid) => {
  try {
    const chunks = [];
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error getting from IPFS:', error);
    throw error;
  }
};

module.exports = {
  ipfs,
  uploadToIPFS,
  getFromIPFS
}; 