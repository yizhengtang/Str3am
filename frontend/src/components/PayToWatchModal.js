import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-toastify';
import { payToWatch } from '../utils/solana';
import { recordPayment } from '../utils/api';
import { FaLock, FaCoins } from 'react-icons/fa';

const PayToWatchModal = ({ video, onPaymentSuccess, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { publicKey, signTransaction } = useWallet();
  
  const handlePayment = async () => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Execute blockchain transaction
      const { signature, accessPubkey } = await payToWatch(
        { publicKey, signTransaction },
        video.videoPubkey,
        video.uploader,
        video.price
      );
      
      // Record payment in backend
      await recordPayment({
        videoId: video._id,
        viewerWallet: publicKey.toString(),
        tokensPaid: video.price,
        transactionSignature: signature,
        videoPubkey: video.videoPubkey,
        accessPubkey
      });
      
      toast.success('Payment successful! Enjoy the video.');
      onPaymentSuccess(accessPubkey);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(`Payment failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Pay to Watch</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-indigo-600/20 p-4 rounded-full">
              <FaLock className="text-indigo-500 text-4xl" />
            </div>
          </div>
          
          <h3 className="text-white text-lg font-medium mb-2">
            {video.title}
          </h3>
          
          <p className="text-gray-400 mb-4">
            This content requires a one-time payment to watch. You'll have permanent access after payment.
          </p>
          
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Price:</span>
              <div className="flex items-center text-white font-bold">
                <FaCoins className="text-yellow-500 mr-2" />
                {video.price} SOL
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-300">Creator:</span>
              <span className="text-gray-300 truncate max-w-[200px]">
                {video.uploader}
              </span>
            </div>
          </div>
          
          {!publicKey && (
            <p className="text-red-400 text-sm mb-4">
              Please connect your wallet to continue with the payment.
            </p>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handlePayment}
            disabled={isLoading || !publicKey}
            className={`flex-1 py-2 px-4 rounded-lg ${
              isLoading || !publicKey
                ? 'bg-indigo-600/50 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white font-medium transition-colors flex justify-center items-center`}
          >
            {isLoading ? (
              <div className="loading-spinner w-5 h-5 border-2" />
            ) : (
              'Pay Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayToWatchModal; 