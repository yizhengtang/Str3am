import React, { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-toastify';
import { updateWatchTime, recordVideoView, rewardChannel } from '../utils/api';

// Threshold for earning tokens (in seconds); default 30s per token
const REWARD_THRESHOLD_SECONDS = parseInt(process.env.REACT_APP_REWARD_THRESHOLD_SECONDS) || 30;

const VideoPlayer = ({ videoUrl, accessId, videoId, onComplete, creator, creatorMint, creatorTokenPDA }) => {

  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Track leftover seconds carried from previous videos for this channel
  const [channelProgressSec, setChannelProgressSec] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const walletAdapter = useWallet();
  const { publicKey } = walletAdapter;

  // Fetch existing channel progress (cumulative watchTime % threshold) for this viewer and channel
  useEffect(() => {
    if (!publicKey) return;
    const fetchChannelProgress = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/creator-token/viewer/${publicKey.toString()}`);
        const json = await res.json();
        if (json.success) {
          const entry = json.data.find(e => e.creator === creator);
          const prevProgress = entry?.progress || 0;
          setChannelProgressSec(prevProgress * REWARD_THRESHOLD_SECONDS);
        }
      } catch (err) {
        console.error('Error fetching channel tokens:', err);
      }
    };
    fetchChannelProgress();
  }, [publicKey, creator]);

  // Update watch time periodically
  useEffect(() => {
    if (!accessId || !publicKey || !isPlaying) return;
    
    const interval = setInterval(async () => {
      try {
        await updateWatchTime(accessId, Math.floor(currentTime));
      } catch (error) {
        console.error('Error updating watch time:', error);
      }
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [accessId, publicKey, currentTime, isPlaying]);
  
  // Format time in MM:SS
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Handle metadata loaded
  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
  };
  
  // Handle time update
  const handleTimeUpdate = async () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
      
      // Record view if video has started playing and view hasn't been recorded yet
      if (!viewRecorded && video.currentTime > 0 && isPlaying) {
        try {
          await recordVideoView(videoId);
          setViewRecorded(true);
        } catch (error) {
          console.error('Error recording video view:', error);
        }
      }
  
      // ✅ Reward when cumulative watchTime for this channel reaches threshold
      if (!rewarded && publicKey && channelProgressSec + video.currentTime >= REWARD_THRESHOLD_SECONDS) {
        try {
          await rewardChannel(
            publicKey.toString(),         // Viewer wallet
            videoId                       // Video ID for reward
          );
          setRewarded(true);
          // Update leftover channel progress for next videos
          setChannelProgressSec((channelProgressSec + video.currentTime) - REWARD_THRESHOLD_SECONDS);
          toast.success('🎉 Token rewarded for watching!');
        } catch (err) {
          console.error('Watch2Earn failed:', err);
          toast.error('Token reward failed.');
        }
      }
  
      // 🔁 Call original logic for video completion, only once
      if (!hasCompleted && video.currentTime / video.duration > 0.95 && accessId && publicKey) {
        setHasCompleted(true);
        handleVideoCompleted();
      }
    }
  };
  
  
  // Handle video completed
  const handleVideoCompleted = async () => {
    if (!accessId || !publicKey) return;
    
    try {
      await updateWatchTime(accessId, Math.floor(currentTime), true);
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error marking video as completed:', error);
    }
  };
  
  // Handle video end
  const handleVideoEnd = async () => {
    setIsPlaying(false);
    // Fallback: reward if not yet rewarded and cumulative watch time reaches threshold
    if (!rewarded && publicKey && channelProgressSec + duration >= REWARD_THRESHOLD_SECONDS) {
      try {
        await rewardChannel(
          publicKey.toString(),
          videoId
        );
        setRewarded(true);
        // Update leftover channel progress for next videos
        setChannelProgressSec((channelProgressSec + duration) - REWARD_THRESHOLD_SECONDS);
        toast.success('🎉 Token rewarded for watching!');
      } catch (err) {
        console.error('Watch2Earn failed on end:', err);
        toast.error('Token reward failed.');
      }
    }
    // Ensure completion logic runs
    if (!hasCompleted) {
      setHasCompleted(true);
      handleVideoCompleted();
    }
  };
  
  // Handle play/pause
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };
  
  // Handle seek
  const handleSeek = (e) => {
    const video = videoRef.current;
    const seekTime = (e.nativeEvent.offsetX / e.target.clientWidth) * video.duration;
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };
  
  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };
  
  // Handle mute toggle
  const handleMuteToggle = () => {
    const video = videoRef.current;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };
  
  // Handle fullscreen toggle
  const handleFullscreenToggle = () => {
    const videoContainer = document.querySelector('.video-container');
    
    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch(err => {
        toast.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  return (
    <div className="video-container bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full"
        onClick={handlePlayPause}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnd}
      />
      
      {/* Custom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progress Bar */}
        <div 
          className="h-1 w-full bg-gray-600 rounded cursor-pointer mb-2"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-indigo-500 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center">
          {/* Left Controls */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={handlePlayPause}
              className="text-white hover:text-indigo-400"
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleMuteToggle}
                className="text-white hover:text-indigo-400"
              >
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 accent-indigo-500"
              />
            </div>
            
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          {/* Right Controls */}
          <div>
            <button 
              onClick={handleFullscreenToggle}
              className="text-white hover:text-indigo-400"
            >
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer; 