const express = require('express');
const Tournament = require('../models/Tournament');
const TournamentTeam = require('../models/TournamentTeam');
const AuctionPlayer = require('../models/AuctionPlayer');
const { auth, isSuperAdmin, isCaptain, isPlayer } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

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
