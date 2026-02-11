const mongoose = require('mongoose');

const tournamentTeamSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  captain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  purseAmount: {
    type: Number,
    required: true,
    min: 0
  },
  remainingPurse: {
    type: Number,
    required: true,
    min: 0
  },
  players: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AuctionPlayer',
      required: true
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0
    },
    purchasedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
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

tournamentTeamSchema.index({ tournament: 1, team: 1 }, { unique: true });
tournamentTeamSchema.index({ tournament: 1, captain: 1 }, { unique: true });

module.exports = mongoose.model('TournamentTeam', tournamentTeamSchema);
