const express = require('express');
const router = express.Router();
const {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getMyProperties,
  setPropertyStatus,
  renewProperty,
  expireListings,
} = require('../controllers/propertyController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getProperties);

// Logged-in user's own listings — must come before "/:id" so "mine" isn't treated as an id
router.get('/mine', protect, getMyProperties);

// Vercel Cron calls this daily using CRON_SECRET, not an end-user JWT.
router.post('/cron/expire', expireListings);

router.get('/:id', getPropertyById);

// Protected routes — only sellers and agents can create listings
router.post('/', protect, authorize('seller', 'agent'), createProperty);
router.put('/:id', protect, updateProperty);
router.patch('/:id/status', protect, setPropertyStatus);
router.post('/:id/renew', protect, renewProperty);
router.delete('/:id', protect, deleteProperty);

module.exports = router;
