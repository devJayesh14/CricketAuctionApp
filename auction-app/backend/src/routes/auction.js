const express = require('express');
const AuctionState = require('../models/AuctionState');
const Tournament = require('../models/Tournament');
const AuctionPlayer = require('../models/AuctionPlayer');
const TournamentTeam = require('../models/TournamentTeam');
const BidHistory = require('../models/BidHistory');
const { auth } = require('../middleware/auth');
const { 
  isSuperAdmin, 
  isCaptain, 
  isPlayer, 
  canViewAuction, 
  canStartAuction, 
  canPlaceBid, 
  canAccessTournament,
  canManagePlayers,
  isTournamentCaptain 
} = require('../middleware/roles');
const { validate, schemas } = require('../middleware/validation');
const { ERROR_MESSAGES, HTTP_STATUS } = require('../utils/constants');

const router = express.Router();

router.get('/state/:tournamentId', auth, canAccessTournament, canViewAuction, async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    
    let auctionState = await AuctionState.findOne({ tournament: tournamentId })
      .populate('currentPlayer', 'name role basePrice profileImage statistics')
      .populate('currentBidder', 'team.name team.code');

    if (!auctionState) {
      const tournament = await Tournament.findById(tournamentId);
      const totalPlayers = await AuctionPlayer.countDocuments({ 
        tournament: tournamentId 
      });
      
      auctionState = new AuctionState({
        tournament: tournamentId,
        totalPlayers,
        bidTimerSeconds: tournament.perPlayerBidTimer
      });
      await auctionState.save();
    }

    // Filter data based on user role
    if (req.user.role === 'PLAYER') {
      const stateData = {
        isAuctionActive: auctionState.isAuctionActive,
        currentPlayer: auctionState.currentPlayer,
        currentBid: auctionState.currentBid,
        timerEndsAt: auctionState.timerEndsAt,
        soldPlayers: auctionState.soldPlayers,
        totalPlayers: auctionState.totalPlayers
      };
      return res.json({ auctionState: stateData });
    }

    res.json({ auctionState });
  } catch (error) {
    console.error('Get auction state error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      error: ERROR_MESSAGES.INTERNAL_ERROR 
    });
  }
});

router.post('/start/:tournamentId', auth, canAccessTournament, canStartAuction, async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;
    
    // Use auction engine to start auction
    const { getAuctionEngine } = require('../socket/auctionSocket');
    const auctionEngine = getAuctionEngine();
    
    if (!auctionEngine) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ 
        error: ERROR_MESSAGES.SERVICE_UNAVAILABLE 
      });
    }

    const auctionState = await auctionEngine.startAuction(tournamentId);
    
    res.json({
      message: 'Auction started successfully',
      auctionState
    });
  } catch (error) {
    console.error('Start auction error:', error);
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      error: error.message || ERROR_MESSAGES.INTERNAL_ERROR 
    });
  }
});

router.post('/bid/:tournamentId', auth, canAccessTournament, canPlaceBid, validate(schemas.bid), async (req, res) => {
  try {
    const { amount } = req.body;
    const tournamentId = req.params.tournamentId;

    // Use auction engine to place bid
    const { getAuctionEngine } = require('../socket/auctionSocket');
    const auctionEngine = getAuctionEngine();
    
    if (!auctionEngine) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ 
        error: ERROR_MESSAGES.SERVICE_UNAVAILABLE 
      });
    }

    const auctionState = await auctionEngine.placeBid(tournamentId, req.user._id, amount);
    
    res.json({
      message: 'Bid placed successfully',
      currentBid: amount,
      auctionState
    });
  } catch (error) {
    console.error('Place bid error:', error);
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      error: error.message || ERROR_MESSAGES.INTERNAL_ERROR 
    });
  }
});

router.get('/my-bids/:tournamentId', auth, canAccessTournament, isTournamentCaptain, async (req, res) => {
  try {
    // Use tournament team attached by middleware
    const tournamentTeam = req.tournamentTeam;
    
    if (!tournamentTeam) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ 
        error: ERROR_MESSAGES.NOT_PARTICIPATING 
      });
    }

    const populatedTeam = await TournamentTeam.findById(tournamentTeam._id)
      .populate({
        path: 'players.player',
        select: 'name role basePrice profileImage'
      });

    res.json({
      tournamentTeam: {
        team: populatedTeam.team,
        purseAmount: populatedTeam.purseAmount,
        remainingPurse: populatedTeam.remainingPurse,
        players: populatedTeam.players
      }
    });
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      error: ERROR_MESSAGES.INTERNAL_ERROR 
    });
  }
});

router.get('/sold-players/:tournamentId', auth, canAccessTournament, canManagePlayers, async (req, res) => {
  try {
    const soldPlayers = await AuctionPlayer.find({
      tournament: req.params.tournamentId,
      status: 'SOLD'
    })
    .populate('soldTo', 'team.name team.code')
    .populate('soldTo.captain', 'username profile.firstName profile.lastName')
    .sort({ soldAt: 1 });

    res.json({ soldPlayers });
  } catch (error) {
    console.error('Get sold players error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      error: ERROR_MESSAGES.INTERNAL_ERROR 
    });
  }
});

module.exports = router;
