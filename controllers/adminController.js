const bcrypt = require('bcryptjs');
const Property = require('../models/Property');
const User = require('../models/User');
const Agent = require('../models/Agent');
const generateToken = require('../utils/generateToken');

// POST /api/admin/login
// Admin-only login — same credential check as the normal login, but rejects
// any account that doesn't have role "admin". This route is NOT behind the
// `protect, authorize('admin')` middleware (it has to be public, since the
// admin doesn't have a token yet) — make sure it's registered in
// adminRoutes.js BEFORE the `router.use(protect, authorize('admin'))` line.
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'This account does not have admin access' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// GET /api/admin/properties/pending
// All listings waiting for admin approval
exports.getPendingProperties = async (req, res) => {
  try {
    const properties = await Property.find({ status: 'pending_approval' })
      .populate('postedBy', 'name email phone')
      .sort({ createdAt: 1 });
    res.status(200).json({ properties });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending properties', error: error.message });
  }
};

// PATCH /api/admin/properties/:id/approve
exports.approveProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { status: 'available', isVerified: true },
      { new: true }
    );
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.status(200).json({ message: 'Property approved', property });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve property', error: error.message });
  }
};

// PATCH /api/admin/properties/:id/reject
exports.rejectProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.status(200).json({ message: 'Property rejected', property });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject property', error: error.message });
  }
};

// GET /api/admin/agents/pending
exports.getPendingAgents = async (req, res) => {
  try {
    const agents = await Agent.find({ verifiedStatus: 'pending' }).populate(
      'user',
      'name email phone'
    );
    res.status(200).json({ agents });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending agents', error: error.message });
  }
};

// PATCH /api/admin/agents/:id/verify
exports.verifyAgent = async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      { verifiedStatus: 'verified', rejectionReason: null },
      { new: true }
    );
    if (!agent) return res.status(404).json({ message: 'Agent not found' });
    res.status(200).json({ message: 'Agent verified', agent });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify agent', error: error.message });
  }
};

// PATCH /api/admin/agents/:id/reject
exports.rejectAgent = async (req, res) => {
  try {
    const { reason } = req.body;
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      { verifiedStatus: 'rejected', rejectionReason: reason || 'Documents could not be verified' },
      { new: true }
    );
    if (!agent) return res.status(404).json({ message: 'Agent not found' });
    res.status(200).json({ message: 'Agent rejected', agent });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject agent', error: error.message });
  }
};

// GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

// PATCH /api/admin/users/:id/block
exports.toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`, user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
};

// GET /api/admin/stats
// Simple dashboard overview numbers
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalProperties, pendingProperties, totalUsers, pendingAgents, totalAgents] =
      await Promise.all([
        Property.countDocuments({ status: 'available' }),
        Property.countDocuments({ status: 'pending_approval' }),
        User.countDocuments(),
        Agent.countDocuments({ verifiedStatus: 'pending' }),
        Agent.countDocuments({ verifiedStatus: 'verified' }),
      ]);

    res.status(200).json({
      totalProperties,
      pendingProperties,
      totalUsers,
      pendingAgents,
      totalAgents,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
};