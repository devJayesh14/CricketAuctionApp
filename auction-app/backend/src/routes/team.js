const express = require('express');
const Team = require('../models/Team');
const TournamentTeam = require('../models/TournamentTeam');
const User = require('../models/User');
const { auth, isSuperAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

router.get('/', auth, isSuperAdmin, async (req, res) => {
  try {
    const teams = await Team.find({ isActive: true })
      .sort({ name: 1 });

    res.json({ teams });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

router.get('/:id', auth, isSuperAdmin, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ team });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

router.post('/', auth, isSuperAdmin, validate(schemas.team), async (req, res) => {
  try {
    const existingTeam = await Team.findOne({
      $or: [{ name: req.body.name }, { code: req.body.code }]
    });

    if (existingTeam) {
      return res.status(400).json({
        error: 'Team already exists with this name or code'
      });
    }

    const team = new Team(req.body);
    await team.save();

    res.status(201).json({
      message: 'Team created successfully',
      team
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

router.put('/:id', auth, isSuperAdmin, validate(schemas.team), async (req, res) => {
  try {
    const existingTeam = await Team.findOne({
      _id: { $ne: req.params.id },
      $or: [{ name: req.body.name }, { code: req.body.code }]
    });

    if (existingTeam) {
      return res.status(400).json({
        error: 'Team already exists with this name or code'
      });
    }

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({
      message: 'Team updated successfully',
      team
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

router.delete('/:id', auth, isSuperAdmin, async (req, res) => {
  try {
    const tournamentTeam = await TournamentTeam.findOne({ team: req.params.id });
    
    if (tournamentTeam) {
      return res.status(400).json({
        error: 'Cannot delete team assigned to tournament'
      });
    }

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: new Date() }
    );

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

router.get('/:id/tournaments', auth, isSuperAdmin, async (req, res) => {
  try {
    const tournamentTeams = await TournamentTeam.find({ team: req.params.id })
      .populate('tournament', 'name status auctionStartTime')
      .populate('captain', 'username email')
      .sort({ 'tournament.createdAt': -1 });

    res.json({ tournamentTeams });
  } catch (error) {
    console.error('Get team tournaments error:', error);
    res.status(500).json({ error: 'Failed to fetch team tournaments' });
  }
});

router.post('/assign-captain', auth, isSuperAdmin, async (req, res) => {
  try {
    const { tournament, team, captain, purseAmount } = req.body;

    if (!tournament || !team || !captain || !purseAmount) {
      return res.status(400).json({
        error: 'Tournament, team, captain, and purse amount are required'
      });
    }

    const user = await User.findById(captain);
    if (!user || user.role !== 'CAPTAIN_ADMIN') {
      return res.status(400).json({ error: 'Invalid captain or user is not a captain admin' });
    }

    const existingAssignment = await TournamentTeam.findOne({
      $or: [
        { tournament, captain },
        { tournament, team }
      ]
    });

    if (existingAssignment) {
      return res.status(400).json({
        error: 'Captain or team already assigned to this tournament'
      });
    }

    const tournamentTeam = new TournamentTeam({
      tournament,
      team,
      captain,
      purseAmount,
      remainingPurse: purseAmount
    });

    await tournamentTeam.save();

    const populatedTournamentTeam = await TournamentTeam.findById(tournamentTeam._id)
      .populate('tournament', 'name')
      .populate('team', 'name code')
      .populate('captain', 'username email');

    res.status(201).json({
      message: 'Captain assigned successfully',
      tournamentTeam: populatedTournamentTeam
    });
  } catch (error) {
    console.error('Assign captain error:', error);
    res.status(500).json({ error: 'Failed to assign captain' });
  }
});

module.exports = router;
