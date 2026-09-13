const Property = require('../models/Property');

// POST /api/properties
// Creates a new listing. Requires login (seller or agent).
// Listing starts as "pending_approval" until an admin approves it.
exports.createProperty = async (req, res) => {
  try {
    const {
      title,
      description,
      listingType,
      category,
      price,
      priceUnit,
      city,
      area,
      address,
      longitude,
      latitude,
      bedrooms,
      bathrooms,
      floors,
      areaSize,
      areaUnit,
      plotType,
      images,
      videoUrl,
      amenities,
    } = req.body;

    if (!title || !description || !listingType || !category || !price || !city || !area || !areaSize) {
      return res.status(400).json({
        message:
          'title, description, listingType, category, price, city, area, and areaSize are required',
      });
    }

    const property = await Property.create({
      title,
      description,
      listingType,
      category,
      price,
      priceUnit: listingType === 'rent' ? priceUnit || 'month' : null,
      city,
      area,
      address,
      location: {
        type: 'Point',
        coordinates: [longitude || 0, latitude || 0],
      },
      bedrooms: category === 'plot' ? null : bedrooms,
      bathrooms: category === 'plot' ? null : bathrooms,
      floors: category === 'plot' ? null : floors,
      areaSize,
      areaUnit,
      plotType: category === 'plot' ? plotType : null,
      images: images || [],
      videoUrl,
      amenities: amenities || [],
      postedBy: req.user.id,
      postedByRole: req.user.role === 'agent' ? 'agent' : 'seller',
    });

    res.status(201).json({ message: 'Property submitted for review', property });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create property', error: error.message });
  }
};

// GET /api/properties
// Public search/browse endpoint with filters + pagination.
// Query params: listingType, category, city, area, minPrice, maxPrice,
// bedrooms, bathrooms, search, page, limit
exports.getProperties = async (req, res) => {
  try {
    const {
      listingType,
      category,
      city,
      area,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      search,
      page = 1,
      limit = 12,
    } = req.query;

    // Only show approved, publicly-visible listings on the public search
    const filter = { status: { $in: ['available'] } };

    if (listingType) filter.listingType = listingType;
    if (category) filter.category = category;
    if (city) filter.city = new RegExp(city, 'i');
    if (area) filter.area = new RegExp(area, 'i');
    if (bedrooms) filter.bedrooms = Number(bedrooms);
    if (bathrooms) filter.bathrooms = Number(bathrooms);

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .populate('postedBy', 'name profileImage')
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Property.countDocuments(filter),
    ]);

    res.status(200).json({
      properties,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch properties', error: error.message });
  }
};

// GET /api/properties/:id
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate(
      'postedBy',
      'name profileImage phone email'
    );

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Increment view count (fire and forget)
    property.views += 1;
    await property.save();

    res.status(200).json({ property });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch property', error: error.message });
  }
};

// PUT /api/properties/:id
// Only the original poster (or admin) can edit
exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const isOwner = property.postedBy.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are not allowed to edit this listing' });
    }

    const updatable = [
      'title',
      'description',
      'price',
      'priceUnit',
      'city',
      'area',
      'address',
      'bedrooms',
      'bathrooms',
      'floors',
      'areaSize',
      'areaUnit',
      'plotType',
      'images',
      'videoUrl',
      'amenities',
      'status',
    ];
    updatable.forEach((field) => {
      if (req.body[field] !== undefined) {
        property[field] = req.body[field];
      }
    });

    // If a non-admin edits the listing, send it back for re-review
    if (!isAdmin) {
      property.status = 'pending_approval';
      property.isVerified = false;
    }

    await property.save();
    res.status(200).json({ message: 'Property updated', property });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update property', error: error.message });
  }
};

// DELETE /api/properties/:id
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const isOwner = property.postedBy.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are not allowed to delete this listing' });
    }

    await property.deleteOne();
    res.status(200).json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete property', error: error.message });
  }
};

// GET /api/properties/mine
// Returns listings posted by the logged-in user
exports.getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ properties });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your properties', error: error.message });
  }
};
