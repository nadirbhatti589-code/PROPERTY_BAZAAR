require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'PropertyBazaar API is running' });
});

// Image upload (Cloudinary)
app.use('/api/upload', require('./routes/uploadRoutes'));

// Auth (signup, login, Google sign-in)
app.use('/api/auth', require('./routes/authRoutes'));

// Properties (public search + create/update/delete for sellers/agents)
app.use('/api/properties', require('./routes/propertyRoutes'));

// Agents (apply for agent verification, public agent profiles)
app.use('/api/agents', require('./routes/agentRoutes'));

// Favorites (wishlist)
app.use('/api/favorites', require('./routes/favoriteRoutes'));

// Inquiries (buyer <-> seller/agent messages)
app.use('/api/inquiries', require('./routes/inquiryRoutes'));

// Admin (property approval, agent verification, user management — admin role only)
app.use('/api/admin', require('./routes/adminRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
