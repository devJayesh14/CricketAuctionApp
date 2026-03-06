const express = require('express');
const multer = require('multer');
const AuctionPlayer = require('../models/AuctionPlayer');
const Tournament = require('../models/Tournament');
const TournamentTeam = require('../models/TournamentTeam');
const { auth, isSuperAdmin, isCaptain, isPlayer } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'), false);
    }
  }
});

// Public player registration route (no auth required) - Updated for FormData
router.post('/register', upload.single('profileImage'), async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.body.tournament);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot register players for completed tournament' });
    }

    // Auto-assign auction order for public registrations
    const lastPlayer = await AuctionPlayer.findOne({ tournament: req.body.tournament })
      .sort({ auctionOrder: -1 });
    
    const auctionOrder = lastPlayer ? lastPlayer.auctionOrder + 1 : 1;

    // Handle profile image
    let profileImage = '';
    if (req.file) {
      // Convert buffer to base64
      profileImage = req.file.buffer.toString('base64');
    }

    // Parse statistics from FormData
    console.log('Request body:', req.body);
    
    const age = parseInt(req.body['statistics[age]']);
    const statistics = {
      age: isNaN(age) ? 0 : age, // Default to 0 if invalid
      handedness: req.body['statistics[handedness]'] || 'Righty'
    };

    console.log('Parsed statistics:', statistics);

    const playerData = {
      name: req.body.name,
      role: req.body.role,
      basePrice: parseInt(req.body.basePrice) || 100,
      profileImage: profileImage,
      tournament: req.body.tournament,
      statistics: statistics,
      auctionOrder: auctionOrder
      // Removed createdBy entirely since it's optional
    };

    console.log('Player data:', playerData);

    const player = new AuctionPlayer(playerData);
    await player.save();

    const populatedPlayer = await AuctionPlayer.findById(player._id)
      .populate('tournament', 'name');

    res.status(201).json({
      message: 'Player registered successfully',
      player: populatedPlayer
    });
  } catch (error) {
    console.error('Public player registration error:', error);
    res.status(500).json({ error: 'Failed to register player' });
  }
});

// Public route to get tournament details for registration page
router.get('/tournament/:tournamentId/public', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Only allow registration for tournaments that are not completed
    if (tournament.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Registration is closed for this tournament' });
    }

    res.json({ 
      tournament: {
        _id: tournament._id,
        name: tournament.name,
        description: tournament.description,
        status: tournament.status
      }
    });
  } catch (error) {
    console.error('Get public tournament error:', error);
    res.status(500).json({ error: 'Failed to fetch tournament details' });
  }
});

router.get('/tournament/:tournamentId', auth, isPlayer, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    let players;
    
    if (req.user.role === 'SUPER_ADMIN') {
      players = await AuctionPlayer.find({ tournament: req.params.tournamentId })
        .populate('createdBy', 'username')
        .sort({ auctionOrder: 1 });
    } else if (req.user.role === 'CAPTAIN_ADMIN') {
      const tournamentTeam = await TournamentTeam.findOne({
        tournament: req.params.tournamentId,
        captain: req.user._id
      });
      
      if (!tournamentTeam) {
        return res.status(403).json({ error: 'Access denied to this tournament' });
      }

      players = await AuctionPlayer.find({ tournament: req.params.tournamentId })
        .select('name role basePrice profileImage status soldTo soldPrice auctionOrder')
        .sort({ auctionOrder: 1 });
    } else {
      players = await AuctionPlayer.find({ 
        tournament: req.params.tournamentId,
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

router.get('/:id', auth, isPlayer, async (req, res) => {
  try {
    const player = await AuctionPlayer.findById(req.params.id)
      .populate('tournament', 'name status')
      .populate('soldTo', 'team.name');

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (req.user.role === 'PLAYER') {
      const playerData = {
        name: player.name,
        role: player.role,
        basePrice: player.basePrice,
        profileImage: player.profileImage,
        description: player.description,
        statistics: player.statistics,
        status: player.status,
        soldPrice: player.soldPrice,
        auctionOrder: player.auctionOrder
      };
      return res.json({ player: playerData });
    }

    res.json({ player });
  } catch (error) {
    console.error('Get player error:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

router.post('/', auth, isSuperAdmin, validate(schemas.auctionPlayer), async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.body.tournament);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot add players to completed tournament' });
    }

    const existingPlayer = await AuctionPlayer.findOne({
      tournament: req.body.tournament,
      auctionOrder: req.body.auctionOrder
    });

    if (existingPlayer) {
      return res.status(400).json({
        error: 'Auction order already assigned to another player'
      });
    }

    const playerData = {
      ...req.body,
      createdBy: req.user._id
    };

    const player = new AuctionPlayer(playerData);
    await player.save();

    const populatedPlayer = await AuctionPlayer.findById(player._id)
      .populate('tournament', 'name')
      .populate('createdBy', 'username');

    res.status(201).json({
      message: 'Player created successfully',
      player: populatedPlayer
    });
  } catch (error) {
    console.error('Create player error:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

router.put('/:id', auth, isSuperAdmin, validate(schemas.auctionPlayer), async (req, res) => {
  try {
    const player = await AuctionPlayer.findById(req.params.id);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.status === 'SOLD') {
      return res.status(400).json({ error: 'Cannot edit sold player' });
    }

    if (req.body.auctionOrder && req.body.auctionOrder !== player.auctionOrder) {
      const existingPlayer = await AuctionPlayer.findOne({
        _id: { $ne: req.params.id },
        tournament: player.tournament,
        auctionOrder: req.body.auctionOrder
      });

      if (existingPlayer) {
        return res.status(400).json({
          error: 'Auction order already assigned to another player'
        });
      }
    }

    const updatedPlayer = await AuctionPlayer.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('tournament', 'name')
     .populate('createdBy', 'username');

    res.json({
      message: 'Player updated successfully',
      player: updatedPlayer
    });
  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

router.delete('/:id', auth, isSuperAdmin, async (req, res) => {
  try {
    const player = await AuctionPlayer.findById(req.params.id);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.status === 'SOLD') {
      return res.status(400).json({ error: 'Cannot delete sold player' });
    }

    await AuctionPlayer.findByIdAndDelete(req.params.id);

    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Delete player error:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

router.get('/tournament/:tournamentId/available-orders', auth, isSuperAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const usedOrders = await AuctionPlayer.find({ tournament: req.params.tournamentId })
      .distinct('auctionOrder');

    const maxOrder = 100;
    const availableOrders = [];
    
    for (let i = 1; i <= maxOrder; i++) {
      if (!usedOrders.includes(i)) {
        availableOrders.push(i);
      }
    }

    res.json({ availableOrders });
  } catch (error) {
    console.error('Get available orders error:', error);
    res.status(500).json({ error: 'Failed to fetch available orders' });
  }
});

module.exports = router;
