import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FaEye } from 'react-icons/fa';

const VideoCard = ({ video }) => {
  const {
    _id,
    title,
    thumbnailCid,
    uploader,
    price,
    viewCount,
    createdAt,
    cid
  } = video;

  // Format the creation date
  const formattedDate = formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  
  // Format price in SOL
  const formattedPrice = `${price} SOL`;
  
  // Truncate title if too long
  const truncatedTitle = title.length > 60 ? `${title.substring(0, 60)}...` : title;
  
  // IPFS gateway URL for thumbnail
  const thumbnailUrl = thumbnailCid
    ? `https://ipfs.io/ipfs/${thumbnailCid}`
    : `https://via.placeholder.com/320x180?text=STR3AM`;
  
  // Placeholder for video without thumbnail
  const placeholderStyle = {
    backgroundImage: `url(${thumbnailUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };
  
  return (
    <Link to={`/video/${_id}`} className="block">
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
        {/* Thumbnail */}
        <div 
          className="w-full h-48 relative"
          style={placeholderStyle}
        >
          {/* Price tag */}
          <div className="absolute bottom-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">
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