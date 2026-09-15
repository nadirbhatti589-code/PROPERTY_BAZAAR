const Property = require('../models/Property');

const LISTING_DAYS = 30;
const hasValue = (value) => value !== undefined && value !== null && value !== '';
const normaliseImages = (images = []) => (Array.isArray(images) ? images : []).map((image, index) => ({
  url: typeof image === 'string' ? image : image.url,
  publicId: typeof image === 'string' ? null : image.publicId || null,
  order: typeof image === 'string' ? index : Number.isFinite(Number(image.order)) ? Number(image.order) : index,
})).filter((image) => image.url);
const expiryDate = () => new Date(Date.now() + LISTING_DAYS * 24 * 60 * 60 * 1000);
const ownerOrAdmin = (property, user) => property.postedBy.toString() === user.id || user.role === 'admin';

exports.createProperty = async (req, res) => {
  try {
    const isDraft = req.body.isDraft === true || req.body.isDraft === 'true';
    const required = ['title', 'description', 'listingType', 'category', 'price', 'city', 'area', 'areaSize'];
    if (!isDraft && required.some((field) => !hasValue(req.body[field]))) {
      return res.status(400).json({ message: 'title, description, listingType, category, price, city, area, and areaSize are required' });
    }
    const property = await Property.create({
      ...req.body,
      price: hasValue(req.body.price) ? Number(req.body.price) : 0,
      areaSize: hasValue(req.body.areaSize) ? Number(req.body.areaSize) : 0,
      priceUnit: req.body.listingType === 'rent' ? req.body.priceUnit || 'month' : null,
      location: { type: 'Point', coordinates: [Number(req.body.longitude) || 0, Number(req.body.latitude) || 0] },
      bedrooms: req.body.category === 'plot' ? null : req.body.bedrooms,
      bathrooms: req.body.category === 'plot' ? null : req.body.bathrooms,
      floors: req.body.category === 'plot' ? null : req.body.floors,
      plotType: req.body.category === 'plot' ? req.body.plotType : null,
      images: normaliseImages(req.body.images),
      amenities: Array.isArray(req.body.amenities) ? req.body.amenities : [],
      postedBy: req.user.id,
      postedByRole: req.user.role === 'agent' ? 'agent' : 'seller',
      isDraft,
      status: isDraft ? 'draft' : 'pending_approval',
      expiresAt: isDraft ? null : expiryDate(),
    });
    res.status(201).json({ message: isDraft ? 'Draft saved' : 'Property submitted for review', property });
  } catch (error) { res.status(500).json({ message: 'Failed to create property', error: error.message }); }
};

exports.getProperties = async (req, res) => {
  try {
    const { listingType, category, city, area, minPrice, maxPrice, bedrooms, bathrooms, search, page = 1, limit = 12 } = req.query;
    const filter = { status: { $in: ['active', 'available'] } };
    if (listingType) filter.listingType = listingType;
    if (category) filter.category = category;
    if (city) filter.city = new RegExp(city, 'i');
    if (area) filter.area = new RegExp(area, 'i');
    if (bedrooms) filter.bedrooms = Number(bedrooms);
    if (bathrooms) filter.bathrooms = Number(bathrooms);
    if (minPrice || maxPrice) { filter.price = {}; if (minPrice) filter.price.$gte = Number(minPrice); if (maxPrice) filter.price.$lte = Number(maxPrice); }
    if (search) filter.$text = { $search: search };
    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50); const safePage = Math.max(Number(page) || 1, 1);
    const [properties, total] = await Promise.all([Property.find(filter).populate('postedBy', 'name profileImage').sort({ isFeatured: -1, createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit), Property.countDocuments(filter)]);
    res.status(200).json({ properties, pagination: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) } });
  } catch (error) { res.status(500).json({ message: 'Failed to fetch properties', error: error.message }); }
};

exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('postedBy', 'name profileImage phone email');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    property.views += 1; await property.save();
    res.status(200).json({ property });
  } catch (error) { res.status(500).json({ message: 'Failed to fetch property', error: error.message }); }
};

exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (!ownerOrAdmin(property, req.user)) return res.status(403).json({ message: 'You are not allowed to edit this listing' });
    const fields = ['title', 'description', 'listingType', 'category', 'price', 'priceUnit', 'city', 'area', 'address', 'bedrooms', 'bathrooms', 'floors', 'areaSize', 'areaUnit', 'plotType', 'videoUrl', 'amenities'];
    fields.forEach((field) => { if (req.body[field] !== undefined) property[field] = req.body[field]; });
    if (req.body.images !== undefined) property.images = normaliseImages(req.body.images);
    const isDraft = req.body.isDraft === true || req.body.isDraft === 'true';
    if (isDraft) { property.isDraft = true; property.status = 'draft'; property.expiresAt = null; }
    else if (req.user.role !== 'admin') { property.isDraft = false; property.status = 'pending_approval'; property.isVerified = false; property.expiresAt = expiryDate(); }
    await property.save();
    res.status(200).json({ message: property.isDraft ? 'Draft saved' : 'Property updated', property });
  } catch (error) { res.status(500).json({ message: 'Failed to update property', error: error.message }); }
};

exports.setPropertyStatus = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (!ownerOrAdmin(property, req.user)) return res.status(403).json({ message: 'You are not allowed to update this listing' });
    const { status } = req.body;
    if (!['sold', 'rented', 'draft'].includes(status)) return res.status(400).json({ message: 'Status must be sold, rented, or draft' });
    property.status = status; property.isDraft = status === 'draft'; if (status === 'draft') property.expiresAt = null;
    await property.save(); res.status(200).json({ message: 'Listing status updated', property });
  } catch (error) { res.status(500).json({ message: 'Failed to update listing status', error: error.message }); }
};

exports.renewProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (!ownerOrAdmin(property, req.user)) return res.status(403).json({ message: 'You are not allowed to renew this listing' });
    if (property.status === 'draft') return res.status(400).json({ message: 'Publish this draft before renewing it' });
    property.expiresAt = expiryDate(); if (property.status === 'expired') property.status = 'active';
    await property.save(); res.status(200).json({ message: 'Listing renewed for 30 days', property });
  } catch (error) { res.status(500).json({ message: 'Failed to renew property', error: error.message }); }
};

exports.expireListings = async (req, res) => {
  try {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ message: 'Not authorized' });
    const result = await Property.updateMany({ status: { $in: ['active', 'available'] }, expiresAt: { $lte: new Date() } }, { $set: { status: 'expired' } });
    res.status(200).json({ message: 'Expired listings updated', modifiedCount: result.modifiedCount });
  } catch (error) { res.status(500).json({ message: 'Failed to expire listings', error: error.message }); }
};

exports.deleteProperty = async (req, res) => { try { const property = await Property.findById(req.params.id); if (!property) return res.status(404).json({ message: 'Property not found' }); if (!ownerOrAdmin(property, req.user)) return res.status(403).json({ message: 'You are not allowed to delete this listing' }); await property.deleteOne(); res.status(200).json({ message: 'Property deleted' }); } catch (error) { res.status(500).json({ message: 'Failed to delete property', error: error.message }); } };
exports.getMyProperties = async (req, res) => { try { const properties = await Property.find({ postedBy: req.user.id }).sort({ createdAt: -1 }).lean(); res.status(200).json({ properties }); } catch (error) { res.status(500).json({ message: 'Failed to fetch your properties', error: error.message }); } };
