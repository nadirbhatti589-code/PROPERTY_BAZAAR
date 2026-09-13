const express = require('express');
const router = express.Router();
const {
  sendInquiry,
  getSentInquiries,
  getReceivedInquiries,
  markAsRead,
} = require('../controllers/inquiryController');
const { protect } = require('../middleware/auth');

router.post('/', protect, sendInquiry);
router.get('/sent', protect, getSentInquiries);
router.get('/received', protect, getReceivedInquiries);
router.patch('/:id/read', protect, markAsRead);

module.exports = router;
