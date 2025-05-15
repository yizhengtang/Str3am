import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FaEye, FaImage, FaVideo } from 'react-icons/fa';
import { getThumbnailUrl } from '../utils/arweave';
import { getUser } from '../utils/api';

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
  // Track uploader display name
  const [uploaderName, setUploaderName] = useState('');

  // Enhanced debug logging
  useEffect(() => {
    console.log(`Video ${_id} thumbnail data:`, {
      title,
      thumbnailCid,
      url: getThumbnailUrl(thumbnailCid),
      development: isDevelopment
    });
  }, [_id, title, thumbnailCid]);

  // Fetch uploader's username
  useEffect(() => {
    const loadUploader = async () => {
      try {
        const res = await getUser(uploader);
        if (res.success && res.data.username) {
          setUploaderName(res.data.username);
        }
      } catch (err) {
        console.error('Error fetching uploader username:', err);
      }
    };
    loadUploader();
  }, [uploader]);

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
      <div className="card bg-neutral shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <figure className="relative">
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-48 object-cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
          {/* Price badge */}
          <div className="badge badge-primary absolute bottom-2 right-2">{formattedPrice}</div>
        </figure>
        <div className="card-body p-4">
          <h2 className="card-title truncate">{truncatedTitle}</h2>
          <p className="text-sm text-base-content/70 truncate">{uploaderName || `${uploader.substring(0,6)}...${uploader.slice(-4)}`}</p>
          <div className="card-actions justify-between items-center mt-4 text-sm text-base-content/70">
            <div className="flex items-center space-x-1">
              <FaEye /> <span>{viewCount}</span>
            </div>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard; 