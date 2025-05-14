import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import { FaEye, FaUser, FaCalendarAlt, FaCoins, FaExclamationTriangle } from 'react-icons/fa';

import VideoPlayer from '../components/VideoPlayer';
import PayToWatchModal from '../components/PayToWatchModal';
import VideoInteractions from '../components/VideoInteractions';
import Comments from '../components/Comments';
import { getVideo, verifyAccess, deleteVideo } from '../utils/api';
import { getArweaveUrl } from '../utils/arweave';

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessData, setAccessData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [takingDown, setTakingDown] = useState(false);
  
  // Fetch video details
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const response = await getVideo(id);
        setVideo(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching video:', error);
        setError('Failed to load video details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideo();
  }, [id]);
  
  // Check if user has access when wallet or video changes
  useEffect(() => {
    const checkAccess = async () => {
      if (!publicKey || !video) return;
      
      try {
        const response = await verifyAccess(id, publicKey.toString());
        setHasAccess(response.hasAccess);
        if (response.hasAccess) {
          setAccessData(response.accessData);
        }
      } catch (error) {
        console.error('Error verifying access:', error);
        setHasAccess(false);
      }
    };
    
    checkAccess();
  }, [publicKey, video, id]);
  
  // Handle payment success, receiving full access record
  const handlePaymentSuccess = (accessData) => {
    setHasAccess(true);
    setAccessData(accessData);
    setShowPaymentModal(false);
  };
  
  // Handle video takedown by creator
  const handleTakedown = async () => {
    if (!publicKey || publicKey.toString() !== video.uploader) {
      toast.error('Only the video creator can take down this video');
      return;
    }
    
    if (!window.confirm('Are you sure you want to take down this video? All users who paid will be refunded. This action cannot be undone.')) {
      return;
    }
    
    setTakingDown(true);
    
    try {
      const response = await deleteVideo(id, publicKey.toString());
      
      // Show success message with refund info if available
      if (response.refunds) {
        toast.success(`Video taken down successfully. ${response.refunds.refunded} users have been refunded.`);
      } else {
        toast.success('Video taken down successfully.');
      }
      
      // Redirect to profile page after a short delay
      setTimeout(() => {
        navigate(`/profile/${publicKey.toString()}`);
      }, 2000);
    } catch (error) {
      console.error('Error taking down video:', error);
      toast.error('Failed to take down video. Please try again.');
      setTakingDown(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };
  
  // Get video URL from Arweave
  const getVideoUrl = (cid) => {
    return getArweaveUrl(cid);
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (error || !video) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-900/30 border border-red-800 text-red-100 p-4 rounded-lg">
          {error || 'Video not found'}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video Player Column */}
        <div className="lg:col-span-2">
          {/* Video Player or Preview */}
          {hasAccess ? (
            <VideoPlayer 
              videoUrl={getVideoUrl(video.cid)} 
              accessId={accessData?._id}
              creator={video.uploader}
              creatorMint={video.creatorMint} // NEW: from backend or blockchain
              creatorTokenPDA={video.creatorTokenPDA} // NEW: from backend or blockchain
              onComplete={() => toast.success('Video completed!')}
            />
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-gray-800">
              <div className="aspect-w-16 aspect-h-9 bg-gray-900 flex items-center justify-center">
                <div className="text-center p-6">
                  <FaLock className="text-indigo-500 text-5xl mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    Pay to Watch
                  </h3>
                  <p className="text-gray-400 mb-4">
                    This content requires a one-time payment of {video.price} SOL to watch.
                  </p>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Unlock Video
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Video Info */}
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-white mb-2">{video.title}</h1>
            
            <div className="flex flex-wrap items-center text-gray-400 text-sm mb-4">
              <div className="flex items-center mr-4">
                <FaEye className="mr-1" />
                <span>{video.viewCount} views</span>
              </div>
              
              <div className="flex items-center mr-4">
                <FaCalendarAlt className="mr-1" />
                <span>{formatDate(video.createdAt)}</span>
              </div>
              
              <div className="flex items-center">
                <FaCoins className="text-yellow-500 mr-1" />
                <span>{video.price} SOL</span>
              </div>
            </div>
            
            <div className="border-t border-b border-gray-700 py-4 my-4">
              <Link 
                to={`/profile/${video.uploader}`}
                className="flex items-center mb-4"
              >
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                  <FaUser className="text-gray-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">
                    {video.uploader.substring(0, 6)}...{video.uploader.substring(video.uploader.length - 4)}
                  </h3>
                  <p className="text-gray-400 text-sm">Creator</p>
                </div>
              </Link>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">Description</h3>
                <p className="text-gray-400 whitespace-pre-wrap">{video.description}</p>
              </div>
            </div>
            
            {/* Video Interactions (Like, Dislike, Share) */}
            <VideoInteractions videoId={video._id} hasAccess={hasAccess} />
            
            <div className="border-t border-b border-gray-700 py-4 my-4">
              {/* Video Owner Controls - REMOVED */}
              {publicKey && publicKey.toString() === video.uploader && (
                <div className="mt-8 p-4 bg-gray-800 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3">Creator Controls</h3>
                  
                  <p className="text-gray-400 mb-4">
                    Videos with a dislike ratio exceeding 80% and at least 100 interactions will be automatically taken down. 
                    All users who paid for the video will be refunded.
                  </p>
                  
                  <button 
                    onClick={handleTakedown}
                    disabled={takingDown}
                    className="flex items-center bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <FaExclamationTriangle className="mr-2" />
                    {takingDown ? 'Taking Down...' : 'Take Down Video'}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Comments Section */}
          <Comments videoId={video._id} hasAccess={hasAccess} />
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold text-white mb-4">Related Videos</h2>
          <p className="text-gray-400">
            Related videos will appear here.
          </p>
        </div>
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && (
        <PayToWatchModal
          video={video}
          onPaymentSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
};

const FaLock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

export default VideoDetail; 