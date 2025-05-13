import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-toastify';
import { FaThumbsUp, FaThumbsDown, FaReply, FaEdit, FaTrash } from 'react-icons/fa';
import { 
  getVideoComments, 
  addComment, 
  updateComment, 
  deleteComment,
  voteComment 
} from '../utils/api';

const Comments = ({ videoId, hasAccess }) => {
  const { publicKey } = useWallet();
  const [comments, setComments] = useState([]);
  const [replies, setReplies] = useState({});
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editCommentId, setEditCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });
  
  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await getVideoComments(videoId, null, 1);
        setComments(response.data);
        setPagination(response.pagination);
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    };
    
    fetchComments();
  }, [videoId]);
  
  // Handle adding a new comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!publicKey) {
      toast.error('Please connect your wallet to comment');
      return;
    }
    
    if (!hasAccess) {
      toast.error('You need to pay to access this video before commenting');
      return;
    }
    
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await addComment(videoId, {
        userWallet: publicKey.toString(),
        content: newComment
      });
      
      // Add the new comment to the list
      setComments([response.data, ...comments]);
      setNewComment('');
      toast.success('Comment added successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle replying to a comment
  const handleReply = async (e, parentId) => {
    e.preventDefault();
    
    if (!publicKey) {
      toast.error('Please connect your wallet to reply');
      return;
    }
    
    if (!hasAccess) {
      toast.error('You need to pay to access this video before replying');
      return;
    }
    
    if (!replyText.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await addComment(videoId, {
        userWallet: publicKey.toString(),
        content: replyText,
        parentId
      });
      
      // Add the reply to the replies list
      setReplies(prev => ({
        ...prev,
        [parentId]: [...(prev[parentId] || []), response.data]
      }));
      
      setReplyTo(null);
      setReplyText('');
      toast.success('Reply added successfully!');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load replies for a comment
  const loadReplies = async (commentId) => {
    try {
      const response = await getVideoComments(videoId, commentId);
      setReplies(prev => ({
        ...prev,
        [commentId]: response.data
      }));
    } catch (error) {
      console.error('Error loading replies:', error);
      toast.error('Failed to load replies. Please try again.');
    }
  };
  
  // Handle editing a comment
  const handleEditComment = async (commentId) => {
    if (!editText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await updateComment(commentId, {
        userWallet: publicKey.toString(),
        content: editText
      });
      
      // Update the comment in the list
      setComments(prev => 
        prev.map(comment => 
          comment._id === commentId ? response.data : comment
        )
      );
      
      // Also check replies
      Object.keys(replies).forEach(parentId => {
        setReplies(prev => ({
          ...prev,
          [parentId]: prev[parentId].map(reply =>
            reply._id === commentId ? response.data : reply
          )
        }));
      });
      
      setEditCommentId(null);
      setEditText('');
      toast.success('Comment updated successfully!');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle deleting a comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    try {
      await deleteComment(commentId, {
        userWallet: publicKey.toString()
      });
      
      // Remove the comment from the list
      setComments(prev => 
        prev.filter(comment => comment._id !== commentId)
      );
      
      // Also check replies
      Object.keys(replies).forEach(parentId => {
        setReplies(prev => ({
          ...prev,
          [parentId]: prev[parentId].filter(reply => reply._id !== commentId)
        }));
      });
      
      toast.success('Comment deleted successfully!');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment. Please try again.');
    }
  };
  
  // Handle voting on a comment
  const handleVoteComment = async (commentId, voteType) => {
    if (!publicKey) {
      toast.error('Please connect your wallet to vote');
      return;
    }
    
    if (!hasAccess) {
      toast.error('You need to pay to access this video before voting on comments');
      return;
    }
    
    try {
      const response = await voteComment(commentId, {
        userWallet: publicKey.toString(),
        voteType
      });
      
      // Update the comment in the list
      const updateCommentVotes = (comment) => {
        if (comment._id === commentId) {
          return {
            ...comment,
            upvotes: response.data.upvotes,
            downvotes: response.data.downvotes
          };
        }
        return comment;
      };
      
      setComments(prev => prev.map(updateCommentVotes));
      
      // Also check replies
      Object.keys(replies).forEach(parentId => {
        setReplies(prev => ({
          ...prev,
          [parentId]: prev[parentId].map(updateCommentVotes)
        }));
      });
      
      toast.success(`Comment ${voteType}d!`);
    } catch (error) {
      console.error(`Error ${voteType}ing comment:`, error);
      toast.error(`Failed to ${voteType} comment. Please try again.`);
    }
  };
  
  // Load more comments
  const loadMoreComments = async () => {
    if (pagination.page >= pagination.pages) return;
    
    try {
      const nextPage = pagination.page + 1;
      const response = await getVideoComments(videoId, null, nextPage);
      
      setComments(prev => [...prev, ...response.data]);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading more comments:', error);
      toast.error('Failed to load more comments. Please try again.');
    }
  };
  
  // Render a single comment
  const renderComment = (comment, isReply = false) => {
    const isEditing = editCommentId === comment._id;
    const isCurrentUser = publicKey && publicKey.toString() === comment.userWallet;
    
    return (
      <div 
        key={comment._id} 
        className={`p-4 mb-4 bg-gray-800 rounded-lg ${isReply ? 'ml-12' : ''}`}
      >
        <div className="flex justify-between">
          <div className="font-medium text-white">{comment.userName}</div>
          <div className="text-gray-400 text-sm">
            {new Date(comment.createdAt).toLocaleString()}
          </div>
        </div>
        
        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded"
              rows={3}
            />
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => handleEditComment(comment._id)}
                disabled={loading}
                className="px-3 py-1 bg-indigo-600 text-white rounded"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditCommentId(null);
                  setEditText('');
                }}
                className="px-3 py-1 bg-gray-700 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-2 text-gray-300">{comment.content}</div>
            
            <div className="mt-4 flex items-center space-x-4">
              {/* Vote buttons */}
              <button
                onClick={() => handleVoteComment(comment._id, 'upvote')}
                disabled={!hasAccess}
                className="flex items-center space-x-1 text-gray-400 hover:text-indigo-400"
              >
                <FaThumbsUp className="text-sm" />
                <span>{comment.upvotes}</span>
              </button>
              
              <button
                onClick={() => handleVoteComment(comment._id, 'downvote')}
                disabled={!hasAccess}
                className="flex items-center space-x-1 text-gray-400 hover:text-indigo-400"
              >
                <FaThumbsDown className="text-sm" />
                <span>{comment.downvotes}</span>
              </button>
              
              {/* Reply button */}
              <button
                onClick={() => {
                  setReplyTo(comment._id);
                  setReplyText('');
                  if (!replies[comment._id]) {
                    loadReplies(comment._id);
                  }
                }}
                className="flex items-center space-x-1 text-gray-400 hover:text-indigo-400"
              >
                <FaReply className="text-sm" />
                <span>Reply</span>
              </button>
              
              {/* Edit and Delete buttons (only for user's own comments) */}
              {isCurrentUser && (
                <>
                  <button
                    onClick={() => {
                      setEditCommentId(comment._id);
                      setEditText(comment.content);
                    }}
                    className="flex items-center space-x-1 text-gray-400 hover:text-indigo-400"
                  >
                    <FaEdit className="text-sm" />
                    <span>Edit</span>
                  </button>
                  
                  <button
                    onClick={() => handleDeleteComment(comment._id)}
                    className="flex items-center space-x-1 text-gray-400 hover:text-red-400"
                  >
                    <FaTrash className="text-sm" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}
        
        {/* Reply form */}
        {replyTo === comment._id && (
          <div className="mt-4">
            <form onSubmit={(e) => handleReply(e, comment._id)}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="w-full p-2 bg-gray-700 text-white rounded"
                rows={2}
                disabled={loading || !hasAccess}
              />
              <div className="flex space-x-2 mt-2">
                <button
                  type="submit"
                  disabled={loading || !hasAccess}
                  className="px-3 py-1 bg-indigo-600 text-white rounded"
                >
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="px-3 py-1 bg-gray-700 text-white rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Replies */}
        {replies[comment._id] && replies[comment._id].length > 0 && (
          <div className="mt-4">
            {replies[comment._id].map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-white mb-4">Comments</h3>
      
      {/* Comment form */}
      <form onSubmit={handleAddComment} className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={hasAccess ? "Write a comment..." : "Pay to access this video and join the conversation"}
          className="w-full p-3 bg-gray-800 text-white rounded-lg"
          rows={3}
          disabled={loading || !hasAccess}
        />
        <button
          type="submit"
          disabled={loading || !hasAccess}
          className={`mt-2 px-4 py-2 rounded-lg ${
            hasAccess 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
      
      {/* Comments list */}
      <div className="space-y-4">
        {comments.length > 0 ? (
          <>
            {comments.map(comment => renderComment(comment))}
            
            {/* Load more button */}
            {pagination.page < pagination.pages && (
              <div className="text-center mt-4">
                <button
                  onClick={loadMoreComments}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                >
                  Load More Comments
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-gray-400">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Comments; 