const Agent = require('../models/Agent');
const User = require('../models/User');

// POST /api/agents/apply
// A logged-in user submits their license info to become a verified agent.
// Their role should already be "agent" (set at signup or by admin).
exports.applyAsAgent = async (req, res) => {
  try {
    const { agencyName, licenseNumber, licenseDocumentUrl, bio, serviceCities } = req.body;

    if (!licenseNumber || !licenseDocumentUrl) {
      return res.status(400).json({ message: 'License number and license document are required' });
    }

    const existing = await Agent.findOne({ user: req.user.id });
    if (existing) {
      return res.status(400).json({ message: 'You have already submitted an agent application' });
    }

    const agent = await Agent.create({
      user: req.user.id,
      agencyName,
      licenseNumber,
      licenseDocumentUrl,
      bio,
      serviceCities,
      verifiedStatus: 'pending',
    });

    // Make sure the user's role reflects that they are (pending) agent
    await User.findByIdAndUpdate(req.user.id, { role: 'agent' });

    res.status(201).json({ message: 'Agent application submitted, pending admin review', agent });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit agent application', error: error.message });
  }
};

// GET /api/agents/me
exports.getMyAgentProfile = async (req, res) => {
  try {
    const agent = await Agent.findOne({ user: req.user.id });
    if (!agent) {
      return res.status(404).json({ message: 'No agent profile found' });
    }
    res.status(200).json({ agent });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch agent profile', error: error.message });
  }
};

// GET /api/agents/:id
// Public profile of a verified agent
exports.getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id).populate('user', 'name profileImage phone');
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    res.status(200).json({ agent });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch agent', error: error.message });
  }
};
