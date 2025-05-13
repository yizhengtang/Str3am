import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { FaThumbsUp, FaThumbsDown, FaShare } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { 
  addInteraction, 
  getUserInteraction,
  getInteractionStats 
} from '../utils/api';

const VideoInteractions = ({ videoId, hasAccess }) => {
  const { publicKey } = useWallet();
  const [stats, setStats] = useState({
    likeCount: 0,
    dislikeCount: 0,
    shareCount: 0
  });
  const [userInteractions, setUserInteractions] = useState({
    liked: false,
    disliked: false,
    shared: false
  });
  const [loading, setLoading] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  
  // Social platforms for sharing
  const shareOptions = [
    { id: 'twitter', name: 'Twitter', icon: 'twitter', color: '#1DA1F2' },
    { id: 'facebook', name: 'Facebook', icon: 'facebook', color: '#4267B2' },
    { id: 'telegram', name: 'Telegram', icon: 'telegram', color: '#0088cc' },
    { id: 'whatsapp', name: 'WhatsApp', icon: 'whatsapp', color: '#25D366' },
    { id: 'email', name: 'Email', icon: 'envelope', color: '#DD4B39' }
  ];
  
  // Fetch interaction stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getInteractionStats(videoId);
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching interaction stats:', error);
      }
    };
    
    fetchStats();
    
    // Set up polling to refresh stats every 30 seconds
    const intervalId = setInterval(fetchStats, 30000);
    
    return () => clearInterval(intervalId);
  }, [videoId]);
  
  // Fetch user interactions
  useEffect(() => {
    const fetchUserInteractions = async () => {
      if (!publicKey) return;
      
      try {
        const response = await getUserInteraction(videoId, publicKey.toString());
        setUserInteractions(response.data);
      } catch (error) {
        console.error('Error fetching user interactions:', error);
      }
    };
    
    if (hasAccess) {
      fetchUserInteractions();
    }
  }, [videoId, publicKey, hasAccess]);
  
  const handleInteraction = async (type, sharedTo = null) => {
    if (!publicKey) {
      toast.error('Please connect your wallet to interact with this video');
      return;
    }
    
    if (!hasAccess) {
      toast.error('You need to pay to access this video before interacting with it');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await addInteraction(
        videoId,
        {
          userWallet: publicKey.toString(),
          type,
          sharedTo
        }
      );
      
      // Update stats
      setStats(response.video);
      
      // Handle refund notifications if the video was taken down
      if (response.refunds && response.refunds.refunded > 0) {
        toast.success(`Video taken down due to high dislike ratio. ${response.refunds.refunded} users have been refunded.`);
      }
      
      // Update user interactions
      if (type === 'like') {
        setUserInteractions(prev => ({ 
          ...prev, 
          liked: !prev.liked,
          // If we're liking, turn off disliked
          disliked: prev.liked ? prev.disliked : false
        }));
      } else if (type === 'dislike') {
        setUserInteractions(prev => ({ 
          ...prev, 
          disliked: !prev.disliked,
          // If we're disliking, turn off liked
          liked: prev.disliked ? prev.liked : false
        }));
      } else if (type === 'share') {
        setUserInteractions(prev => ({ ...prev, shared: true }));
        
        // For share, we can also perform the actual share action
        if (sharedTo === 'twitter') {
          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=Check out this video on STR3AM!`, '_blank');
        } else if (sharedTo === 'facebook') {
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
        } else if (sharedTo === 'telegram') {
          window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=Check out this video on STR3AM!`, '_blank');
        } else if (sharedTo === 'whatsapp') {
          window.open(`https://api.whatsapp.com/send?text=Check out this video on STR3AM! ${encodeURIComponent(window.location.href)}`, '_blank');
        } else if (sharedTo === 'email') {
          window.location.href = `mailto:?subject=Check out this video on STR3AM!&body=${encodeURIComponent(window.location.href)}`;
        }
        
        setShowShareOptions(false);
      }
      
      toast.success(`Video ${type}d successfully!`);
    } catch (error) {
      console.error(`Error ${type}ing video:`, error);
      toast.error(`Failed to ${type} video. Please try again.`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex items-center space-x-4 my-4">
      {/* Like Button */}
      <button
        onClick={() => handleInteraction('like')}
        disabled={loading}
        className={`flex items-center space-x-1 p-2 rounded ${
          userInteractions.liked 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
      >
        <FaThumbsUp />
        <span>{stats.likeCount || 0}</span>
      </button>
      
      {/* Dislike Button */}
      <button
        onClick={() => handleInteraction('dislike')}
        disabled={loading}
        className={`flex items-center space-x-1 p-2 rounded ${
          userInteractions.disliked 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
      >
        <FaThumbsDown />
        <span>{stats.dislikeCount || 0}</span>
      </button>
      
      {/* Share Button */}
      <div className="relative">
        <button
          onClick={() => setShowShareOptions(!showShareOptions)}
          disabled={loading}
          className={`flex items-center space-x-1 p-2 rounded ${
            userInteractions.shared 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <FaShare />
          <span>{stats.shareCount || 0}</span>
        </button>
        
        {/* Share options dropdown */}
        {showShareOptions && (
          <div className="absolute z-10 mt-2 bg-gray-800 rounded-lg shadow-lg p-2">
            <div className="space-y-2">
              {shareOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleInteraction('share', option.id)}
                  disabled={loading}
                  className="w-full flex items-center space-x-2 p-2 rounded hover:bg-gray-700 text-white"
                >
                  <span style={{ color: option.color }}>
                    <i className={`fas fa-${option.icon}`}></i>
                  </span>
                  <span>{option.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoInteractions; 