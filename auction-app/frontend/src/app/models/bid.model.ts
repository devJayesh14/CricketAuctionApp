/**
 * Bid Model
 * Defines the structure for bid data in the frontend
 */
import { AuctionPlayer } from './player.model';

export interface AuctionState {
  _id?: string;
  tournament: string;
  currentPlayer?: AuctionPlayer;
  currentPlayerIndex: number;
  currentBid: number;
  currentBidder?: {
    _id: string;
    team: {
      _id: string;
      name: string;
      code: string;
    };
  };
  timerEndsAt?: string;
  bidTimerSeconds: number;
  isAuctionActive: boolean;
  isPaused: boolean;
  totalPlayers: number;
  soldPlayers: number;
  lastBidTime?: string;
  auctionStartTime?: string;
  auctionEndTime?: string;
}

export interface BidHistory {
  _id: string;
  tournament: string;
  player: string;
  bids: Bid[];
  finalBid?: Bid;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  bidder: string;
  amount: number;
  bidTime: string;
}

export interface BidEvent {
  bidder: {
    _id: string;
    team: {
      _id: string;
      name: string;
      code: string;
    };
  };
  amount: number;
  auctionState: AuctionState;
}

export interface PlayerSoldEvent {
  player: AuctionPlayer;
  soldPrice: number;
  soldTo: string;
}

export interface BidFormData {
  amount: number;
}

export interface QuickBidAmount {
  amount: number;
  label: string;
  color?: string;
}
