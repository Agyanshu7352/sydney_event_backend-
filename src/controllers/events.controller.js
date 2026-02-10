// Events controller
const Event = require('../models/Event');
const EmailCapture = require('../models/EmailCapture');
const { EVENT_STATUS } = require('../config/constants');

/**
 * Get all upcoming events with filters
 * Public endpoint
 */
const getEvents = async (req, res) => {
  try {
    const {
      city = 'Sydney',
      category,
      search,
      dateFrom,
      dateTo,
      limit = 50,
      page = 1,
      sortBy = 'startDate'
    } = req.query;

    // Build query
    const query = {
      'venue.city': city,
      startDate: { $gte: new Date() },
      status: { $ne: EVENT_STATUS.INACTIVE }
    };

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Date range filter
    if (dateFrom) {
      query.startDate.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      query.startDate.$lte = new Date(dateTo);
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'venue.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const events = await Event.find(query)
      .sort({ [sortBy]: 1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-changeLog -contentHash'); // Exclude internal fields

    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      data: events,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching events',
      error: error.message
    });
  }
};

/**
 * Get single event by ID
 * Public endpoint
 */
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .select('-changeLog -contentHash');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching event',
      error: error.message
    });
  }
};

/**
 * Get event categories
 * Public endpoint
 */
const getCategories = async (req, res) => {
  try {
    const categories = await Event.distinct('category', {
      startDate: { $gte: new Date() },
      status: { $ne: EVENT_STATUS.INACTIVE }
    });

    res.json({
      success: true,
      data: categories.filter(c => c) // Remove null/undefined
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

/**
 * Capture email when user clicks "Get Tickets"
 * Public endpoint
 */
const captureEmail = async (req, res) => {
  try {
    const { email, consent, eventId } = req.body;

    // Validation
    if (!email || !eventId) {
      return res.status(400).json({
        success: false,
        message: 'Email and eventId are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Save email capture
    await EmailCapture.create({
      email: email.toLowerCase(),
      consent: consent || false,
      event: eventId,
      eventSnapshot: {
        title: event.title,
        date: event.startDate,
        venue: event.venue.name
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      redirectedToSource: true,
      redirectedAt: new Date()
    });

    // Increment click count on event
    await Event.findByIdAndUpdate(eventId, {
      $inc: { 
        clickCount: 1,
        emailCaptureCount: 1
      }
    });

    res.json({
      success: true,
      message: 'Email captured successfully',
      redirectUrl: event.source.url
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error capturing email',
      error: error.message
    });
  }
};

/**
 * Get featured/highlighted events
 * Public endpoint
 */
const getFeaturedEvents = async (req, res) => {
  try {
    const events = await Event.find({
      startDate: { $gte: new Date() },
      status: { $ne: EVENT_STATUS.INACTIVE },
      'imported.status': true
    })
    .sort({ clickCount: -1 })
    .limit(6)
    .select('-changeLog -contentHash');

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching featured events',
      error: error.message
    });
  }
};

module.exports = {
  getEvents,
  getEventById,
  getCategories,
  captureEmail,
  getFeaturedEvents
};