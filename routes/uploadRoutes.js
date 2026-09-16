const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const { protect, authorize } = require('../middleware/auth');

// Helper: uploads a single file buffer to Cloudinary and returns the result
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'propertybazaar/properties',
        transformation: [{ width: 1600, height: 1200, crop: 'limit' }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// POST /api/upload
// Accepts up to 10 images (form field name: "images")
// Returns the Cloudinary URLs — frontend then saves these URLs
// into the Property document's `images` array.
router.post(
  '/',
  protect,
  authorize('seller', 'agent', 'admin'),
  (req, res, next) => {
    upload.array('images', 10)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'File upload error' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No images uploaded' });
      }

      const uploadPromises = req.files.map((file) => uploadToCloudinary(file.buffer));
      const results = await Promise.all(uploadPromises);
      const images = results.map((result, order) => ({
        url: result.secure_url,
        publicId: result.public_id,
        order,
      }));

      res.status(200).json({
        message: 'Images uploaded successfully',
        images,
      });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      res.status(500).json({ message: 'Upload failed', error: error.message });
    }
  }
);

module.exports = router;
