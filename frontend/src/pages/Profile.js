import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-toastify';
import { FaEdit, FaUpload, FaSpinner } from 'react-icons/fa';
import VideoCard from '../components/VideoCard';
import { getUser, getUserStats, getVideosByUploader, updateUser, uploadProfilePicture, getPurchasedVideos } from '../utils/api';
import { getAvatarUrl } from '../utils/arweave';

const Profile = () => {
  const { walletAddress } = useParams();
  const { publicKey } = useWallet();
  const isOwnProfile = publicKey && publicKey.toString() === walletAddress;
  
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [purchasedVideos, setPurchasedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    twitter: '',
    instagram: '',
    website: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        let userData;
        // Get or create user profile: treat 404 as new user
        try {
          const userResponse = await getUser(walletAddress);
          userData = userResponse.data;
        } catch (err) {
          if (err.response && err.response.status === 404) {
            userData = { walletAddress, username: '', bio: '', socialLinks: {} };
          } else {
            throw err;
          }
        }
        setUser(userData);
        
        // Initialize form values
        setUsername(userData.username || '');
        setBio(userData.bio || '');
        setSocialLinks(userData.socialLinks || { twitter: '', instagram: '', website: '' });
        
        // Get user stats (treat 404 as new user with zero stats)
        try {
          const statsResponse = await getUserStats(walletAddress);
          setStats(statsResponse.data);
        } catch (err) {
          if (err.response && err.response.status === 404) {
            setStats({ videosUploaded: 0, videosWatched: 0, tokensEarned: 0, tokensSpent: 0 });
          } else {
            throw err;
          }
        }
        
        // Get user videos
        const videosResponse = await getVideosByUploader(walletAddress);
        setVideos(videosResponse.data);
        
        // Fetch purchased videos for own profile
        if (isOwnProfile) {
          try {
            const purchasedRes = await getPurchasedVideos(walletAddress);
            setPurchasedVideos(purchasedRes.data);
          } catch (err) {
            console.error('Error fetching purchased videos:', err);
          }
        }
        
        setError(null);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load user profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [walletAddress]);
  
  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!isOwnProfile) return;
    
    try {
      const response = await updateUser(walletAddress, {
        username,
        bio,
        socialLinks
      });
      
      setUser(response.data);
      setEditMode(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  };
  
  // Handle profile picture upload
  const handleProfilePictureChange = async (e) => {
    if (!isOwnProfile || !e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file is too large. Maximum size is 5MB');
      return;
    }
    
    setUploadingImage(true);
    
    try {
      const response = await uploadProfilePicture(walletAddress, file);
      
      setUser(prev => ({
        ...prev,
        profilePicture: response.data.profilePicture
      }));
      
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };
  
  // Format wallet address
  const formatWalletAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-900/30 border border-red-800 text-red-100 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          {/* Profile Picture */}
          <div className="relative mb-4 md:mb-0 md:mr-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-700">
              {user?.profilePicture ? (
                <img
                  src={getAvatarUrl(user.profilePicture)}
                  alt={user.username || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            
            {isOwnProfile && (
              <div className="absolute bottom-0 right-0">
                <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-1 shadow-lg">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureChange}
                    disabled={uploadingImage}
                  />
                  {uploadingImage ? (
                    <FaSpinner className="animate-spin w-4 h-4" />
                  ) : (
                    <FaEdit className="w-4 h-4" />
                  )}
                </label>
              </div>
            )}
          </div>
          
          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left">
            {editMode ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-white font-medium mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-indigo-500"
                    placeholder="Username"
                  />
                </div>
                
                <div>
                  <label htmlFor="bio" className="block text-white font-medium mb-1">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-indigo-500"
                    placeholder="Tell us about yourself"
                    rows={3}
                    maxLength={500}
                  />
                </div>
                
                <div>
                  <label className="block text-white font-medium mb-1">
                    Social Links
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={socialLinks.twitter || ''}
                      onChange={(e) => setSocialLinks({...socialLinks, twitter: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-indigo-500"
                      placeholder="Twitter URL"
                    />
                    <input
                      type="text"
                      value={socialLinks.instagram || ''}
                      onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-indigo-500"
                      placeholder="Instagram URL"
                    />
                    <input
                      type="text"
                      value={socialLinks.website || ''}
                      onChange={(e) => setSocialLinks({...socialLinks, website: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-indigo-500"
                      placeholder="Website URL"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex justify-center md:justify-between items-center mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {user?.username || 'Anonymous Creator'}
                    </h1>
                    <p className="text-gray-400">
                      {formatWalletAddress(walletAddress)}
                    </p>
                  </div>
                  
                  {isOwnProfile && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center"
                    >
                      <FaEdit className="mr-2" />
                      Edit Profile
                    </button>
                  )}
                </div>
                
                {user?.bio && (
                  <p className="text-gray-300 mb-4">
                    {user.bio}
                  </p>
                )}
                
                {/* Social Links */}
                {(user?.socialLinks?.twitter || user?.socialLinks?.instagram || user?.socialLinks?.website) && (
                  <div className="flex space-x-4 mb-4">
                    {user?.socialLinks?.twitter && (
                      <a
                        href={user.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Twitter
                      </a>
                    )}
                    {user?.socialLinks?.instagram && (
                      <a
                        href={user.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-400 hover:text-pink-300"
                      >
                        Instagram
                      </a>
                    )}
                    {user?.socialLinks?.website && (
                      <a
                        href={user.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300"
                      >
                        Website
                      </a>
                    )}
                  </div>
                )}
                
                {/* Stats */}
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-gray-700 p-3 rounded-lg text-center">
                      <p className="text-gray-400 text-sm">Videos Uploaded</p>
                      <p className="text-white font-bold text-xl">{stats.videosUploaded}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded-lg text-center">
                      <p className="text-gray-400 text-sm">Videos Watched</p>
                      <p className="text-white font-bold text-xl">{stats.videosWatched}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded-lg text-center">
                      <p className="text-gray-400 text-sm">Tokens Earned</p>
                      <p className="text-white font-bold text-xl">{stats.tokensEarned} SOL</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded-lg text-center">
                      <p className="text-gray-400 text-sm">Tokens Spent</p>
                      <p className="text-white font-bold text-xl">{stats.tokensSpent} SOL</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* User Videos */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {isOwnProfile ? 'Your Videos' : 'Videos'}
          </h2>
          
          {isOwnProfile && (
            <Link
              to="/upload"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center"
            >
              <FaUpload className="mr-2" />
              Upload New Video
            </Link>
          )}
        </div>
        
        {videos.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400 mb-4">
              {isOwnProfile
                ? "You haven't uploaded any videos yet."
                : "This user hasn't uploaded any videos yet."}
            </p>
            
            {isOwnProfile && (
              <Link
                to="/upload"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg inline-flex items-center"
              >
                <FaUpload className="mr-2" />
                Upload Your First Video
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map(video => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
      
      {/* My Video Collection */}
      {isOwnProfile && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">My Video Collection</h2>
          {purchasedVideos.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">You haven't purchased any videos yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {purchasedVideos.map(video => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile; 