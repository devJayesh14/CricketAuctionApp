const Joi = require('joi');

/**
 * GENERIC VALIDATION MIDDLEWARE
 */
const validate = (schema) => {
  return (req, res, next) => {
    if (!schema) {
      return res.status(500).json({
        error: 'Validation schema is missing'
      });
    }

    const { error } = schema.validate(req.body, {
      abortEarly: false
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    next();
  };
};

/**
 * ALL JOI SCHEMAS
 */
const schemas = {
  // ✅ USED IN /auth/register
  userRegistration: Joi.object({
    username: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string()
      .valid('SUPER_ADMIN', 'CAPTAIN_ADMIN', 'PLAYER')
      .default('PLAYER'),
    profile: Joi.object({
      firstName: Joi.string().max(50).optional(),
      lastName: Joi.string().max(50).optional(),
      phone: Joi.string().max(20).optional()
    }).optional()
  }),

  // ✅ USED IN /auth/login
  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Tournament creation
  tournament: Joi.object({
    name: Joi.string().max(200).required(),
    description: Joi.string().max(1000).optional(),
    totalTeams: Joi.number().integer().min(2).max(20).required(),
    initialPurseAmount: Joi.number().integer().min(1000).required(),
    auctionStartTime: Joi.date().iso().required(),
    perPlayerBidTimer: Joi.number().integer().min(10).max(120).default(20)
  }),

  // Team master
  team: Joi.object({
    name: Joi.string().max(100).required(),
    code: Joi.string().max(10).required(),
    logo: Joi.string().uri().optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    description: Joi.string().max(500).optional()
  }),

  // Auction player
  auctionPlayer: Joi.object({
    name: Joi.string().max(100).required(),
    role: Joi.string()
      .valid('Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper')
      .required(),
    basePrice: Joi.number().integer().min(100).required(),
    profileImage: Joi.string().uri().optional(),
    description: Joi.string().max(500).optional(),
    statistics: Joi.object({
      age: Joi.number().integer().min(16).max(50).optional(),
      matches: Joi.number().integer().min(0).optional(),
      totalRuns: Joi.number().integer().min(0).optional(),
      totalWickets: Joi.number().integer().min(0).optional(),
      average: Joi.number().min(0).optional(),
      economy: Joi.number().min(0).optional()
    }).optional(),
    tournament: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    auctionOrder: Joi.number().integer().min(1).required()
  }),

  // Tournament team mapping
  tournamentTeam: Joi.object({
    tournament: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    team: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    captain: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    purseAmount: Joi.number().integer().min(0).required()
  }),

  // Bidding
  bid: Joi.object({
    amount: Joi.number().integer().min(1).required()
  })
};

module.exports = {
  validate,   // ✅ IMPORTANT: name matches routes
  schemas
};
