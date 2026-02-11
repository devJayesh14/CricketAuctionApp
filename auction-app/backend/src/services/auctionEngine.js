const AuctionState = require('../models/AuctionState');
const Tournament = require('../models/Tournament');
const AuctionPlayer = require('../models/AuctionPlayer');
const TournamentTeam = require('../models/TournamentTeam');
const BidHistory = require('../models/BidHistory');
const { AUCTION_STATUS, ROLES, SOCKET_EVENTS } = require('../utils/constants');

/**
 * Auction Engine Service
 * Handles all auction business logic separated from socket layer
 */
class AuctionEngine {
  constructor(io) {
    this.io = io;
    this.activeTimers = new Map(); // tournamentId -> timer
  }

  /**
   * Start auction for a tournament
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} Auction state
   */
  async startAuction(tournamentId) {
    try {
      // Validate tournament
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (tournament.status !== 'SCHEDULED') {
        throw new Error('Tournament cannot be started. Current status: ' + tournament.status);
      }

      // Check if players exist
      const totalPlayers = await AuctionPlayer.countDocuments({ 
        tournament: tournamentId 
      });

      if (totalPlayers === 0) {
        throw new Error('No players in tournament. Cannot start auction.');
      }

      // Initialize or reset auction state
      let auctionState = await AuctionState.findOne({ tournament: tournamentId });
      
      if (!auctionState) {
        auctionState = new AuctionState({
          tournament: tournamentId,
          totalPlayers,
          bidTimerSeconds: tournament.perPlayerBidTimer || 20
        });
      }

      // Reset auction state
      auctionState.isAuctionActive = true;
      auctionState.isPaused = false;
      auctionState.auctionStartTime = new Date();
      auctionState.currentPlayerIndex = 0;
      auctionState.soldPlayers = 0;
      auctionState.currentBid = 0;
      auctionState.currentBidder = null;
      auctionState.currentPlayer = null;
      auctionState.lastBidTime = null;
      auctionState.auctionEndTime = null;

      await auctionState.save();

      // Update tournament status
      await Tournament.findByIdAndUpdate(tournamentId, {
        status: AUCTION_STATUS.IN_PROGRESS,
        updatedAt: new Date()
      });

      // Start with first player
      await this.startNextPlayer(tournamentId, auctionState);

      return auctionState;
    } catch (error) {
      console.error('Error starting auction:', error);
      throw error;
    }
  }

  /**
   * Start auction for the next player
   * @param {string} tournamentId - Tournament ID
   * @param {Object} auctionState - Current auction state
   */
  async startNextPlayer(tournamentId, auctionState) {
    try {
      const nextPlayerIndex = auctionState.currentPlayerIndex + 1;
      
      // Check if auction should end
      if (nextPlayerIndex >= auctionState.totalPlayers) {
        await this.endAuction(tournamentId);
        return;
      }

      // Find next player by auction order
      const nextPlayer = await AuctionPlayer.findOne({ 
        tournament: tournamentId,
        auctionOrder: nextPlayerIndex + 1 
      });

      if (!nextPlayer) {
        console.error('Next player not found for order:', nextPlayerIndex + 1);
        await this.endAuction(tournamentId);
        return;
      }

      // Reset previous player status if exists
      if (auctionState.currentPlayer) {
        await AuctionPlayer.findByIdAndUpdate(auctionState.currentPlayer, {
          status: 'AVAILABLE'
        });
      }

      // Set new player as IN_AUCTION
      await AuctionPlayer.findByIdAndUpdate(nextPlayer._id, {
        status: 'IN_AUCTION'
      });

      // Update auction state
      auctionState.currentPlayerIndex = nextPlayerIndex;
      auctionState.currentPlayer = nextPlayer._id;
      auctionState.currentBid = nextPlayer.basePrice;
      auctionState.currentBidder = null;
      auctionState.timerEndsAt = new Date(Date.now() + auctionState.bidTimerSeconds * 1000);
      auctionState.lastBidTime = null;
      
      await auctionState.save();

      // Start timer for this player
      this.startPlayerTimer(tournamentId, auctionState);

      // Emit next player event
      const populatedState = await this.getPopulatedAuctionState(tournamentId);
      this.io.to(`tournament-${tournamentId}`).emit(
        SOCKET_EVENTS.NEXT_PLAYER, 
        {
          player: nextPlayer,
          auctionState: populatedState
        }
      );

    } catch (error) {
      console.error('Error starting next player:', error);
      throw error;
    }
  }

