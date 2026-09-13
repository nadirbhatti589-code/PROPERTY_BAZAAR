const express = require('express');
const router = express.Router();
const {
  getPendingProperties,
  approveProperty,
  rejectProperty,
  getPendingAgents,
  verifyAgent,
  rejectAgent,
  getAllUsers,
  toggleBlockUser,
  getDashboardStats,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Every route in this file requires the user to be logged in AND have role "admin"
router.use(protect, authorize('admin'));

router.get('/stats', getDashboardStats);

router.get('/properties/pending', getPendingProperties);
router.patch('/properties/:id/approve', approveProperty);
router.patch('/properties/:id/reject', rejectProperty);

router.get('/agents/pending', getPendingAgents);
router.patch('/agents/:id/verify', verifyAgent);
router.patch('/agents/:id/reject', rejectAgent);

router.get('/users', getAllUsers);
router.patch('/users/:id/block', toggleBlockUser);

module.exports = router;
