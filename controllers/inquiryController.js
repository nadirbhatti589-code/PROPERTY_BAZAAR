const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');

// POST /api/inquiries
// Body: { propertyId, message }
// Sends a message from the logged-in user to the property's owner
exports.sendInquiry = async (req, res) => {
  try {
    const { propertyId, message } = req.body;
    if (!propertyId || !message) {
      return res.status(400).json({ message: 'propertyId and message are required' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (property.postedBy.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot send an inquiry about your own listing' });
    }

    const inquiry = await Inquiry.create({
      property: propertyId,
      sender: req.user.id,
      receiver: property.postedBy,
      message,
    });

    res.status(201).json({ message: 'Inquiry sent', inquiry });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send inquiry', error: error.message });
  }
};

// GET /api/inquiries/sent
exports.getSentInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ sender: req.user.id })
      .populate('property', 'title images price city area')
      .populate('receiver', 'name profileImage')
      .sort({ createdAt: -1 });
    res.status(200).json({ inquiries });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch sent inquiries', error: error.message });
  }
};

// GET /api/inquiries/received
// Inquiries about listings the logged-in user (seller/agent) owns
exports.getReceivedInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ receiver: req.user.id })
      .populate('property', 'title images price city area')
      .populate('sender', 'name profileImage phone')
      .sort({ createdAt: -1 });
    res.status(200).json({ inquiries });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch received inquiries', error: error.message });
  }
};

// PATCH /api/inquiries/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const inquiry = await Inquiry.findOne({ _id: req.params.id, receiver: req.user.id });
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }
    inquiry.isRead = true;
    await inquiry.save();
    res.status(200).json({ message: 'Marked as read', inquiry });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update inquiry', error: error.message });
  }
};
