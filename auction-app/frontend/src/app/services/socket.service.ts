import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { AuctionState, BidEvent, PlayerSoldEvent } from '../models/bid.model';
import { AuctionPlayer } from '../models/player.model';

export interface AuctionStatusEvent {
  tournamentId: string;
  isActive: boolean;
  isPaused: boolean;
  currentPlayerIndex: number;
  totalPlayers: number;
  soldPlayers: number;
  currentBid: number;
  timerEndsAt?: string;
}

export interface TimerEvent {
  tournamentId: string;
  timerEndsAt: string;
  duration: number;
  timeLeft: number;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private auctionStateSubject = new BehaviorSubject<AuctionState | null>(null);
  public auctionState$ = this.auctionStateSubject.asObservable();

  private timerSubject = new BehaviorSubject<TimerEvent | null>(null);
  public timer$ = this.timerSubject.asObservable();

  private auctionStatusSubject = new BehaviorSubject<AuctionStatusEvent | null>(null);
  public auctionStatus$ = this.auctionStatusSubject.asObservable();

  private playerSoldSubject = new Subject<PlayerSoldEvent>();
  public playerSold$ = this.playerSoldSubject.asObservable();

  private bidPlacedSubject = new Subject<BidEvent>();
  public bidPlaced$ = this.bidPlacedSubject.asObservable();

  private auctionEndedSubject = new Subject<{ message: string; endedAt: string }>();
  public auctionEnded$ = this.auctionEndedSubject.asObservable();

  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private currentTournamentId: string | null = null;

  constructor(private authService: AuthService) {}

  connect(): void {
    const token = this.authService.getAuthToken();
    if (!token) {
      console.warn('No auth token available for socket connection');
      return;
    }

    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.socket = io('http://localhost:3000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to auction server');
      this.connectionStatusSubject.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from auction server:', reason);
      this.connectionStatusSubject.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionStatusSubject.next(false);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Auction state updates
    this.socket.on('auction-state', (state: AuctionState) => {
      this.auctionStateSubject.next(state);
    });

    // Auction control events
    this.socket.on('auction:started', (data: any) => {
      console.log('Auction started:', data);
      this.auctionStateSubject.next(data.auctionState);
      this.updateAuctionStatus(data.auctionState);
    });

    this.socket.on('auction:ended', (data: { message: string; endedAt: string }) => {
      console.log('Auction ended:', data);
      this.auctionEndedSubject.next(data);
      const currentState = this.auctionStateSubject.value;
      if (currentState) {
        currentState.isAuctionActive = false;
        this.auctionStateSubject.next({ ...currentState });
      }
    });

    // Player progression events
    this.socket.on('auction:next-player', (data: { player: AuctionPlayer; auctionState: AuctionState }) => {
      console.log('Next player:', data);
      this.auctionStateSubject.next(data.auctionState);
      this.updateAuctionStatus(data.auctionState);
    });

    this.socket.on('auction:player-sold', (data: PlayerSoldEvent) => {
      console.log('Player sold:', data);
      this.playerSoldSubject.next(data);
    });

    // Bidding events
    this.socket.on('auction:bid-placed', (data: BidEvent) => {
      console.log('Bid placed:', data);
      this.auctionStateSubject.next(data.auctionState);
      this.bidPlacedSubject.next(data);
      this.updateAuctionStatus(data.auctionState);
    });

    this.socket.on('auction:bid-failed', (data: { message: string }) => {
      console.error('Bid failed:', data);
      // Could emit an error event for UI to handle
    });

    // Timer events
    this.socket.on('auction:timer-update', (data: { tournamentId: string; timerEndsAt: string; duration: number }) => {
      const timeLeft = Math.max(0, Math.ceil((new Date(data.timerEndsAt).getTime() - Date.now()) / 1000));
      const timerEvent: TimerEvent = {
        tournamentId: data.tournamentId,
        timerEndsAt: data.timerEndsAt,
        duration: data.duration,
        timeLeft
      };
      this.timerSubject.next(timerEvent);
    });

    this.socket.on('auction:timer', (data: TimerEvent) => {
      this.timerSubject.next(data);
    });
  }

