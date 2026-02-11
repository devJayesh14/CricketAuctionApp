const mongoose = require('mongoose');

const auctionStateSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    unique: true
  },
  currentPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AuctionPlayer',
    default: null
  },
  currentPlayerIndex: {
    type: Number,
    default: -1
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
  bidTimerSeconds: {
    type: Number,
    default: 20
  },
  isAuctionActive: {
    type: Boolean,
    default: false
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  totalPlayers: {
    type: Number,
    default: 0
  },
  soldPlayers: {
    type: Number,
    default: 0
  },
  lastBidTime: {
    type: Date,
    default: null
  },
  auctionStartTime: {
    type: Date,
    default: null
  },
  auctionEndTime: {
    type: Date,
    default: null
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

module.exports = mongoose.model('AuctionState', auctionStateSchema);
