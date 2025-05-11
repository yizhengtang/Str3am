const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large'
    });
  }
  
  // Check for MongoDB errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      error: messages
    });
  }
  
  // Check for duplicate key errors
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate field value entered'
    });
  }
  
  // Default server error
  res.status(500).json({
    success: false,
    error: 'Server Error'
  });
};

module.exports = errorHandler; 