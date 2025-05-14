/**
 * Utility functions for Arweave integration
 */

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Check if an ID is likely a mock/test Arweave transaction ID
 * @param {string} id - Arweave transaction ID to check
 * @returns {boolean} - True if the ID appears to be a mock ID
 */
const isMockArweaveId = (id) => {
  // If we're not in development, then it's not a mock ID
  if (!isDevelopment) return false;
  
  // Check if it has the right length but doesn't exist on Arweave
  // This is a heuristic - in reality, all randomly generated IDs in development
  // should be treated as mock IDs
  return id && typeof id === 'string' && id.length >= 40 && id.length <= 45;
};

/**
 * Get Arweave content URL
 * @param {string} id - Arweave transaction ID
 * @returns {string} - Complete URL to access the content
 */
export const getArweaveUrl = (id) => {
  // Return null if id is not provided, empty, or not a string
  if (!id || typeof id !== 'string' || id.trim() === '') {
    console.warn('Invalid Arweave ID provided:', id);
    return null;
  }
  
  // Clean the ID - remove any unexpected characters
  const cleanId = id.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  
  // If cleaning made the ID invalid, return null
  if (cleanId.length < 30) {
    console.warn('Arweave ID is too short after cleaning:', cleanId);
    return null;
  }

  // Check if this is likely a mock ID in development mode
  if (isDevelopment && isMockArweaveId(cleanId)) {
    // Use the local API server to serve the file 
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const url = `${baseUrl}/api/uploads/${cleanId}`;
    
    // Debug log the URL being generated
    console.log(`Development mode: Generated local URL for thumbnail: ${url}`);
    
    // Verify if the file exists by sending a HEAD request
    try {
      // We can't await here since this isn't an async function, but we can log the fetch attempt
      fetch(url, { method: 'HEAD' })
        .then(response => {
          if (!response.ok) {
            console.error(`Thumbnail fetch check failed for ${url}: ${response.status} ${response.statusText}`);
          } else {
            console.log(`Thumbnail exists at ${url}`);
          }
        })
        .catch(err => {
          console.error(`Error checking thumbnail at ${url}:`, err);
        });
    } catch (error) {
      console.error(`Exception during thumbnail check for ${url}:`, error);
    }
    
    return url;
  }
  
  // Return the Arweave URL for production
  return `https://arweave.net/${cleanId}`;
};

/**
 * Get Arweave thumbnail URL
 * @param {string} id - Arweave transaction ID for thumbnail
 * @returns {string} - URL for thumbnail or placeholder if not available
 */
export const getAvatarUrl = (id) => {
  const url = getArweaveUrl(id);
  return url || 'https://via.placeholder.com/150?text=User';
};

/**
 * Get Arweave thumbnail URL
 * @param {string} id - Arweave transaction ID for thumbnail
 * @param {string} category - Optional category for better mock thumbnails
 * @returns {string} - URL for thumbnail or placeholder if not available
 */
export const getThumbnailUrl = (id) => {
  if (!id) {
    console.log('getThumbnailUrl: No ID provided, returning placeholder');
    return 'https://via.placeholder.com/320x180?text=STR3AM';
  }

  // Use the shared getArweaveUrl function to get the base URL
  const url = getArweaveUrl(id);
  
  // Debug logging to see what URLs are being generated
  console.log(`getThumbnailUrl: id=${id || 'null'}, returning=${url || 'placeholder'}`);
  
  // If no valid URL, return placeholder
  return url || 'https://via.placeholder.com/320x180?text=STR3AM';
}; 