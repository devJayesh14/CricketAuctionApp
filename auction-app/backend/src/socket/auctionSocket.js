const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const TournamentTeam = require('../models/TournamentTeam');
const AuctionEngine = require('../services/auctionEngine');
const { ROLES, SOCKET_EVENTS, ERROR_MESSAGES } = require('../utils/constants');

let io;
let auctionEngine;

const init = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:8100",
      methods: ["GET", "POST"]
    }
  });

  // Initialize auction engine with socket instance
  auctionEngine = new AuctionEngine(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.user.role})`);

    // Join tournament room
    socket.on(SOCKET_EVENTS.JOIN_TOURNAMENT, async (tournamentId) => {
      try {
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Tournament not found' });
          return;
        }

        // Check access permissions
        if (socket.user.role === ROLES.CAPTAIN_ADMIN) {
          const tournamentTeam = await TournamentTeam.findOne({
            tournament: tournamentId,
            captain: socket.user._id
          });

          if (!tournamentTeam) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Access denied to this tournament' });
            return;
          }
        }

        socket.join(`tournament-${tournamentId}`);
        socket.currentTournament = tournamentId;

        // Send current auction state
        const auctionState = await auctionEngine.getPopulatedAuctionState(tournamentId);
        socket.emit(SOCKET_EVENTS.AUCTION_STATE, auctionState);
        
        console.log(`${socket.user.username} joined tournament ${tournamentId}`);
      } catch (error) {
        console.error('Join tournament error:', error);
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to join tournament' });
      }
    });

    // Leave tournament room
    socket.on(SOCKET_EVENTS.LEAVE_TOURNAMENT, (tournamentId) => {
      socket.leave(`tournament-${tournamentId}`);
      socket.currentTournament = null;
      console.log(`${socket.user.username} left tournament ${tournamentId}`);
    });

    // Start auction (Super Admin only)
    socket.on(SOCKET_EVENTS.AUCTION_START, async (tournamentId) => {
      try {
        if (socket.user.role !== ROLES.SUPER_ADMIN) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: ERROR_MESSAGES.ACCESS_DENIED });
          return;
        }

        const auctionState = await auctionEngine.startAuction(tournamentId);
        
        socket.emit(SOCKET_EVENTS.AUCTION_STARTED, {
          message: 'Auction started successfully',
          auctionState
        });

      } catch (error) {
        console.error('Start auction error:', error);
        socket.emit(SOCKET_EVENTS.ERROR, { 
          message: error.message || ERROR_MESSAGES.INTERNAL_ERROR 
        });
      }
    });

    // Place bid (Captain Admin or Super Admin only)
    socket.on(SOCKET_EVENTS.BID_PLACED, async (data) => {
      try {
        const { tournamentId, amount } = data;

        if (![ROLES.CAPTAIN_ADMIN, ROLES.SUPER_ADMIN].includes(socket.user.role)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: ERROR_MESSAGES.ACCESS_DENIED });
          return;
        }

        const auctionState = await auctionEngine.placeBid(
          tournamentId, 
          socket.user._id, 
          amount
        );

        // Socket.IO events are emitted from the auction engine
        // No need to emit here as the engine handles it

      } catch (error) {
        console.error('Bid error:', error);
        socket.emit(SOCKET_EVENTS.BID_FAILED, { 
          message: error.message || ERROR_MESSAGES.INTERNAL_ERROR 
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username}`);
    });
  });

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    if (auctionEngine) {
      auctionEngine.cleanup();
    }
  });

  process.on('SIGINT', () => {
    if (auctionEngine) {
      auctionEngine.cleanup();
    }
  });

  return io;
};

module.exports = {
  init,
  io: () => io,
  getAuctionEngine: () => auctionEngine
};
