// Events routes
const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');

/**
 * @route   GET /api/events
 * @desc    Get all upcoming events with filters
 * @access  Public
 */
router.get('/', eventsController.getEvents);

/**
 * @route   GET /api/events/featured
 * @desc    Get featured events
 * @access  Public
 */
router.get('/featured', eventsController.getFeaturedEvents);

/**
 * @route   GET /api/events/categories
 * @desc    Get all event categories
 * @access  Public
 */
router.get('/categories', eventsController.getCategories);

/**
 * @route   GET /api/events/:id
 * @desc    Get single event by ID
 * @access  Public
 */
router.get('/:id', eventsController.getEventById);

/**
 * @route   POST /api/events/email-capture
 * @desc    Capture email when user clicks "Get Tickets"
 * @access  Public
 */
router.post('/email-capture', eventsController.captureEmail);

module.exports = router;