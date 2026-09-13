const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to shape the user object we send back to the frontend
// (never send the password hash)
const shapeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  profileImage: user.profileImage,
  cnicVerified: user.cnicVerified,
});

// POST /api/auth/register
// Email + password signup
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Only allow buyer/seller/agent at signup — never let a request set role: admin
    const allowedRoles = ['buyer', 'seller', 'agent'];
    const finalRole = allowedRoles.includes(role) ? role : 'buyer';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role: finalRole,
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: shapeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// POST /api/auth/login
// Email + password login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // password field has select:false in the model, so explicitly include it here
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
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
      user: shapeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// POST /api/auth/google
// Body: { idToken: "<Google ID token from frontend Google Sign-In>" }
exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Google idToken is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      // First time signing in with Google — create the account
      user = await User.create({
        name: payload.name,
        email: payload.email.toLowerCase(),
        googleId: payload.sub,
        profileImage: payload.picture || '',
        role: 'buyer', // default role; user can request agent/seller status later
      });
    } else if (!user.googleId) {
      // Existing email/password account — link the Google id to it
      user.googleId = payload.sub;
      await user.save();
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: 'Google sign-in successful',
      token,
      user: shapeUser(user),
    });
  } catch (error) {
    res.status(401).json({ message: 'Google sign-in failed', error: error.message });
  }
};

// GET /api/auth/me
// Returns the currently logged-in user (requires the `protect` middleware)
exports.getMe = async (req, res) => {
  res.status(200).json({ user: shapeUser(req.user) });
};
