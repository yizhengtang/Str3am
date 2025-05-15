import React from 'react';
import { Link } from 'react-router-dom';
import { FaTwitter, FaGithub, FaDiscord } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="pl-0 lg:pl-64">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-transparent bg-clip-text">
                STR3AM
              </Link>
              <p className="text-gray-400 text-sm mt-2">
                Pay-per-view blockchain video streaming platform
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8">
              <div>
                <h3 className="font-bold mb-2">Platform</h3>
                <ul className="space-y-2 text-gray-400">
                  <li>
                    <Link to="/" className="hover:text-white">Home</Link>
                  </li>
                  <li>
                    <Link to="/upload" className="hover:text-white">Upload</Link>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white">Categories</a>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">Resources</h3>
                <ul className="space-y-2 text-gray-400">
                  <li>
                    <a href="#" className="hover:text-white">Documentation</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white">API</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white">Solana</a>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">Connect</h3>
                <div className="flex space-x-4">
                  <a href="#" className="text-gray-400 hover:text-white">
                    <FaTwitter size={20} />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white">
                    <FaGithub size={20} />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white">
                    <FaDiscord size={20} />
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} STR3AM. All rights reserved.</p>
            <p className="mt-1">Built for Solana Breakout Hackathon</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 