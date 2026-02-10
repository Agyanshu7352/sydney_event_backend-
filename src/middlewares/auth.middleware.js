
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in.'
  });
};


const isAdmin = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
  }
  
  return res.status(401).json({
    success: false,
    message: 'Authentication required.'
  });
};



const optionalAuth = (req, res, next) => {
  // User will be attached if logged in, but won't block if not
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  optionalAuth
};