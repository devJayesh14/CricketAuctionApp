/**
 * Tournament Model
 * Defines the structure for tournament data in the frontend
 */
import { AuctionPlayer } from './player.model';

export interface Tournament {
  _id: string;
  name: string;
  description?: string;
  totalTeams: number;
  initialPurseAmount: number;
  auctionStartTime: string;
  perPlayerBidTimer: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'SUPER_ADMIN' | 'CAPTAIN_ADMIN' | 'PLAYER';
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export interface TournamentTeam {
  _id: string;
  tournament: string;
  team: Team;
  captain: User;
  purseAmount: number;
  remainingPurse: number;
  players: PurchasedPlayer[];
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  _id: string;
  name: string;
  code: string;
  logo?: string;
  color?: string;
  description?: string;
  isActive: boolean;
}

export interface PurchasedPlayer {
  player: AuctionPlayer;
  purchasePrice: number;
  purchasedAt: string;
}

export interface TournamentFormData {
  name: string;
  description?: string;
  totalTeams: number;
  initialPurseAmount: number;
  auctionStartTime: string;
  perPlayerBidTimer: number;
}
