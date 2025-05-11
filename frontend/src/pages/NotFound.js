import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaExclamationTriangle } from 'react-icons/fa';

const NotFound = () => {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center">
      <FaExclamationTriangle className="text-yellow-500 text-6xl mb-6" />
      
      <h1 className="text-4xl font-bold text-white mb-4">404 - Page Not Found</h1>
      
      <p className="text-gray-400 text-lg mb-8 text-center max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      
      <Link
        to="/"
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center transition-colors"
      >
        <FaHome className="mr-2" />
        Back to Home
      </Link>
    </div>
  );
};

export default NotFound; 