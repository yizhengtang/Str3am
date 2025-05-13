/**
 * Utility functions for Arweave integration
 */

/**
 * Get Arweave content URL
 * @param {string} id - Arweave transaction ID
 * @returns {string} - Complete URL to access the content
 */
export const getArweaveUrl = (id) => {
  if (!id) return null;
  return `https://arweave.net/${id}`;
};

/**
 * Get Arweave thumbnail URL
 * @param {string} id - Arweave transaction ID for thumbnail
 * @returns {string} - URL for thumbnail or placeholder if not available
 */
export const getAvatarUrl = (id) => {
  return id 
    ? getArweaveUrl(id)
    : 'https://via.placeholder.com/150?text=User';
};

/**
 * Get Arweave thumbnail URL
 * @param {string} id - Arweave transaction ID for thumbnail
 * @returns {string} - URL for thumbnail or placeholder if not available
 */
export const getThumbnailUrl = (id) => {
  return id 
    ? getArweaveUrl(id)
    : 'https://via.placeholder.com/320x180?text=STR3AM';
}; 