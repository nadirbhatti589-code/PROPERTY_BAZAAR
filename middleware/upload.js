const multer = require('multer');

// Store the uploaded file in memory as a buffer,
// then we manually stream it to Cloudinary in the route handler.
// (Avoids the multer-storage-cloudinary package, which doesn't
// support Cloudinary v2 and causes dependency conflicts.)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
    }
  },
});

module.exports = upload;

