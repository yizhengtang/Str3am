import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import { getTopVideo, getVideos, getTopCreators } from '../utils/api';
import { FaSpinner, FaFilter } from 'react-icons/fa';
import { getAvatarUrl } from '../utils/arweave';

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [topVideo, setTopVideo] = useState(null);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTop, setLoadingTop] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState('');
  const [categories] = useState([
    'Education', 'Entertainment', 'Gaming', 'Music', 'News', 'Sports', 'Technology', 'Other'
  ]);
  
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchTerm = searchParams.get('search') || '';
  
  // Fetch videos when page, category, or search changes
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await getVideos(page, 12, category, searchTerm);
        
        if (page === 1) {
          setVideos(response.data);
        } else {
          setVideos(prev => [...prev, ...response.data]);
        }
        
        setHasMore(response.pagination.page < response.pagination.pages);
        setError(null);
      } catch (error) {
        console.error('Error fetching videos:', error);
        setError('Failed to load videos. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [page, category, searchTerm]);
  
  // Fetch top creators
  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const response = await getTopCreators(5);
        setCreators(response.data);
      } catch (error) {
        console.error('Error fetching creators:', error);
      }
    };
    
    fetchCreators();
  }, []);
  
  // Fetch top video
  useEffect(() => {
    const fetchTop = async () => {
      setLoadingTop(true);
      try {
        const res = await getTopVideo();
        setTopVideo(res.data);
      } catch (err) {
        console.error('Error fetching top video:', err);
      } finally {
        setLoadingTop(false);
      }
    };
    fetchTop();
  }, []);
  
  // Load more videos
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };
  
  // Handle category change
  const handleCategoryChange = (newCategory) => {
    if (category === newCategory) {
      setCategory('');
    } else {
      setCategory(newCategory);
    }
    setPage(1);
  };
  
  return (
    <>
      {/* Fixed solid sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-base-200 p-6 z-20">
        <ul className="menu bg-transparent p-0 m-0 text-base-content">
          <li className="menu-title"><span>Categories</span></li>
          {categories.map(cat => (
            <li key={cat}>
              <button
                onClick={() => handleCategoryChange(cat)}
                className={`btn btn-ghost w-full text-left ${category === cat ? 'bg-primary/20' : ''}`}
              >{cat}</button>
            </li>
          ))}
        </ul>
      </aside>
      {/* Main content shifted right on large screens */}
      <div className="container mx-auto px-4 py-8 ml-0 lg:ml-64">
        {/* Search Results Header */}
        {searchTerm && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">
              Search Results for "{searchTerm}"
            </h2>
          </div>
        )}
        
        {/* Videos Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            {category ? `${category} Videos` : 'Latest Videos'}
          </h2>
          
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-100 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          {videos.length === 0 && !loading ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-xl">No videos found</p>
              <p className="mt-2">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {videos.map(video => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>
          )}
          
          {/* Load More Button */}
          {hasMore && (
            <div className="mt-8 text-center">
              <button onClick={handleLoadMore} disabled={loading} className="btn btn-primary">
                {loading ? (
                  <span className="flex items-center">
                    <FaSpinner className="animate-spin mr-2" /> Loading...
                  </span>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
        
        {/* Top Creators */}
        {creators.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white mb-4">Top Creators</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {creators.map(creator => (
                <Link
                  key={creator.walletAddress}
                  to={`/profile/${creator.walletAddress}`}
                  className="bg-gray-800 rounded-lg p-4 text-center block hover:bg-gray-700"
                >
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden bg-gray-700">
                    {creator.profilePicture ? (
                      <img
                        src={getAvatarUrl(creator.profilePicture)}
                        alt={creator.username || 'Creator'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        No Image
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-medium">
                    {creator.username || `User ${creator.walletAddress.substring(0, 4)}...${creator.walletAddress.substring(creator.walletAddress.length - 4)}`}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {creator.videosUploaded} videos
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Home; 