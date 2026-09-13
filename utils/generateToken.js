const jwt = require('jsonwebtoken');

// Generates a JWT that stores the user's id and role.
// Used at login/signup so the frontend can store this token
// and send it in the Authorization header for protected routes.
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = generateToken;
