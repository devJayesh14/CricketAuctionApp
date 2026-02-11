const mongoose = require('mongoose');

const auctionPlayerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  role: {
    type: String,
    required: true,
    enum: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper']
  },
  basePrice: {
    type: Number,
    required: true,
    min: 100
  },
  profileImage: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    maxlength: 500
  },
  statistics: {
    age: Number,
    matches: Number,
    totalRuns: Number,
    totalWickets: Number,
    average: Number,
    economy: Number
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'SOLD', 'IN_AUCTION'],
    default: 'AVAILABLE'
  },
  soldTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TournamentTeam',
    default: null
  },
  soldPrice: {
    type: Number,
    default: 0
  },
  soldAt: {
    type: Date,
    default: null
  },
  auctionOrder: {
    type: Number,
    required: true
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

auctionPlayerSchema.index({ tournament: 1, auctionOrder: 1 });
auctionPlayerSchema.index({ tournament: 1, status: 1 });

module.exports = mongoose.model('AuctionPlayer', auctionPlayerSchema);
