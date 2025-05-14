import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { FaSearch, FaUpload, FaUser } from 'react-icons/fa';

const Navbar = () => {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  // Load current user's username
  const [userName, setUserName] = useState('');
  // Channel Tokens dropdown state
  const [showTokens, setShowTokens] = useState(false);
  const [tokensList, setTokensList] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const dropdownRef = useRef();
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };
  
  // Fetch channel tokens when dropdown opens
  useEffect(() => {
    if (showTokens && publicKey) {
      (async () => {
        setLoadingTokens(true);
        try {
          const res = await fetch(`${process.env.REACT_APP_API_URL}/creator-token/viewer/${publicKey.toString()}`);
          const json = await res.json();
          if (json.success) setTokensList(json.data);
        } catch (err) {
          console.error('Error fetching channel tokens:', err);
        } finally {
          setLoadingTokens(false);
        }
      })();
    }
  }, [showTokens, publicKey]);
  
  // Fetch current user's profile to get username for navbar
  useEffect(() => {
    const fetchUserName = async () => {
      if (!publicKey) {
        setUserName('');
        return;
      }
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/users/${publicKey.toString()}`);
        const json = await res.json();
        if (json.success && json.data.username) {
          setUserName(json.data.username);
        } else {
          setUserName('');
        }
      } catch (err) {
        console.error('Error fetching username:', err);
        setUserName('');
      }
    };
    fetchUserName();
  }, [publicKey]);
  
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowTokens(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
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
                <span>{userName || 'Profile'}</span>
              </Link>
            )}
            
            <div className="relative" ref={dropdownRef}>
              <WalletMultiButton />
              {publicKey && (
                <button
                  onClick={() => setShowTokens(!showTokens)}
                  className="ml-2 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  Channel Tokens
                </button>
              )}
              {showTokens && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50">
                  <div className="p-2 text-white font-semibold">Your Channel Tokens</div>
                  {loadingTokens ? (
                    <div className="p-2 text-gray-400">Loading...</div>
                  ) : tokensList.length === 0 ? (
                    <div className="p-2 text-gray-400">No tokens held</div>
                  ) : (
                    <ul className="max-h-64 overflow-y-auto">
                      {tokensList.map((t, idx) => (
                        <li key={idx} className="px-4 py-2 hover:bg-gray-700 flex items-center space-x-2">
                          {/* Token name */}
                          <span className="flex-shrink-0 text-white">{t.username}</span>
                          {/* Progress bar toward next token */}
                          <div className="flex-1 bg-gray-600 h-2 rounded overflow-hidden">
                            <div
                              className="bg-green-500 h-full"
                              style={{ width: `${Math.floor(t.progress * 100)}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 