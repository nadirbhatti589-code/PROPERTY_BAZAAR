const mongoose = require('mongoose');

// Instead of disabling buffering entirely (which can cause queries to fail
// immediately if they arrive a split-second before the connection is fully
// ready), we keep buffering enabled but give it more time — Atlas + a cold
// serverless start can occasionally take longer than the 10s default.
mongoose.set('bufferTimeoutMS', 20000);

// In serverless environments (Vercel), this module can be re-invoked many
// times across different function executions, sometimes concurrently.
// We cache the CONNECTION PROMISE (not just the connection) so that if two
// requests arrive while we're still connecting, they both await the same
// in-flight connection attempt instead of racing to call connect() twice.
let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000, // give Atlas up to 15s to respond
      })
      .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((error) => {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        connectionPromise = null; // allow the next request to retry
        throw error;
      });
  }

  return connectionPromise;
};

module.exports = connectDB;