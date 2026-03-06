const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  totalTeams: {
    type: Number,
    required: true,
    min: 2,
    max: 20
  },
  initialPurseAmount: {
    type: Number,
    required: true,
    min: 1000,
    default: 10000
  },
  auctionStartTime: {
    type: Date,
    required: true
  },
  perPlayerBidTimer: {
    type: Number,
    required: true,
    min: 10,
    max: 120,
    default: 20
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'SCHEDULED'
  },
  auctionStatus: {
    type: String,
    enum: ['NOT_STARTED', 'STARTED', 'PAUSED', 'COMPLETED'],
    default: 'NOT_STARTED'
  },
  currentAuctionState: {
    currentPlayerIndex: {
      type: Number,
      default: -1
    },
    currentPlayerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AuctionPlayer',
      default: null
    },
    currentBid: {
      type: Number,
      default: 0
    },
    currentBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TournamentTeam',
      default: null
    },
    timerEndsAt: {
      type: Date,
      default: null
    },
    isPaused: {
      type: Boolean,
      default: false
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tournament', tournamentSchema);