  private updateAuctionStatus(state: AuctionState): void {
    const status: AuctionStatusEvent = {
      tournamentId: state.tournament,
      isActive: state.isAuctionActive,
      isPaused: state.isPaused,
      currentPlayerIndex: state.currentPlayerIndex,
      totalPlayers: state.totalPlayers,
      soldPlayers: state.soldPlayers,
      currentBid: state.currentBid,
      timerEndsAt: state.timerEndsAt
    };
    this.auctionStatusSubject.next(status);
  }

  joinTournament(tournamentId: string): void {
    if (this.socket?.connected) {
      this.currentTournamentId = tournamentId;
      this.socket.emit('join-tournament', tournamentId);
      console.log(`Joined tournament: ${tournamentId}`);
    } else {
      console.warn('Socket not connected, cannot join tournament');
    }
  }

  leaveTournament(tournamentId?: string): void {
    if (this.socket?.connected) {
      const id = tournamentId || this.currentTournamentId;
      if (id) {
        this.socket.emit('leave-tournament', id);
        console.log(`Left tournament: ${id}`);
      }
    }
    this.currentTournamentId = null;
  }

  startAuction(tournamentId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('auction:start', tournamentId);
      console.log(`Starting auction for tournament: ${tournamentId}`);
    } else {
      console.warn('Socket not connected, cannot start auction');
    }
  }

  placeBid(tournamentId: string, amount: number): void {
    if (this.socket?.connected) {
      this.socket.emit('auction:bid', { tournamentId, amount });
      console.log(`Placing bid: ${amount} for tournament: ${tournamentId}`);
    } else {
      console.warn('Socket not connected, cannot place bid');
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.leaveTournament();
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatusSubject.next(false);
      console.log('Socket disconnected');
    }
  }

  // Observable getters
  getAuctionState(): Observable<AuctionState | null> {
    return this.auctionState$;
  }

  getTimer(): Observable<TimerEvent | null> {
    return this.timer$;
  }

  getAuctionStatus(): Observable<AuctionStatusEvent | null> {
    return this.auctionStatus$;
  }

  getPlayerSoldEvents(): Observable<PlayerSoldEvent> {
    return this.playerSold$;
  }

  getBidPlacedEvents(): Observable<BidEvent> {
    return this.bidPlaced$;
  }

  getAuctionEndedEvents(): Observable<{ message: string; endedAt: string }> {
    return this.auctionEnded$;
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus$;
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getCurrentTournamentId(): string | null {
    return this.currentTournamentId;
  }

  // Calculate time left from timer
  getTimeLeft(): number {
    const timerEvent = this.timerSubject.value;
    if (!timerEvent?.timerEndsAt) return 0;
    
    return Math.max(0, Math.ceil((new Date(timerEvent.timerEndsAt).getTime() - Date.now()) / 1000));
  }

  // Check if user can bid
  canBid(): boolean {
    const user = this.authService.currentUser;
    const state = this.auctionStateSubject.value;
    
    if (!user || !state) return false;
    
    // Only captains and super admins can bid
    if (!['CAPTAIN_ADMIN', 'SUPER_ADMIN'].includes(user.role)) return false;
    
    // Auction must be active and not paused
    if (!state.isAuctionActive || state.isPaused) return false;
    
    // Timer must not have expired
    if (state.timerEndsAt && new Date() > new Date(state.timerEndsAt)) return false;
    
    return true;
  }

  // Get minimum bid amount
  getMinimumBid(): number {
    const state = this.auctionStateSubject.value;
    if (!state) return 0;
    
    return state.currentBid + 100; // Minimum increment
  }
}
