require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const videoRoutes = require('./routes/videoRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const commentRoutes = require('./routes/commentRoutes');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import development uploads directory for serving locally stored files
const { isDevelopment, DEV_UPLOADS_DIR } = require('./config/arweave');

// Route for creator-token endpoints
const creatorTokenRoutes = require('./routes/creatorTokenRoutes');

// Set NODE_ENV to development if not specified
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
console.log(`Running in ${process.env.NODE_ENV} mode`);

// Additional file system check for uploads directory
if (isDevelopment) {
  try {
    if (!fs.existsSync(DEV_UPLOADS_DIR)) {
      console.log(`Creating uploads directory at: ${DEV_UPLOADS_DIR}`);
      fs.mkdirSync(DEV_UPLOADS_DIR, { recursive: true });
    }
    
    // Check if directory is writable
    const testFile = path.join(DEV_UPLOADS_DIR, 'test-write.txt');
    fs.writeFileSync(testFile, 'This is a test file to verify directory permissions');
    fs.unlinkSync(testFile);
    console.log(`Uploads directory at ${DEV_UPLOADS_DIR} exists and is writable`);
    
    // List any existing files in the directory
    const files = fs.readdirSync(DEV_UPLOADS_DIR);
    console.log(`Found ${files.length} files in uploads directory: ${files.join(', ') || 'none'}`);
  } catch (error) {
    console.error(`Error setting up uploads directory: ${error.message}`);
  }
}

// Initialize express app
const app = express();
let PORT = process.env.PORT || 5000;
const ALTERNATIVE_PORT = process.env.ALTERNATIVE_PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files from the uploads directory in development mode
if (isDevelopment) {
  console.log(`Setting up static file middleware for ${DEV_UPLOADS_DIR}`);
  
  // More detailed logging for uploads requests
  app.use('/api/uploads', (req, res, next) => {
    const requestedFile = path.basename(req.url);
    console.log(`Uploads request received: ${req.method} ${req.url}`);
    
    // Try to find exact match first
    const exactFilePath = path.join(DEV_UPLOADS_DIR, requestedFile);
    if (fs.existsSync(exactFilePath)) {
      console.log(`File exists (exact match): ${exactFilePath}`);
      return next();
    }
    
    // If no exact match, try to find file with any extension
    const files = fs.readdirSync(DEV_UPLOADS_DIR);
    const fileId = requestedFile.split('.')[0]; // Get ID part if extension exists
    const matchingFile = files.find(file => file.startsWith(fileId + '.'));
    
    if (matchingFile) {
      console.log(`File exists with extension: ${path.join(DEV_UPLOADS_DIR, matchingFile)}`);
      // Redirect to the file with proper extension
      return res.redirect(`/api/uploads/${matchingFile}`);
    }
    
    console.error(`File not found: ${exactFilePath}`);
    next();
  });
  
  app.use('/api/uploads', express.static(DEV_UPLOADS_DIR));
  console.log(`Serving local uploads from: ${DEV_UPLOADS_DIR}`);
}

// Routes
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/creator-token', creatorTokenRoutes);
app.use('/api/reward', require('./routes/rewardRoutes'));


// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'STR3AM API is running',
    endpoints: [
      '/api/videos',
      '/api/users',
      '/api/interactions',
      '/api/comments',
      '/api/payments'
    ]
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/str3am')
  .then(() => {
    console.log('MongoDB Connected...');
    
    // Start server with fallback to alternative port
    const startServer = (port) => {
      const server = app.listen(port)
        .on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is already in use. Trying alternative port ${ALTERNATIVE_PORT}...`);
            if (port !== ALTERNATIVE_PORT) {
              startServer(ALTERNATIVE_PORT);
            } else {
              console.error(`Alternative port ${ALTERNATIVE_PORT} is also in use. Please specify a different port.`);
              process.exit(1);
            }
          } else {
            console.error('Server error:', err);
            process.exit(1);
          }
        })
        .on('listening', () => {
          console.log(`Server running on port ${port}`);
        });
      
      return server;
    };
    
    startServer(PORT);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Server Error'
  });
}); 