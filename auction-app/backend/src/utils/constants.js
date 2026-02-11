/**
 * Application Constants
 * Centralized constants for roles, statuses, and events
 */

// User Roles
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CAPTAIN_ADMIN: 'CAPTAIN_ADMIN',
  PLAYER: 'PLAYER'
};

// Tournament Status
const TOURNAMENT_STATUS = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

// Auction Status (alias for tournament status)
const AUCTION_STATUS = {
  ...TOURNAMENT_STATUS
};

// Player Status
const PLAYER_STATUS = {
  AVAILABLE: 'AVAILABLE',
  IN_AUCTION: 'IN_AUCTION',
  SOLD: 'SOLD'
};

// Player Roles
const PLAYER_ROLES = {
  BATSMAN: 'Batsman',
  BOWLER: 'Bowler',
  ALL_ROUNDER: 'All-Rounder',
  WICKET_KEEPER: 'Wicket-Keeper'
};

// Socket Events
const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  JOIN_TOURNAMENT: 'join-tournament',
  LEAVE_TOURNAMENT: 'leave-tournament',

  // Auction events
  AUCTION_START: 'auction:start',
  AUCTION_STARTED: 'auction:started',
  AUCTION_END: 'auction:end',
  AUCTION_ENDED: 'auction:ended',
  AUCTION_BID: 'auction:bid',
  AUCTION_TIMER: 'auction:timer',
  AUCTION_PAUSE: 'auction:pause',
  AUCTION_RESUME: 'auction:resume',

  // Player events
  NEXT_PLAYER: 'auction:next-player',
  PLAYER_SOLD: 'auction:player-sold',

  // Bidding events
  BID_PLACED: 'auction:bid-placed',
  BID_FAILED: 'auction:bid-failed',

  // Timer events
  TIMER_UPDATE: 'auction:timer-update',
  TIMER_EXPIRED: 'auction:timer-expired',

  // State events
  AUCTION_STATE: 'auction-state',
  STATE_UPDATE: 'auction:state-update'
};

// Auction Configuration
const AUCTION_CONFIG = {
  DEFAULT_BID_TIMER_SECONDS: 20,
  MIN_BID_INCREMENT: 100,
  MIN_PLAYERS_PER_TOURNAMENT: 2,
  MAX_PLAYERS_PER_TOURNAMENT: 100,
  MIN_TEAMS_PER_TOURNAMENT: 2,
  MAX_TEAMS_PER_TOURNAMENT: 20,
  DEFAULT_PURSE_AMOUNT: 10000,
  MIN_PURSE_AMOUNT: 1000,
  MAX_BID_AMOUNT: 1000000,
  PLAYER_SALE_DELAY_MS: 2000 // Delay between player sales
};

// Validation Rules
const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 100
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  TEAM_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100
  },
  TEAM_CODE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 10,
    PATTERN: /^[A-Z0-9]+$/
  },
  TOURNAMENT_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200
  },
  PLAYER_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100
  }
};

// Error Messages
const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  ACCESS_DENIED: 'Access denied',
  USER_NOT_FOUND: 'User not found',
  USER_INACTIVE: 'User account is inactive',

  // Tournament
  TOURNAMENT_NOT_FOUND: 'Tournament not found',
  TOURNAMENT_ALREADY_STARTED: 'Tournament has already started',
  TOURNAMENT_COMPLETED: 'Tournament is completed',
  INSUFFICIENT_PLAYERS: 'No players in tournament',
  INVALID_TOURNAMENT_STATE: 'Invalid tournament state for this operation',

  // Auction
  AUCTION_NOT_ACTIVE: 'Auction is not active',
  AUCTION_ALREADY_ACTIVE: 'Auction is already active',
  INVALID_BID_AMOUNT: 'Invalid bid amount',
  BID_TOO_LOW: 'Bid must be higher than current bid',
  INSUFFICIENT_PURSE: 'Insufficient purse amount',
  MINIMUM_INCREMENT: 'Minimum bid increment required',
  BID_AFTER_TIMER: 'Bidding period has ended',
  NOT_PARTICIPATING: 'Not participating in this tournament',

  // Team
  TEAM_NOT_FOUND: 'Team not found',
  TEAM_ALREADY_ASSIGNED: 'Team already assigned to tournament',
  CAPTAIN_ALREADY_ASSIGNED: 'Captain already assigned to tournament',

  // Player
  PLAYER_NOT_FOUND: 'Player not found',
  PLAYER_ALREADY_SOLD: 'Player has already been sold',
  PLAYER_IN_AUCTION: 'Player is currently in auction',
  INVALID_AUCTION_ORDER: 'Auction order already assigned',

  // General
  VALIDATION_FAILED: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database operation failed',
  NETWORK_ERROR: 'Network error occurred'
};

// Success Messages
const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Login successful',
  REGISTRATION_SUCCESS: 'Registration successful',
  LOGOUT_SUCCESS: 'Logout successful',
  PROFILE_UPDATED: 'Profile updated successfully',

  // Tournament
  TOURNAMENT_CREATED: 'Tournament created successfully',
  TOURNAMENT_UPDATED: 'Tournament updated successfully',
  TOURNAMENT_DELETED: 'Tournament deleted successfully',

  // Auction
  AUCTION_STARTED: 'Auction started successfully',
  AUCTION_ENDED: 'Auction completed successfully',
  BID_PLACED: 'Bid placed successfully',
  PLAYER_SOLD: 'Player sold successfully',

  // Team
  TEAM_CREATED: 'Team created successfully',
  TEAM_UPDATED: 'Team updated successfully',
  CAPTAIN_ASSIGNED: 'Captain assigned successfully',

  // Player
  PLAYER_CREATED: 'Player created successfully',
  PLAYER_UPDATED: 'Player updated successfully',
  PLAYER_DELETED: 'Player deleted successfully'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Database Collections
const COLLECTIONS = {
  USERS: 'users',
  TEAMS: 'teams',
  TOURNAMENTS: 'tournaments',
  TOURNAMENT_TEAMS: 'tournamentteams',
  AUCTION_PLAYERS: 'auctionplayers',
  AUCTION_STATES: 'auctionstates',
  BID_HISTORIES: 'bidhistories'
};

// Cache Keys (for Redis/memory cache)
const CACHE_KEYS = {
  AUCTION_STATE: (tournamentId) => `auction:state:${tournamentId}`,
  USER_SESSION: (userId) => `session:user:${userId}`,
  TOURNAMENT_LIST: 'tournaments:list',
  TEAM_LIST: 'teams:list'
};

// Rate Limiting
const RATE_LIMITS = {
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5 // 5 attempts per window
  },
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100 // 100 requests per window
  },
  BIDDING: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 30 // 30 bids per minute
  }
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

module.exports = {
  ROLES,
  TOURNAMENT_STATUS,
  AUCTION_STATUS,
  PLAYER_STATUS,
  PLAYER_ROLES,
  SOCKET_EVENTS,
  AUCTION_CONFIG,
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  COLLECTIONS,
  CACHE_KEYS,
  RATE_LIMITS,
  PAGINATION
};
