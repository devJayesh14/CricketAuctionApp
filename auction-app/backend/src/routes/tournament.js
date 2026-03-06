const express = require('express');
const Tournament = require('../models/Tournament');
const TournamentTeam = require('../models/TournamentTeam');
const AuctionPlayer = require('../models/AuctionPlayer');
const { auth, isSuperAdmin, isCaptain, isPlayer } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Auction Control Routes
router.post('/:id/start-auction', auth, isSuperAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.auctionStatus === 'STARTED') {
      return res.status(400).json({ error: 'Auction already started' });
    }

    if (tournament.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Tournament already completed' });
    }

    // Update tournament status
    tournament.status = 'IN_PROGRESS';
    tournament.auctionStatus = 'STARTED';
    tournament.currentAuctionState.currentPlayerIndex = 0;
    
    await tournament.save();

    // Get first player
    const players = await AuctionPlayer.find({ tournament: tournament._id })
      .sort({ auctionOrder: 1 });
    
    if (players.length === 0) {
      return res.status(400).json({ error: 'No players in this tournament' });
    }

    const firstPlayer = players[0];
    tournament.currentAuctionState.currentPlayerId = firstPlayer._id;
    await tournament.save();

    // Update first player status
    firstPlayer.status = 'IN_AUCTION';
    await firstPlayer.save();

    res.json({
      message: 'Auction started successfully',
      tournament,
      currentPlayer: firstPlayer
    });
  } catch (error) {
    console.error('Start auction error:', error);
    res.status(500).json({ error: 'Failed to start auction' });
  }
});

router.post('/:id/pause-auction', auth, isSuperAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.auctionStatus !== 'STARTED') {
      return res.status(400).json({ error: 'Auction is not running' });
    }

    tournament.auctionStatus = 'PAUSED';
    await tournament.save();

    res.json({
      message: 'Auction paused successfully',
      tournament
    });
  } catch (error) {
    console.error('Pause auction error:', error);
    res.status(500).json({ error: 'Failed to pause auction' });
  }
});

router.post('/:id/resume-auction', auth, isSuperAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.auctionStatus !== 'PAUSED') {
      return res.status(400).json({ error: 'Auction is not paused' });
    }

    tournament.auctionStatus = 'STARTED';
    await tournament.save();

    res.json({
      message: 'Auction resumed successfully',
      tournament
    });
  } catch (error) {
    console.error('Resume auction error:', error);
    res.status(500).json({ error: 'Failed to resume auction' });
  }
});

router.post('/:id/next-player', auth, isSuperAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const players = await AuctionPlayer.find({ tournament: tournament._id })
      .sort({ auctionOrder: 1 });
    
    const currentIndex = tournament.currentAuctionState.currentPlayerIndex;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= players.length) {
      // All players auctioned
      tournament.auctionStatus = 'COMPLETED';
      tournament.status = 'COMPLETED';
      await tournament.save();
      
      return res.json({
        message: 'Auction completed - all players sold',
        tournament,
        isCompleted: true
      });
    }

    const nextPlayer = players[nextIndex];
    
    // Update current player status to AVAILABLE if not sold
    const currentPlayer = players[currentIndex];
    if (currentPlayer && currentPlayer.status === 'IN_AUCTION') {
      currentPlayer.status = 'AVAILABLE';
      await currentPlayer.save();
    }

    // Update tournament state
    tournament.currentAuctionState.currentPlayerIndex = nextIndex;
    tournament.currentAuctionState.currentPlayerId = nextPlayer._id;
    await tournament.save();

    // Update next player status
    nextPlayer.status = 'IN_AUCTION';
    await nextPlayer.save();

    res.json({
      message: 'Moved to next player successfully',
      tournament,
      currentPlayer: nextPlayer,
      nextIndex
    });
  } catch (error) {
    console.error('Next player error:', error);
    res.status(500).json({ error: 'Failed to move to next player' });
  }
});

