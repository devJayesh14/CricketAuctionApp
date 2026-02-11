const mongoose = require('mongoose');

const bidHistorySchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AuctionPlayer',
    required: true
  },
  bids: [{
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TournamentTeam',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    bidTime: {
      type: Date,
      default: Date.now
    }
  }],
  finalBid: {
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TournamentTeam',
      default: null
    },
    amount: {
      type: Number,
      default: 0
    },
    bidTime: {
      type: Date,
      default: null
    }
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

bidHistorySchema.index({ tournament: 1, player: 1 }, { unique: true });

module.exports = mongoose.model('BidHistory', bidHistorySchema);
