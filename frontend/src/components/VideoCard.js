import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FaEye, FaImage, FaVideo } from 'react-icons/fa';
import { getThumbnailUrl } from '../utils/arweave';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

const VideoCard = ({ video }) => {
  const {
    _id,
    title,
    thumbnailCid,
    uploader,
    price,
    viewCount,
    createdAt,
    cid,
    category
  } = video;
  
  const [imageError, setImageError] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  // Enhanced debug logging
  useEffect(() => {
    console.log(`Video ${_id} thumbnail data:`, {
      title,
      thumbnailCid,
      url: getThumbnailUrl(thumbnailCid),
      development: isDevelopment
    });
  }, [_id, title, thumbnailCid]);

  // Format the creation date
  const formattedDate = formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  
  // Format price in SOL
  const formattedPrice = `${price} SOL`;
  
  // Truncate title if too long
  const truncatedTitle = title.length > 60 ? `${title.substring(0, 60)}...` : title;
  
  // Get thumbnail URL using Arweave utility
  const thumbnailUrl = getThumbnailUrl(thumbnailCid);
  
  const handleImageError = (event) => {
    // Capture detailed error information
    const target = event.target;
    const errorInfo = {
      src: target.src,
      time: new Date().toISOString(),
      complete: target.complete,
      naturalWidth: target.naturalWidth,
      naturalHeight: target.naturalHeight,
    };
    
    console.error(`Error loading thumbnail for ${title}:`, errorInfo);
    setErrorDetails(errorInfo);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log(`Successfully loaded thumbnail for ${title}: ${thumbnailUrl}`);
    setThumbnailLoaded(true);
  };
  
  // Random placeholder colors based on video ID to make them visually distinct
  const getPlaceholderColor = () => {
    // Use the video ID to generate a consistent color for the same video
    const colors = [
      'bg-blue-800', 'bg-purple-800', 'bg-indigo-800', 'bg-pink-800', 
      'bg-red-800', 'bg-orange-800', 'bg-green-800', 'bg-teal-800'
    ];
    
    // Use the first character of the ID as a simple hash
    const index = _id ? _id.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };
  
  // Category icon for placeholder
  const getCategoryIcon = () => {
    switch(category?.toLowerCase()) {
      case 'gaming':
        return '🎮';
      case 'education':
        return '📚';
      case 'entertainment':
        return '🎭';
      case 'music':
        return '🎵';
      case 'sports':
        return '⚽';
      case 'technology':
        return '💻';
      case 'news':
        return '📰';
      default:
        return '🎬';
    }
  };
  
  return (
    <Link to={`/video/${_id}`} className="block">
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
        {/* Thumbnail */}
        <div className={`w-full h-48 relative ${!thumbnailLoaded ? getPlaceholderColor() : 'bg-gray-900'} flex items-center justify-center overflow-hidden`}>
          {!imageError ? (
            <>
              {/* Show a skeleton loader while image is loading */}
              {!thumbnailLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-opacity-70 z-10">
                  <FaVideo className="text-4xl mb-2 animate-pulse" />
                  <div className="text-xl font-medium">{getCategoryIcon()}</div>
                </div>
              )}
              
              <img
                key={thumbnailCid || 'placeholder'}
                src={thumbnailUrl}
                alt={title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${thumbnailLoaded ? 'opacity-100' : 'opacity-0'}`}
                onError={handleImageError}
                onLoad={handleImageLoad}
                loading="lazy"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-white">
              <FaImage className="text-5xl mb-2" />
              <span className="text-sm">{getCategoryIcon()} {category || 'STR3AM'}</span>
              {errorDetails?.src && (
                <div className="text-xs mt-1 px-2 py-1 bg-red-900 rounded">
                  Failed to load: {new URL(errorDetails.src).pathname}
                </div>
              )}
            </div>
          )}
          
          {/* Price tag */}
          <div className="absolute bottom-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded z-20">
            {formattedPrice}
          </div>
        </div>
        
        {/* Video info */}
        <div className="p-4">
          <h3 className="text-white font-medium text-lg mb-1" title={title}>
            {truncatedTitle}
          </h3>
          
          <div className="text-gray-400 text-sm">
            <p className="truncate">{uploader}</p>
            
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center">
                <FaEye className="mr-1" />
                <span>{viewCount} views</span>
              </div>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard; 