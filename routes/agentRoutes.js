const express = require('express');
const router = express.Router();
const { applyAsAgent, getMyAgentProfile, getAgentById } = require('../controllers/agentController');
const { protect } = require('../middleware/auth');

router.post('/apply', protect, applyAsAgent);
router.get('/me', protect, getMyAgentProfile);
router.get('/:id', getAgentById);

module.exports = router;
