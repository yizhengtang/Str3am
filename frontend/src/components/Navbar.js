import React, { useState, useEffect } from 'react';
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
  const [tokensList, setTokensList] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };
  
  // Fetch channel tokens when wallet connects
  useEffect(() => {
    if (!publicKey) return;
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
  }, [publicKey]);
  
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
  
  return (
    <div className="navbar bg-base-100 text-base-content shadow">
      <div className="navbar-start">
        <Link to="/" className="btn btn-ghost normal-case text-xl">
          STR3AM
        </Link>
      </div>
      <div className="navbar-center hidden md:flex">
        <form onSubmit={handleSearch} className="form-control">
          <div className="input-group">
            <input
              type="text"
              placeholder="Search videos..."
              className="input input-bordered"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="btn btn-square">
              <FaSearch />
            </button>
          </div>
        </form>
      </div>
      <div className="navbar-end space-x-2">
        <Link to="/upload" className="btn btn-outline btn-primary">
          <FaUpload className="mr-1" /> Upload
        </Link>
        {publicKey && (
          <Link to={`/profile/${publicKey.toString()}`} className="btn btn-outline">
            <FaUser className="mr-1" /> {userName || 'Profile'}
          </Link>
        )}
        <WalletMultiButton className="btn btn-primary" />
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-secondary ml-2">Channel Tokens</label>
          <div tabIndex={0} className="dropdown-content mt-1 p-2 shadow bg-base-200 rounded-lg w-64">
            <div className="font-semibold mb-2">Your Channel Tokens</div>
            {loadingTokens ? (
              <div className="text-sm text-base-content/60">Loading...</div>
            ) : tokensList.length === 0 ? (
              <div className="text-sm text-base-content/60">No tokens held</div>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-auto">
                {tokensList.map((t, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <div>{t.username}</div>
                    <progress className="progress progress-primary flex-1" value={Math.floor(t.progress * 100)} max="100"></progress>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar; 