  /**
   * Place a bid for current player
   * @param {string} tournamentId - Tournament ID
   * @param {string} captainUserId - Captain's user ID
   * @param {number} bidAmount - Bid amount
   * @returns {Promise<Object>} Updated auction state
   */
  async placeBid(tournamentId, captainUserId, bidAmount) {
    try {
      // Get auction state
      const auctionState = await AuctionState.findOne({ tournament: tournamentId });
      
      if (!auctionState || !auctionState.isAuctionActive || auctionState.isPaused) {
        throw new Error('Auction is not active');
      }

      // Validate bid amount
      if (bidAmount <= auctionState.currentBid) {
        throw new Error('Bid must be higher than current bid');
      }

      // Get captain's tournament team
      const tournamentTeam = await TournamentTeam.findOne({
        tournament: tournamentId,
        captain: captainUserId
      });

      if (!tournamentTeam) {
        throw new Error('Captain not participating in this tournament');
      }

      // Check purse balance
      if (bidAmount > tournamentTeam.remainingPurse) {
        throw new Error('Insufficient purse amount');
      }

      // Check minimum bid increment
      const minIncrement = 100;
      if ((bidAmount - auctionState.currentBid) < minIncrement) {
        throw new Error(`Minimum bid increment is ${minIncrement}`);
      }

      // Update auction state
      auctionState.currentBid = bidAmount;
      auctionState.currentBidder = tournamentTeam._id;
      auctionState.lastBidTime = new Date();
      auctionState.timerEndsAt = new Date(Date.now() + auctionState.bidTimerSeconds * 1000);
      
      await auctionState.save();

      // Update bid history
      await this.updateBidHistory(tournamentId, auctionState.currentPlayer, tournamentTeam._id, bidAmount);

      // Reset timer with new bid
      this.resetPlayerTimer(tournamentId, auctionState);

      // Emit bid placed event
      const populatedState = await this.getPopulatedAuctionState(tournamentId);
      this.io.to(`tournament-${tournamentId}`).emit(
        SOCKET_EVENTS.BID_PLACED, 
        {
          bidder: tournamentTeam,
          amount: bidAmount,
          auctionState: populatedState
        }
      );

      return populatedState;
    } catch (error) {
      console.error('Error placing bid:', error);
      throw error;
    }
  }

  /**
   * Handle timer expiry for current player
   * @param {string} tournamentId - Tournament ID
   */
  async handleTimerExpiry(tournamentId) {
    try {
      const auctionState = await AuctionState.findOne({ tournament: tournamentId });
      
      if (!auctionState || !auctionState.isAuctionActive) {
        return;
      }

      // Sell current player (or mark as available if no bids)
      await this.sellCurrentPlayer(tournamentId, auctionState);

    } catch (error) {
      console.error('Error handling timer expiry:', error);
    }
  }

  /**
   * Sell current player and move to next
   * @param {string} tournamentId - Tournament ID
   * @param {Object} auctionState - Current auction state
   */
  async sellCurrentPlayer(tournamentId, auctionState) {
    try {
      let soldPrice = 0;
      let soldTo = null;

      // If there's a bid, sell the player
      if (auctionState.currentBidder) {
        const tournamentTeam = await TournamentTeam.findById(auctionState.currentBidder);
        
        if (tournamentTeam) {
          // Add player to team
          tournamentTeam.players.push({
            player: auctionState.currentPlayer,
            purchasePrice: auctionState.currentBid,
            purchasedAt: new Date()
          });

          // Deduct from purse
          tournamentTeam.remainingPurse -= auctionState.currentBid;
          await tournamentTeam.save();

          soldPrice = auctionState.currentBid;
          soldTo = auctionState.currentBidder;

          // Update sold players count
          auctionState.soldPlayers += 1;
        }
      }

      // Update player status
      const playerUpdate = {
        status: soldTo ? 'SOLD' : 'AVAILABLE',
        soldTo: soldTo,
        soldPrice: soldPrice,
        soldAt: soldTo ? new Date() : null
      };

      await AuctionPlayer.findByIdAndUpdate(auctionState.currentPlayer, playerUpdate);
      await auctionState.save();

      // Get populated player data for event
      const soldPlayer = await AuctionPlayer.findById(auctionState.currentPlayer)
        .populate('soldTo', 'team.name team.code');

      // Emit player sold event
      this.io.to(`tournament-${tournamentId}`).emit(
        SOCKET_EVENTS.PLAYER_SOLD, 
        {
          player: soldPlayer,
          soldPrice: soldPrice,
          soldTo: soldTo
        }
      );

      // Wait 2 seconds before moving to next player
      setTimeout(() => {
        this.startNextPlayer(tournamentId, auctionState);
      }, 2000);

    } catch (error) {
      console.error('Error selling current player:', error);
    }
  }

