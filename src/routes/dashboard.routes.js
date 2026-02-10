// Dashboard routes
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

// All dashboard routes require authentication
router.use(isAuthenticated);

/**
 * @route   GET /api/dashboard/events
 * @desc    Get all events for dashboard with advanced filters
 * @access  Protected
 */
router.get('/events', dashboardController.getDashboardEvents);

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Protected
 */
router.get('/stats', dashboardController.getDashboardStats);

/**
 * @route   POST /api/dashboard/events/:eventId/import
 * @desc    Import event to platform
 * @access  Protected
 */
router.post('/events/:eventId/import', dashboardController.importEvent);

/**
 * @route   PATCH /api/dashboard/events/:eventId/status
 * @desc    Update event status
 * @access  Protected
 */
router.patch('/events/:eventId/status', dashboardController.updateEventStatus);

/**
 * @route   GET /api/dashboard/events/:eventId/history
 * @desc    Get event change history
 * @access  Protected
 */
router.get('/events/:eventId/history', dashboardController.getEventHistory);

/**
 * @route   GET /api/dashboard/events/:eventId/analytics
 * @desc    Get email capture analytics for event
 * @access  Protected
 */
router.get('/events/:eventId/analytics', dashboardController.getEmailAnalytics);

module.exports = router;