const { ROLES, ERROR_MESSAGES, HTTP_STATUS } = require('../utils/constants');

/**
 * Role-based middleware functions
 * Provides role checking utilities for route protection
 */

/**
 * Check if user has required role
 * @param {string} requiredRole - Required role
 * @returns {Function} Express middleware function
 */
const hasRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: ERROR_MESSAGES.ACCESS_DENIED,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: ERROR_MESSAGES.ACCESS_DENIED,
        message: `${requiredRole} role required`,
        currentRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Check if user has any of the specified roles
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
const hasAnyRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: ERROR_MESSAGES.ACCESS_DENIED,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: ERROR_MESSAGES.ACCESS_DENIED,
        message: `One of these roles required: ${allowedRoles.join(', ')}`,
        currentRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware to ensure user is Super Admin
 */
const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);

/**
 * Middleware to ensure user is Captain Admin or Super Admin
 */
const isCaptain = hasAnyRole([ROLES.CAPTAIN_ADMIN, ROLES.SUPER_ADMIN]);

/**
 * Middleware to ensure user is any authenticated user (Player, Captain, or Super Admin)
 */
const isPlayer = hasAnyRole([ROLES.PLAYER, ROLES.CAPTAIN_ADMIN, ROLES.SUPER_ADMIN]);

/**
 * Middleware to ensure user can participate in auction (Captain or Super Admin)
 */
const canParticipateInAuction = hasAnyRole([ROLES.CAPTAIN_ADMIN, ROLES.SUPER_ADMIN]);

/**
 * Middleware to ensure user can manage tournaments (Super Admin only)
 */
const canManageTournaments = hasRole(ROLES.SUPER_ADMIN);

/**
 * Middleware to ensure user can manage teams (Super Admin only)
 */
const canManageTeams = hasRole(ROLES.SUPER_ADMIN);

/**
 * Middleware to ensure user can manage players (Super Admin only)
 */
const canManagePlayers = hasRole(ROLES.SUPER_ADMIN);

/**
 * Middleware to ensure user can start auction (Super Admin only)
 */
const canStartAuction = hasRole(ROLES.SUPER_ADMIN);

/**
 * Middleware to ensure user can place bids (Captain Admin or Super Admin)
 */
const canPlaceBid = hasAnyRole([ROLES.CAPTAIN_ADMIN, ROLES.SUPER_ADMIN]);

/**
 * Middleware to ensure user can view auction (any authenticated user)
 */
const canViewAuction = isPlayer;

/**
 * Check if user can access specific tournament
 * This middleware checks if user has access to a specific tournament
 * based on their role and tournament participation
 */
const canAccessTournament = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: ERROR_MESSAGES.ACCESS_DENIED,
        message: 'Authentication required'
      });
    }

    const tournamentId = req.params.tournamentId || req.params.id;
    
    if (!tournamentId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_MESSAGES.VALIDATION_FAILED,
        message: 'Tournament ID required'
      });
    }

    // Super Admin can access all tournaments
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // For other roles, check tournament access
    const Tournament = require('../models/Tournament');
    const TournamentTeam = require('../models/TournamentTeam');

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_MESSAGES.TOURNAMENT_NOT_FOUND
      });
    }

    // Captain Admin can only access assigned tournaments
    if (req.user.role === ROLES.CAPTAIN_ADMIN) {
      const tournamentTeam = await TournamentTeam.findOne({
        tournament: tournamentId,
        captain: req.user._id
      });

      if (!tournamentTeam) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: ERROR_MESSAGES.ACCESS_DENIED,
          message: 'Not assigned to this tournament'
        });
      }
    }

    // Players can view scheduled tournaments
    if (req.user.role === ROLES.PLAYER) {
      if (tournament.status !== 'SCHEDULED') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: ERROR_MESSAGES.ACCESS_DENIED,
          message: 'Tournament not accessible for players'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error checking tournament access:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_MESSAGES.INTERNAL_ERROR,
      message: 'Failed to check tournament access'
    });
  }
};

/**
 * Check if user is captain of specific tournament team
 */
const isTournamentCaptain = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: ERROR_MESSAGES.ACCESS_DENIED,
        message: 'Authentication required'
      });
    }

    const tournamentId = req.params.tournamentId || req.params.id;
    
    if (!tournamentId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_MESSAGES.VALIDATION_FAILED,
        message: 'Tournament ID required'
      });
    }

    // Super Admin can bypass captain check
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    const TournamentTeam = require('../models/TournamentTeam');
    const tournamentTeam = await TournamentTeam.findOne({
      tournament: tournamentId,
      captain: req.user._id
    });

    if (!tournamentTeam) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: ERROR_MESSAGES.ACCESS_DENIED,
        message: 'Not a captain in this tournament'
      });
    }

    // Attach tournament team to request for later use
    req.tournamentTeam = tournamentTeam;
    next();
  } catch (error) {
    console.error('Error checking tournament captain:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_MESSAGES.INTERNAL_ERROR,
      message: 'Failed to check captain status'
    });
  }
};

/**
 * Check if user can bid in current auction state
 */
const canBidInAuction = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: ERROR_MESSAGES.ACCESS_DENIED,
        message: 'Authentication required'
      });
    }

    const tournamentId = req.params.tournamentId || req.params.id;
    
    if (!tournamentId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_MESSAGES.VALIDATION_FAILED,
        message: 'Tournament ID required'
      });
    }

    // Check if user can place bids
    if (![ROLES.CAPTAIN_ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: ERROR_MESSAGES.ACCESS_DENIED,
        message: 'Bidding not allowed for this role'
      });
    }

    const AuctionState = require('../models/AuctionState');
    const auctionState = await AuctionState.findOne({ tournament: tournamentId });

    if (!auctionState || !auctionState.isAuctionActive) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_MESSAGES.AUCTION_NOT_ACTIVE,
        message: 'Auction is not active'
      });
    }

    if (auctionState.isPaused) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_MESSAGES.INVALID_TOURNAMENT_STATE,
        message: 'Auction is paused'
      });
    }

    // Check if timer has expired
    if (auctionState.timerEndsAt && new Date() > new Date(auctionState.timerEndsAt)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_MESSAGES.BID_AFTER_TIMER,
        message: 'Bidding period has ended'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking bidding permissions:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_MESSAGES.INTERNAL_ERROR,
      message: 'Failed to check bidding permissions'
    });
  }
};

/**
 * Rate limiting middleware for bidding
 */
const bidRateLimit = (req, res, next) => {
  // This would typically use a rate limiting library like express-rate-limit
  // For now, we'll just pass through
  // In production, you'd want to implement proper rate limiting here
  next();
};

module.exports = {
  hasRole,
  hasAnyRole,
  isSuperAdmin,
  isCaptain,
  isPlayer,
  canParticipateInAuction,
  canManageTournaments,
  canManageTeams,
  canManagePlayers,
  canStartAuction,
  canPlaceBid,
  canViewAuction,
  canAccessTournament,
  isTournamentCaptain,
  canBidInAuction,
  bidRateLimit
};
