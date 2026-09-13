const Favorite = require('../models/Favorite');

// POST /api/favorites/:propertyId
exports.addFavorite = async (req, res) => {
  try {
    const favorite = await Favorite.create({
      user: req.user.id,
      property: req.params.propertyId,
    });
    res.status(201).json({ message: 'Added to favorites', favorite });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This property is already in your favorites' });
    }
    res.status(500).json({ message: 'Failed to add favorite', error: error.message });
  }
};

// DELETE /api/favorites/:propertyId
exports.removeFavorite = async (req, res) => {
  try {
    await Favorite.findOneAndDelete({ user: req.user.id, property: req.params.propertyId });
    res.status(200).json({ message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove favorite', error: error.message });
  }
};

// GET /api/favorites
exports.getMyFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id }).populate('property');
    res.status(200).json({ favorites });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch favorites', error: error.message });
  }
};