router.get('/', auth, isPlayer, async (req, res) => {
  try {
    let tournaments;
    
    if (req.user.role === 'SUPER_ADMIN') {
      tournaments = await Tournament.find()
        .populate('createdBy', 'username email')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'CAPTAIN_ADMIN') {
      const tournamentTeams = await TournamentTeam.find({ captain: req.user._id })
        .distinct('tournament');
      tournaments = await Tournament.find({ _id: { $in: tournamentTeams } })
        .populate('createdBy', 'username email')
        .sort({ createdAt: -1 });
    } else {
      tournaments = await Tournament.find({ status: 'SCHEDULED' })
        .select('name description auctionStartTime status totalTeams')
        .sort({ auctionStartTime: 1 });
    }

    res.json({ tournaments });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

router.get('/:id', auth, isPlayer, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('createdBy', 'username email');

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (req.user.role === 'PLAYER') {
      const tournamentData = {
        name: tournament.name,
        description: tournament.description,
        auctionStartTime: tournament.auctionStartTime,
        status: tournament.status,
        totalTeams: tournament.totalTeams
      };
      return res.json({ tournament: tournamentData });
    }

    if (req.user.role === 'CAPTAIN_ADMIN') {
      const tournamentTeam = await TournamentTeam.findOne({
        tournament: tournament._id,
        captain: req.user._id
      });
      
      if (!tournamentTeam) {
        return res.status(403).json({ error: 'Access denied to this tournament' });
      }
    }

    res.json({ tournament });
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

router.post('/', auth, isSuperAdmin, validate(schemas.tournament), async (req, res) => {
  try {
    const tournamentData = {
      ...req.body,
      createdBy: req.user._id
    };

    const tournament = new Tournament(tournamentData);
    await tournament.save();

    const populatedTournament = await Tournament.findById(tournament._id)
      .populate('createdBy', 'username email');

    res.status(201).json({
      message: 'Tournament created successfully',
      tournament: populatedTournament
    });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

router.put('/:id', auth, isSuperAdmin, validate(schemas.tournament), async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email');

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({
      message: 'Tournament updated successfully',
      tournament
    });
  } catch (error) {
    console.error('Update tournament error:', error);
    res.status(500).json({ error: 'Failed to update tournament' });
  }
});

router.delete('/:id', auth, isSuperAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.status === 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Cannot delete tournament in progress' });
    }

    await Tournament.findByIdAndDelete(req.params.id);

    res.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

router.get('/:id/teams', auth, isSuperAdmin, async (req, res) => {
  try {
    const tournamentTeams = await TournamentTeam.find({ tournament: req.params.id })
      .populate('team', 'name code logo color')
      .populate('captain', 'username email profile')
      .sort({ 'team.name': 1 });

    res.json({ tournamentTeams });
  } catch (error) {
    console.error('Get tournament teams error:', error);
    res.status(500).json({ error: 'Failed to fetch tournament teams' });
  }
});

router.get('/:id/players', auth, isPlayer, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    let players;
    
    if (req.user.role === 'SUPER_ADMIN') {
      players = await AuctionPlayer.find({ tournament: req.params.id })
        .populate('createdBy', 'username')
        .sort({ auctionOrder: 1 });
    } else if (req.user.role === 'CAPTAIN_ADMIN') {
      const tournamentTeam = await TournamentTeam.findOne({
        tournament: req.params.id,
        captain: req.user._id
      });
      
      if (!tournamentTeam) {
        return res.status(403).json({ error: 'Access denied to this tournament' });
      }

      players = await AuctionPlayer.find({ tournament: req.params.id })
        .select('name role basePrice profileImage status soldTo soldPrice auctionOrder')
        .sort({ auctionOrder: 1 });
    } else {
      players = await AuctionPlayer.find({ 
        tournament: req.params.id,
        status: { $in: ['AVAILABLE', 'SOLD'] }
      })
        .select('name role basePrice profileImage status soldPrice auctionOrder')
        .sort({ auctionOrder: 1 });
    }

    res.json({ players });
  } catch (error) {
    console.error('Get tournament players error:', error);
    res.status(500).json({ error: 'Failed to fetch tournament players' });
  }
});

module.exports = router;