  /**
   * End auction completely
   * @param {string} tournamentId - Tournament ID
   */
  async endAuction(tournamentId) {
    try {
      // Clear any active timer
      this.clearTimer(tournamentId);

      // Update auction state
      await AuctionState.findOneAndUpdate(
        { tournament: tournamentId },
        {
          isAuctionActive: false,
          auctionEndTime: new Date(),
          updatedAt: new Date()
        }
      );

      // Update tournament status
      await Tournament.findByIdAndUpdate(tournamentId, {
        status: AUCTION_STATUS.COMPLETED,
        updatedAt: new Date()
      });

      // Emit auction ended event
      this.io.to(`tournament-${tournamentId}`).emit(
        SOCKET_EVENTS.AUCTION_ENDED, 
        {
          message: 'Auction completed successfully',
          endedAt: new Date()
        }
      );

      console.log(`Auction ended for tournament: ${tournamentId}`);
    } catch (error) {
      console.error('Error ending auction:', error);
    }
  }

  /**
   * Start timer for current player
   * @param {string} tournamentId - Tournament ID
   * @param {Object} auctionState - Auction state
   */
  startPlayerTimer(tournamentId, auctionState) {
    this.clearTimer(tournamentId); // Clear any existing timer

    const timerDuration = auctionState.bidTimerSeconds * 1000;
    
    const timer = setTimeout(async () => {
      await this.handleTimerExpiry(tournamentId);
    }, timerDuration);

    this.activeTimers.set(tournamentId, timer);

    // Emit timer update
    this.io.to(`tournament-${tournamentId}`).emit(
      SOCKET_EVENTS.TIMER_UPDATE, 
      {
        tournamentId,
        timerEndsAt: auctionState.timerEndsAt,
        duration: auctionState.bidTimerSeconds
      }
    );
  }

  /**
   * Reset timer for current player (called after bid)
   * @param {string} tournamentId - Tournament ID
   * @param {Object} auctionState - Auction state
   */
  resetPlayerTimer(tournamentId, auctionState) {
    this.clearTimer(tournamentId);
    this.startPlayerTimer(tournamentId, auctionState);
  }

  /**
   * Clear timer for tournament
   * @param {string} tournamentId - Tournament ID
   */
  clearTimer(tournamentId) {
    const timer = this.activeTimers.get(tournamentId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(tournamentId);
    }
  }

  /**
   * Update bid history for a player
   * @param {string} tournamentId - Tournament ID
   * @param {string} playerId - Player ID
   * @param {string} bidderId - Bidder ID
   * @param {number} amount - Bid amount
   */
  async updateBidHistory(tournamentId, playerId, bidderId, amount) {
    try {
      let bidHistory = await BidHistory.findOne({
        tournament: tournamentId,
        player: playerId
      });

      if (!bidHistory) {
        bidHistory = new BidHistory({
          tournament: tournamentId,
          player: playerId,
          bids: []
        });
      }

      // Add bid to history
      bidHistory.bids.push({
        bidder: bidderId,
        amount: amount,
        bidTime: new Date()
      });

      // Update final bid
      bidHistory.finalBid = {
        bidder: bidderId,
        amount: amount,
        bidTime: new Date()
      };

      await bidHistory.save();
    } catch (error) {
      console.error('Error updating bid history:', error);
    }
  }

  /**
   * Get populated auction state with related data
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} Populated auction state
   */
  async getPopulatedAuctionState(tournamentId) {
    return await AuctionState.findOne({ tournament: tournamentId })
      .populate('currentPlayer', 'name role basePrice profileImage statistics')
      .populate('currentBidder', 'team.name team.code');
  }

  /**
   * Get auction status for monitoring
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} Auction status
   */
  async getAuctionStatus(tournamentId) {
    try {
      const auctionState = await this.getPopulatedAuctionState(tournamentId);
      const tournament = await Tournament.findById(tournamentId);

      return {
        tournament: {
          id: tournament._id,
          name: tournament.name,
          status: tournament.status
        },
        auction: {
          isActive: auctionState?.isAuctionActive || false,
          isPaused: auctionState?.isPaused || false,
          currentPlayerIndex: auctionState?.currentPlayerIndex || -1,
          totalPlayers: auctionState?.totalPlayers || 0,
          soldPlayers: auctionState?.soldPlayers || 0,
          currentBid: auctionState?.currentBid || 0,
          timerEndsAt: auctionState?.timerEndsAt
        },
        currentPlayer: auctionState?.currentPlayer,
        currentBidder: auctionState?.currentBidder
      };
    } catch (error) {
      console.error('Error getting auction status:', error);
      throw error;
    }
  }

  /**
   * Clean up resources when server shuts down
   */
  cleanup() {
    // Clear all active timers
    for (const [tournamentId, timer] of this.activeTimers) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
    console.log('Auction engine cleaned up');
  }
}

module.exports = AuctionEngine;
