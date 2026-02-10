// Auth routes
const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user with email and password
 * @access  Public
 */
router.post('/signup', authController.signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login with email and password
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth
 * @access  Public
 */
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/google/failure',
    session: true
  }),
  authController.googleCallback
);

/**
 * @route   GET /api/auth/google/failure
 * @desc    OAuth failure redirect
 * @access  Public
 */
router.get('/google/failure', authController.googleCallbackFailure);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Protected
 */
router.get('/me', isAuthenticated, authController.getCurrentUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Protected
 */
router.post('/logout', isAuthenticated, authController.logout);

/**
 * @route   GET /api/auth/check
 * @desc    Check if user is authenticated (for frontend)
 * @access  Public
 */
router.get('/check', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({
      success: true,
      authenticated: true,
      user: req.user.toSafeObject()
    });
  }

  res.json({
    success: true,
    authenticated: false
  });
});

module.exports = router;