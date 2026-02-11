const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * AUTH MIDDLEWARE
 * Verifies JWT and attaches user to req
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'User account is inactive.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * SUPER ADMIN ONLY
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Access denied. Super Admin role required.'
    });
  }

  next();
};

/**
 * CAPTAIN OR SUPER ADMIN
 */
const isCaptain = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (!['CAPTAIN_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Access denied. Captain Admin role required.'
    });
  }

  next();
};

/**
 * PLAYER VIEW-ONLY ACCESS
 * (used for viewing tournaments / live auction)
 */
const isPlayer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (!['PLAYER', 'CAPTAIN_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  next();
};

module.exports = {
  auth,
  isSuperAdmin,
  isCaptain,
  isPlayer
};
