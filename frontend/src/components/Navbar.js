import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { FaSearch, FaUpload, FaUser } from 'react-icons/fa';

const Navbar = () => {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };
  
  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-transparent bg-clip-text">
              STR3AM
            </span>
          </Link>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search videos..."
                className="w-full px-4 py-2 rounded-full bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <FaSearch />
              </button>
            </div>
          </form>
          
          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link to="/upload" className="hidden sm:flex items-center space-x-1 hover:text-indigo-400">
              <FaUpload />
              <span>Upload</span>
            </Link>
            
            {publicKey && (
              <Link to={`/profile/${publicKey.toString()}`} className="hidden sm:flex items-center space-x-1 hover:text-indigo-400">
                <FaUser />
                <span>Profile</span>
              </Link>
            )}
            
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 