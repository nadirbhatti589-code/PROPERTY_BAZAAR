const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Note: no process.exit() here — on Vercel's serverless platform,
    // exiting the process crashes the entire function. We just log the
    // error; requests that need the DB will fail with their own error
    // message instead of taking down the whole server.
  }
};

module.exports = connectDB;