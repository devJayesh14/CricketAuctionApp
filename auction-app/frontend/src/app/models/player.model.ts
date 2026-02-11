/**
 * Player Model
 * Defines the structure for player data in the frontend
 */
export interface AuctionPlayer {
  _id: string;
  name: string;
  role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';
  basePrice: number;
  profileImage?: string;
  description?: string;
  statistics?: PlayerStatistics;
  tournament: string;
  status: 'AVAILABLE' | 'SOLD' | 'IN_AUCTION';
  soldTo?: string;
  soldPrice: number;
  soldAt?: string;
  auctionOrder: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerStatistics {
  age?: number;
  matches?: number;
  totalRuns?: number;
  totalWickets?: number;
  average?: number;
  economy?: number;
  strikeRate?: number;
  bowlingAverage?: number;
}

export type SoldPlayer = Omit<AuctionPlayer, 'soldTo'> & {
  soldTo: {
    _id: string;
    team: {
      _id: string;
      name: string;
      code: string;
    };
    captain: {
      _id: string;
      username: string;
      profile?: {
        firstName?: string;
        lastName?: string;
      };
    };
  };
};

export interface PlayerFormData {
  name: string;
  role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';
  basePrice: number;
  profileImage?: string;
  description?: string;
  statistics?: PlayerStatistics;
  tournament: string;
  auctionOrder?: number;
}
