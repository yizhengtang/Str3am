require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const videoRoutes = require('./routes/videoRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const commentRoutes = require('./routes/commentRoutes');

// Set NODE_ENV to development if not specified
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
console.log(`Running in ${process.env.NODE_ENV} mode`);

// Initialize express app
const app = express();
let PORT = process.env.PORT || 5000;
const ALTERNATIVE_PORT = process.env.ALTERNATIVE_PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/comments', commentRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Str3am API is running...');
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