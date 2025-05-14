import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-toastify';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaSpinner } from 'react-icons/fa';
import { uploadVideo } from '../utils/api';

const Upload = () => {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const categories = [
    'Education', 'Entertainment', 'Gaming', 'Music', 'News', 'Sports', 'Technology', 'Other'
  ];
  
  // Video dropzone configuration
  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps } = useDropzone({
    accept: {
      'video/*': ['.mp4', '.webm', '.ogg', '.mov']
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setVideoFile(acceptedFiles[0]);
      }
    },
    onDropRejected: (rejections) => {
      if (rejections.length > 0) {
        const { code, message } = rejections[0].errors[0];
        if (code === 'file-too-large') {
          toast.error('Video file is too large. Maximum size is 100MB');
        } else {
          toast.error(message);
        }
      }
    }
  });
  
  // Thumbnail dropzone configuration
  const { getRootProps: getThumbnailRootProps, getInputProps: getThumbnailInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setThumbnailFile(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = () => {
          setThumbnailPreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    },
    onDropRejected: (rejections) => {
      if (rejections.length > 0) {
        const { code, message } = rejections[0].errors[0];
        if (code === 'file-too-large') {
          toast.error('Thumbnail file is too large. Maximum size is 5MB');
        } else {
          toast.error(message);
        }
      }
    }
  });
  
  // Form validation
  const validateForm = () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return false;
    }
    
    if (!description.trim()) {
      toast.error('Please enter a description');
      return false;
    }
    
    if (!category) {
      toast.error('Please select a category');
      return false;
    }
    
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return false;
    }
    
    if (!videoFile) {
      toast.error('Please upload a video file');
      return false;
    }
    
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('price', parseFloat(price));
      formData.append('uploader', publicKey.toString());
      formData.append('video', videoFile);
      
      if (thumbnailFile) {
        console.log('Appending thumbnail to form data:', {
          name: thumbnailFile.name,
          type: thumbnailFile.type,
          size: thumbnailFile.size
        });
        formData.append('thumbnail', thumbnailFile);
        
        // Debug log to verify FormData contents
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
          console.log(`${key}: ${value instanceof File ? value.name : value}`);
        }
      } else {
        console.log('No thumbnail file to upload');
      }
      
      // Simulate progress (in a real app, you'd use upload progress events)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 500);
      
      // Upload video
      const response = await uploadVideo(formData);
      console.log('Upload response:', response);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast.success('Video uploaded successfully!');
      navigate(`/video/${response.data._id}`);
    } catch (error) {
      console.error('Error uploading video:', error, error.stack);
      toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  if (!publicKey) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet to Upload</h2>
          <p className="text-gray-400 mb-6">
            You need to connect your Solana wallet to upload videos to STR3AM.
          </p>
          <div className="flex justify-center">
            {/* Wallet adapter button will be shown in the navbar */}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Upload Video</h1>
      
      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Video Upload */}
          <div>
            <div className="mb-6">
              <label className="block text-white font-medium mb-2">
                Video File*
              </label>
              <div
                {...getVideoRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  videoFile ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-indigo-500'
                }`}
              >
                <input {...getVideoInputProps()} />
                {videoFile ? (
                  <div>
                    <FaCloudUploadAlt className="text-green-500 text-4xl mx-auto mb-2" />
                    <p className="text-white font-medium">{videoFile.name}</p>
                    <p className="text-gray-400 text-sm">
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <FaCloudUploadAlt className="text-gray-400 text-4xl mx-auto mb-2" />
                    <p className="text-white">Drag & drop your video here</p>
                    <p className="text-gray-400 text-sm">
                      MP4, WebM, OGG or MOV (max. 100MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-white font-medium mb-2">
                Thumbnail Image (Optional)
              </label>
              <div
                {...getThumbnailRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  thumbnailFile ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-indigo-500'
                }`}
              >
                <input {...getThumbnailInputProps()} />
                {thumbnailPreview ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-40 h-auto mb-2 rounded"
                    />
                    <p className="text-white font-medium">{thumbnailFile.name}</p>
                  </div>
                ) : (
                  <div>
                    <FaCloudUploadAlt className="text-gray-400 text-4xl mx-auto mb-2" />
                    <p className="text-white">Drag & drop thumbnail image</p>
                    <p className="text-gray-400 text-sm">
                      JPEG, PNG or GIF (max. 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Video Details */}
          <div>
            <div className="mb-6">
              <label htmlFor="title" className="block text-white font-medium mb-2">
                Title*
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-indigo-500"
                placeholder="Enter video title"
                maxLength={100}
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="description" className="block text-white font-medium mb-2">
                Description*
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-indigo-500"
                placeholder="Describe your video"
                rows={5}
                maxLength={500}
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="category" className="block text-white font-medium mb-2">
                Category*
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-indigo-500"
                required
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-6">
              <label htmlFor="price" className="block text-white font-medium mb-2">
                Price (SOL)*
              </label>
              <input
                type="number"
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-indigo-500"
                placeholder="0.01"
                min="0.00001"
                step="0.00001"
                required
              />
              <p className="text-gray-400 text-sm mt-1">
                Set the amount viewers will pay to watch this video
              </p>
            </div>
          </div>
        </div>
        
        {/* Upload Progress */}
        {isUploading && (
          <div className="mb-6">
            <div className="flex justify-between mb-1">
              <span className="text-white">Uploading...</span>
              <span className="text-white">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full">
              <div
                className="h-full bg-indigo-600 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={isUploading}
            className={`px-6 py-3 rounded-lg font-medium ${
              isUploading
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isUploading ? (
              <span className="flex items-center">
                <FaSpinner className="animate-spin mr-2" />
                Uploading...
              </span>
            ) : (
              'Upload Video'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Upload; 