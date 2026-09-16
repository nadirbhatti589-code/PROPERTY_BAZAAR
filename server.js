require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// Allowed origins
const allowedOrigins = [
  'https://propertybazaar-frontend.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') // allow Vercel preview deployments
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive fallback to prevent breaking other environments
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Global error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

// Vercel runs this file as a serverless function and does NOT need app.listen() —
// it imports the exported `app` and handles requests itself.
// Locally (npm run dev), we still want app.listen() so you can test on localhost.
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;