/**
 * Utility script to fix thumbnail issues
 * This script:
 * 1. Scans the uploads directory for existing files
 * 2. Copies default thumbnails for entries with missing files
 * 3. Ensures correct file extensions are used
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { DEV_UPLOADS_DIR } = require('../config/arweave');

// Import the Video model
const Video = mongoose.model('Video', require('../models/Video').schema);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/str3am')
  .then(() => {
    console.log('Connected to MongoDB');
    fixThumbnails();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function fixThumbnails() {
  try {
    // 1. Get all videos from the database
    const videos = await Video.find();
    console.log(`Found ${videos.length} videos in database`);

    // 2. Get existing files in uploads directory
    const files = fs.readdirSync(DEV_UPLOADS_DIR);
    console.log(`Found ${files.length} files in uploads directory: ${files.join(', ')}`);

    // 3. Default thumbnail to use when missing
    const defaultThumbnailPath = path.join(__dirname, '..', 'assets', 'default-thumbnail.jpg');
    if (!fs.existsSync(defaultThumbnailPath)) {
      console.log('Default thumbnail not found, creating one');
      // Create a simple one-pixel image
      const simpleJpg = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==',
        'base64'
      );
      fs.writeFileSync(defaultThumbnailPath, simpleJpg);
    }

    // 4. Process each video
    let fixed = 0;
    let skipped = 0;

    for (const video of videos) {
      console.log(`\nProcessing video: ${video.title} (${video._id})`);
      
      if (!video.thumbnailCid) {
        console.log('  No thumbnailCid, skipping');
        skipped++;
        continue;
      }

      // Check if there's a matching file (with any extension)
      const thumbnailId = video.thumbnailCid;
      const matchingFile = files.find(file => file.startsWith(thumbnailId + '.') || file === thumbnailId);
      
      if (matchingFile) {
        console.log(`  Found matching file: ${matchingFile}`);
        
        // Already has proper extension, nothing to do
        if (matchingFile.includes('.')) {
          console.log('  File already has extension, no action needed');
          skipped++;
          continue;
        }
        
        // Add proper extension
        const newName = `${matchingFile}.jpg`;
        fs.renameSync(
          path.join(DEV_UPLOADS_DIR, matchingFile),
          path.join(DEV_UPLOADS_DIR, newName)
        );
        console.log(`  Renamed ${matchingFile} to ${newName}`);
        fixed++;
      } else {
        console.log(`  No matching file found for ID: ${thumbnailId}`);
        
        // Copy default thumbnail
        const newName = `${thumbnailId}.jpg`;
        fs.copyFileSync(
          defaultThumbnailPath,
          path.join(DEV_UPLOADS_DIR, newName)
        );
        console.log(`  Created default thumbnail: ${newName}`);
        fixed++;
      }
    }

    console.log(`\nFixed ${fixed} thumbnails, skipped ${skipped} thumbnails`);
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing thumbnails:', error);
    process.exit(1);
  }
} 