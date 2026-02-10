// Dashboard controller
const Event = require('../models/Event');
const ImportedEvent = require('../models/ImportedEvent');
const EmailCapture = require('../models/EmailCapture');
const { EVENT_STATUS } = require('../config/constants');

/**
 * Get dashboard events with advanced filters
 * Protected: Admin only
 */
const getDashboardEvents = async (req, res) => {
  try {
    const {
      city,
      status,
      search,
      dateFrom,
      dateTo,
      category,
      source,
      limit = 100,
      page = 1,
      sortBy = 'startDate',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = {};

    if (city) query['venue.city'] = city;
    if (status) query.status = status;
    if (category) query.category = category;
    if (source) query['source.name'] = source;

    // Date range
    if (dateFrom || dateTo) {
      query.startDate = {};
      if (dateFrom) query.startDate.$gte = new Date(dateFrom);
      if (dateTo) query.startDate.$lte = new Date(dateTo);
    }

    // Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'venue.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query with population
    const events = await Event.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .populate('imported.by', 'name email');

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
      message: 'Error fetching dashboard events',
      error: error.message
    });
  }
};

/**
 * Get dashboard statistics
 * Protected: Admin only
 */
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = await Promise.all([
      // Total events
      Event.countDocuments({ startDate: { $gte: now } }),
      
      // By status
      Event.countDocuments({ status: EVENT_STATUS.NEW }),
      Event.countDocuments({ status: EVENT_STATUS.UPDATED }),
      Event.countDocuments({ status: EVENT_STATUS.INACTIVE }),
      Event.countDocuments({ 'imported.status': true }),
      
      // Recent additions
      Event.countDocuments({ 
        firstScraped: { $gte: thirtyDaysAgo },
        startDate: { $gte: now }
      }),
      
      // Email captures
      EmailCapture.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      
      // Unique email subscribers
      EmailCapture.distinct('email', { consent: true }).then(emails => emails.length),
      
      // By source
      Event.aggregate([
        { $match: { startDate: { $gte: now } } },
        { $group: { _id: '$source.name', count: { $sum: 1 } } }
      ]),
      
      // By category
      Event.aggregate([
        { $match: { startDate: { $gte: now } } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalUpcoming: stats[0],
        byStatus: {
          new: stats[1],
          updated: stats[2],
          inactive: stats[3],
          imported: stats[4]
        },
        recentAdditions: stats[5],
        emailCaptures: {
          last30Days: stats[6],
          uniqueSubscribers: stats[7]
        },
        bySource: stats[8],
        byCategory: stats[9]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
};

/**
 * Import event to platform
 * Protected: Admin only
 */
const importEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { notes } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if already imported
    const existing = await ImportedEvent.findOne({ event: eventId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Event already imported'
      });
    }

    // Create imported event record
    await ImportedEvent.create({
      event: eventId,
      importedBy: req.user._id,
      importedAt: new Date(),
      notes: notes || '',
      platformStatus: 'pending'
    });

    // Update event
    event.imported = {
      status: true,
      by: req.user._id,
      at: new Date(),
      notes: notes || ''
    };
    event.status = EVENT_STATUS.IMPORTED;
    await event.save();

    res.json({
      success: true,
      message: 'Event imported successfully',
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error importing event',
      error: error.message
    });
  }
};

/**
 * Update event status manually
 * Protected: Admin only
 */
const updateEventStatus = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;

    if (!Object.values(EVENT_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const event = await Event.findByIdAndUpdate(
      eventId,
      { status },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event status updated',
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating event status',
      error: error.message
    });
  }
};

/**
 * Get event change history
 * Protected: Admin only
 */
const getEventHistory = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .select('title changeLog firstScraped lastScraped scrapedCount');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: {
        title: event.title,
        firstScraped: event.firstScraped,
        lastScraped: event.lastScraped,
        scrapedCount: event.scrapedCount,
        changes: event.changeLog
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching event history',
      error: error.message
    });
  }
};

/**
 * Get email capture analytics
 * Protected: Admin only
 */
const getEmailAnalytics = async (req, res) => {
  try {
    const { eventId } = req.params;

    const captures = await EmailCapture.find({ event: eventId })
      .sort({ createdAt: -1 })
      .limit(100);

    const stats = {
      total: captures.length,
      withConsent: captures.filter(c => c.consent).length,
      uniqueEmails: [...new Set(captures.map(c => c.email))].length
    };

    res.json({
      success: true,
      data: {
        stats,
        captures
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching email analytics',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardEvents,
  getDashboardStats,
  importEvent,
  updateEventStatus,
  getEventHistory,
  getEmailAnalytics
};