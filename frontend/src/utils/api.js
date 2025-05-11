import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Video APIs
export const getVideos = async (page = 1, limit = 10, category = '', search = '') => {
  try {
    const response = await api.get(
      `/videos?page=${page}&limit=${limit}${category ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw error;
  }
};

export const getVideo = async (id) => {
  try {
    const response = await api.get(`/videos/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching video:', error);
    throw error;
  }
};

export const uploadVideo = async (formData) => {
  try {
    const response = await api.post('/videos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
};

export const updateVideo = async (id, data) => {
  try {
    const response = await api.put(`/videos/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating video:', error);
    throw error;
  }
};

export const deleteVideo = async (id, walletAddress) => {
  try {
    const response = await api.delete(`/videos/${id}`, {
      data: { walletAddress }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting video:', error);
    throw error;
  }
};

export const getVideosByUploader = async (walletAddress, page = 1, limit = 10) => {
  try {
    const response = await api.get(`/videos/uploader/${walletAddress}?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching videos by uploader:', error);
    throw error;
  }
};

// User APIs
export const getUser = async (walletAddress) => {
  try {
    const response = await api.get(`/users/${walletAddress}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const updateUser = async (walletAddress, data) => {
  try {
    const response = await api.put(`/users/${walletAddress}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const uploadProfilePicture = async (walletAddress, file) => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await api.post(`/users/${walletAddress}/profile-picture`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

export const getUserStats = async (walletAddress) => {
  try {
    const response = await api.get(`/users/${walletAddress}/stats`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
};

export const getTopCreators = async (limit = 10) => {
  try {
    const response = await api.get(`/users/creators/top?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching top creators:', error);
    throw error;
  }
};

// Payment APIs
export const verifyAccess = async (videoId, walletAddress) => {
  try {
    const response = await api.get(`/payments/verify/${videoId}/${walletAddress}`);
    return response.data;
  } catch (error) {
    console.error('Error verifying access:', error);
    throw error;
  }
};

export const recordPayment = async (paymentData) => {
  try {
    const response = await api.post('/payments/record', paymentData);
    return response.data;
  } catch (error) {
    console.error('Error recording payment:', error);
    throw error;
  }
};

export const getPaymentInfo = async (videoId) => {
  try {
    const response = await api.get(`/payments/info/${videoId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting payment info:', error);
    throw error;
  }
};

export const updateWatchTime = async (accessId, watchTime, completed = false) => {
  try {
    const response = await api.put(`/payments/watch-time/${accessId}`, {
      watchTime,
      completed
    });
    return response.data;
  } catch (error) {
    console.error('Error updating watch time:', error);
    throw error;
  }
}; 