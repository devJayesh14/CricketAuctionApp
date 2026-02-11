import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController, LoadingController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { AuctionService } from '../../services/auction.service';
import { SocketService, TimerEvent } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { 
  AuctionState, 
  BidEvent, 
  PlayerSoldEvent, 
  QuickBidAmount 
} from '../../models/bid.model';
import { AuctionPlayer } from '../../models/player.model';
import { TournamentTeam } from '../../models/tournament.model';

@Component({
  selector: 'app-auction-live',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tournaments"></ion-back-button>
        </ion-buttons>
        <ion-title>Live Auction</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="leaveAuction()" fill="clear">
            <ion-icon name="exit-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Connection Status -->
      <div class="connection-status" 
           [ngClass]="{ 'connected': isConnected, 'disconnected': !isConnected }">
        <div class="status-indicator"></div>
        <span>{{ isConnected ? 'Connected' : 'Reconnecting...' }}</span>
      </div>

      <!-- Auction Status Bar -->
      <div class="auction-status" 
           [ngClass]="{ 'active': auctionState?.isAuctionActive, 'paused': auctionState?.isPaused }">
        <div class="status-content">
          <div class="status-indicator"></div>
          <span class="status-text">
            {{ auctionState?.isAuctionActive ? (auctionState?.isPaused ? 'PAUSED' : 'LIVE') : 'WAITING' }}
          </span>
          <span class="progress-text" *ngIf="auctionState">
            {{ auctionState.soldPlayers }} / {{ auctionState.totalPlayers }} Players
          </span>
        </div>
      </div>

      <!-- Current Player Section -->
      <ion-card *ngIf="currentPlayer" class="player-card">
        <ion-card-header>
          <ion-card-title>Current Player</ion-card-title>
          <ion-card-subtitle>Player #{{ currentPlayer.auctionOrder }}</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <div class="player-info">
            <ion-avatar class="player-avatar">
              <img *ngIf="currentPlayer.profileImage" 
                   [src]="currentPlayer.profileImage" 
                   [alt]="currentPlayer.name"
                   (error)="onImageError($event)">
              <ion-icon *ngIf="!currentPlayer.profileImage" name="person-outline"></ion-icon>
            </ion-avatar>
            
            <div class="player-details">
              <h3>{{ currentPlayer.name }}</h3>
              <ion-chip [color]="getPlayerRoleColor(currentPlayer.role)">
                {{ currentPlayer.role }}
              </ion-chip>
              
              <div class="player-stats" *ngIf="currentPlayer.statistics">
                <div class="stat-item" *ngIf="currentPlayer.statistics.age">
                  <small>Age</small>
                  <strong>{{ currentPlayer.statistics.age }}</strong>
                </div>
                <div class="stat-item" *ngIf="currentPlayer.statistics.matches">
                  <small>Matches</small>
                  <strong>{{ currentPlayer.statistics.matches }}</strong>
                </div>
                <div class="stat-item" *ngIf="currentPlayer.statistics.average">
                  <small>Avg</small>
                  <strong>{{ currentPlayer.statistics.average }}</strong>
                </div>
                <div class="stat-item" *ngIf="currentPlayer.statistics.economy">
                  <small>Econ</small>
                  <strong>{{ currentPlayer.statistics.economy }}</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="price-info">
            <div class="price-card base-price">
              <small>Base Price</small>
              <strong>₹{{ currentPlayer.basePrice.toLocaleString() }}</strong>
            </div>
            <div class="price-card current-bid">
              <small>Current Bid</small>
              <strong>₹{{ (auctionState?.currentBid || currentPlayer.basePrice).toLocaleString() }}</strong>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Timer Section -->
      <ion-card *ngIf="auctionState?.isAuctionActive && !auctionState?.isPaused" class="timer-card">
        <ion-card-content>
          <div class="timer-display">
            <div class="timer-circle" 
                 [ngClass]="{ 
                   'warning': timeLeft <= 10 && timeLeft > 5, 
                   'danger': timeLeft <= 5,
                   'expired': timeLeft === 0
                 }">
              <span class="timer-text">{{ timeLeft }}</span>
              <small class="timer-label">SEC</small>
            </div>
            <div class="timer-info">
              <h4>Time Remaining</h4>
              <p *ngIf="currentBidder" class="last-bid-info">
                Last bid by <strong>{{ currentBidder.team?.name }}</strong>
              </p>
              <p *ngIf="!currentBidder" class="no-bid-info">
                No bids yet
              </p>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Bidding Controls -->
      <div *ngIf="canBid && auctionState?.isAuctionActive && !auctionState?.isPaused" class="bidding-controls">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Place Your Bid</ion-card-title>
            <ion-card-subtitle>Remaining Purse: ₹{{ remainingPurse.toLocaleString() }}</ion-card-subtitle>
          </ion-card-header>
          
          <ion-card-content>
            <form (ngSubmit)="placeBid()">
              <ion-item>
                <ion-label position="stacked">Bid Amount</ion-label>
                <ion-input
                  type="number"
                  [(ngModel)]="bidAmount"
                  name="bidAmount"
                  [min]="minBid"
                  [max]="remainingPurse"
                  placeholder="Enter bid amount"
                ></ion-input>
              </ion-item>

              <div class="quick-bids">
                <ion-chip *ngFor="let quickBid of quickBidAmounts" 
                          (click)="setQuickBid(quickBid.amount)"
                          [disabled]="quickBid.amount > remainingPurse || quickBid.amount < minBid"
                          [color]="quickBid.color">
                  +₹{{ quickBid.amount.toLocaleString() }}
                </ion-chip>
              </div>

              <ion-button
                expand="block"
                type="submit"
                [disabled]="!bidAmount || bidAmount <= minBid || bidAmount > remainingPurse || isPlacingBid || timeLeft === 0"
                class="ion-margin-top"
                color="success"
              >
                <ion-spinner name="crescent" *ngIf="isPlacingBid"></ion-spinner>
                <span *ngIf="!isPlacingBid">Place Bid</span>
              </ion-button>
            </form>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Admin Controls -->
      <div *ngIf="authService.isSuperAdmin" class="admin-controls">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Auction Controls</ion-card-title>
          </ion-card-header>
          
          <ion-card-content>
            <ion-button
              expand="block"
              *ngIf="!auctionState?.isAuctionActive"
              (click)="startAuction()"
              color="success"
              [disabled]="isLoading"
            >
              <ion-spinner name="crescent" *ngIf="isLoading"></ion-spinner>
              <ion-icon name="play-outline" slot="start" *ngIf="!isLoading"></ion-icon>
              <span *ngIf="!isLoading">Start Auction</span>
            </ion-button>

            <div class="auction-stats">
              <div class="stat-row">
                <span>Players Sold:</span>
                <strong>{{ auctionState?.soldPlayers || 0 }} / {{ auctionState?.totalPlayers || 0 }}</strong>
              </div>
              <div class="stat-row">
                <span>Status:</span>
                <strong>
                  {{ auctionState?.isAuctionActive ? 'In Progress' : 'Not Started' }}
                </strong>
              </div>
              <div class="stat-row" *ngIf="tournament">
                <span>Tournament:</span>
                <strong>{{ tournament.name }}</strong>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- View Only Message -->
      <div *ngIf="!canBid && authService.currentUser?.role === 'PLAYER'" class="view-only">
        <ion-card>
          <ion-card-content>
            <h3>
              <ion-icon name="eye-outline"></ion-icon>
              View Only Mode
            </h3>
            <p>You are watching this auction as a viewer. Only captains can participate in bidding.</p>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Bid History -->
      <ion-card *ngIf="recentBids.length > 0" class="bid-history">
        <ion-card-header>
          <ion-card-title>Recent Bids</ion-card-title>
        </ion-card-header>
        
        <ion-card-content>
          <div class="bid-list">
            <div *ngFor="let bid of recentBids.slice().reverse()" class="bid-item">
              <span class="bid-team">{{ bid.bidder.team?.name }}</span>
              <span class="bid-amount">₹{{ bid.amount.toLocaleString() }}</span>
            </div>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styles: [`
    .connection-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      font-weight: bold;
    }

    .connection-status.connected {
      background: var(--ion-color-success);
      color: white;
    }

    .connection-status.disconnected {
      background: var(--ion-color-warning);
      color: white;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .auction-status {
      padding: 1rem;
      background: var(--ion-color-light);
      border-bottom: 1px solid var(--ion-color-light-shade);
    }

    .auction-status.active {
      background: linear-gradient(90deg, var(--ion-color-success), var(--ion-color-success-tint));
      color: white;
    }

    .auction-status.paused {
      background: linear-gradient(90deg, var(--ion-color-warning), var(--ion-color-warning-tint));
      color: white;
    }

    .status-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .status-text {
      font-weight: bold;
      font-size: 1.1rem;
    }

    .player-card {
      margin: 1rem;
    }

    .player-info {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .player-avatar {
      width: 80px;
      height: 80px;
      flex-shrink: 0;
    }

    .player-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .player-details h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
      font-weight: bold;
    }

    .player-stats {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
      flex-wrap: wrap;
    }

    .stat-item {
      text-align: center;
      min-width: 50px;
    }

    .stat-item small {
      display: block;
      color: var(--ion-color-medium);
      font-size: 0.7rem;
    }

    .stat-item strong {
      display: block;
      font-size: 0.9rem;
    }

    .price-info {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }

    .price-card {
      flex: 1;
      text-align: center;
      padding: 1rem;
      border-radius: 8px;
      background: var(--ion-color-light);
    }

    .price-card.current-bid {
      background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-primary-tint));
      color: white;
    }

    .price-card small {
      display: block;
      font-size: 0.8rem;
      margin-bottom: 0.25rem;
    }

    .price-card strong {
      font-size: 1.5rem;
      font-weight: bold;
    }

    .timer-card {
      margin: 1rem;
    }

    .timer-display {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .timer-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: var(--ion-color-success);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      position: relative;
      flex-shrink: 0;
    }

    .timer-circle.warning {
      background: var(--ion-color-warning);
      animation: pulse 1s infinite;
    }

    .timer-circle.danger {
      background: var(--ion-color-danger);
      animation: pulse 0.5s infinite;
    }

    .timer-circle.expired {
      background: var(--ion-color-medium);
      animation: none;
    }

    .timer-text {
      font-size: 2.5rem;
      line-height: 1;
    }

    .timer-label {
      font-size: 0.6rem;
      position: absolute;
      bottom: 8px;
    }

    .timer-info h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }

    .last-bid-info, .no-bid-info {
      margin: 0;
      color: var(--ion-color-medium);
    }

    .bidding-controls, .admin-controls, .view-only {
      margin: 1rem;
    }

    .quick-bids {
      display: flex;
      gap: 0.5rem;
      margin: 1rem 0;
      flex-wrap: wrap;
    }

    .auction-stats {
      background: var(--ion-color-light);
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 0.5rem 0;
    }

    .bid-history {
      margin: 1rem;
    }

    .bid-list {
      max-height: 200px;
      overflow-y: auto;
    }

    .bid-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      border-bottom: 1px solid var(--ion-color-light);
    }

    .bid-item:last-child {
      border-bottom: none;
    }

    .bid-team {
      font-weight: 500;
    }

    .bid-amount {
      font-weight: bold;
      color: var(--ion-color-primary);
    }

    @media (max-width: 768px) {
      .player-info {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .timer-display {
        flex-direction: column;
        text-align: center;
      }

      .price-info {
        flex-direction: column;
      }
    }
  `]
})
export class AuctionLiveComponent implements OnInit, OnDestroy {
  tournamentId: string = '';
  auctionState: AuctionState | null = null;
  currentPlayer: AuctionPlayer | null = null;
  currentBidder: any = null;
  tournament: any = null;
  tournamentTeam: TournamentTeam | null = null;
  remainingPurse: number = 0;
  timeLeft: number = 20;
  bidAmount: number = 0;
  isPlacingBid: boolean = false;
  isLoading: boolean = false;
  isConnected: boolean = false;

  private subscriptions: Subscription[] = [];
  private timerInterval: any;
  recentBids: BidEvent[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auctionService: AuctionService,
    private socketService: SocketService,
    public authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.tournamentId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.tournamentId) {
      this.router.navigate(['/tournaments']);
      return;
    }

    this.initializeAuction();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  async initializeAuction() {
    const loading = await this.loadingController.create({
      message: 'Connecting to auction...'
    });
    await loading.present();

    try {
      // Connect to socket
      this.socketService.connect();
      
      // Join tournament room
      this.socketService.joinTournament(this.tournamentId);

      // Set up subscriptions
      this.setupSubscriptions();

      // Load initial data
      await this.loadInitialData();
      
      // Start timer updates
      this.startTimerUpdates();

    } catch (error) {
      console.error('Error initializing auction:', error);
      this.showToast('Failed to connect to auction', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  private setupSubscriptions() {
    // Auction state updates
    this.subscriptions.push(
      this.socketService.getAuctionState().subscribe(state => {
        this.auctionState = state;
        this.currentPlayer = state?.currentPlayer || null;
        this.currentBidder = state?.currentBidder || null;
        this.updateBidAmount();
        this.cdr.detectChanges();
      })
    );

    // Timer updates
    this.subscriptions.push(
      this.socketService.getTimer().subscribe(timerEvent => {
        if (timerEvent) {
          this.timeLeft = timerEvent.timeLeft;
          this.cdr.detectChanges();
        }
      })
    );

    // Connection status
    this.subscriptions.push(
      this.socketService.getConnectionStatus().subscribe(connected => {
        this.isConnected = connected;
        this.cdr.detectChanges();
      })
    );

    // Bid placed events
    this.subscriptions.push(
      this.socketService.getBidPlacedEvents().subscribe(bidEvent => {
        this.recentBids.push(bidEvent);
        if (this.recentBids.length > 10) {
          this.recentBids.shift(); // Keep only last 10 bids
        }
        this.showToast(`Bid placed: ₹${bidEvent.amount.toLocaleString()}`, 'success');
        this.cdr.detectChanges();
      })
    );

    // Player sold events
    this.subscriptions.push(
      this.socketService.getPlayerSoldEvents().subscribe(event => {
        const message = event.soldTo 
          ? `${event.player.name} sold for ₹${event.soldPrice.toLocaleString()}`
          : `${event.player.name} was not sold`;
        this.showToast(message, 'primary');
        this.cdr.detectChanges();
      })
    );

    // Auction ended events
    this.subscriptions.push(
      this.socketService.getAuctionEndedEvents().subscribe(event => {
        this.showToast(event.message, 'success');
        this.showAuctionCompleteDialog();
        this.cdr.detectChanges();
      })
    );
  }

  private async loadInitialData() {
    try {
      // Load tournament data
      const tournamentResponse = await this.auctionService.getTournament(this.tournamentId).toPromise();
      this.tournament = tournamentResponse?.tournament;

      // Load user's team data if captain
      if (this.authService.isCaptain) {
        const teamResponse = await this.auctionService.getMyBids(this.tournamentId).toPromise();
        this.tournamentTeam = teamResponse?.tournamentTeam || null;
        this.remainingPurse = this.tournamentTeam?.remainingPurse || 0;
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
      this.showToast('Failed to load auction data', 'danger');
    }
  }

  private startTimerUpdates() {
    // Update timer every second
    this.timerInterval = interval(1000).subscribe(() => {
      if (this.auctionState?.isAuctionActive && !this.auctionState?.isPaused) {
        this.timeLeft = this.socketService.getTimeLeft();
        this.cdr.detectChanges();
      }
    });
  }

  get canBid(): boolean {
    return this.socketService.canBid() && this.remainingPurse > 0;
  }

  get minBid(): number {
    return this.socketService.getMinimumBid();
  }

  get quickBidAmounts(): QuickBidAmount[] {
    const base = this.minBid;
    return [
      { amount: base + 500, label: '+500', color: 'primary' },
      { amount: base + 1000, label: '+1000', color: 'secondary' },
      { amount: base + 2000, label: '+2000', color: 'tertiary' },
      { amount: base + 5000, label: '+5000', color: 'success' }
    ].filter(bid => bid.amount <= this.remainingPurse);
  }

  setQuickBid(amount: number) {
    this.bidAmount = amount;
  }

  private updateBidAmount() {
    if (!this.bidAmount && this.auctionState) {
      this.bidAmount = this.minBid;
    }
  }

  async placeBid() {
    if (!this.bidAmount || this.bidAmount <= this.minBid || this.bidAmount > this.remainingPurse) {
      this.showToast('Invalid bid amount', 'danger');
      return;
    }

    if (this.timeLeft === 0) {
      this.showToast('Bidding time has expired', 'warning');
      return;
    }

    this.isPlacingBid = true;

    try {
      // Place bid via socket
      this.socketService.placeBid(this.tournamentId, this.bidAmount);
      
      // Reset bid amount
      this.bidAmount = this.minBid;
      
    } catch (error) {
      console.error('Error placing bid:', error);
      this.showToast('Failed to place bid', 'danger');
    } finally {
      this.isPlacingBid = false;
      this.cdr.detectChanges();
    }
  }

  async startAuction() {
    if (!this.authService.isSuperAdmin) {
      this.showToast('Access denied', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Start Auction',
      message: 'Are you sure you want to start the auction? This will begin the live bidding process.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Start',
          handler: async () => {
            this.isLoading = true;
            try {
              this.socketService.startAuction(this.tournamentId);
              this.showToast('Auction started successfully', 'success');
            } catch (error) {
              console.error('Error starting auction:', error);
              this.showToast('Failed to start auction', 'danger');
            } finally {
              this.isLoading = false;
              this.cdr.detectChanges();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async leaveAuction() {
    const alert = await this.alertController.create({
      header: 'Leave Auction',
      message: 'Are you sure you want to leave this auction?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Leave',
          handler: () => {
            this.cleanup();
            this.router.navigate(['/tournaments']);
          }
        }
      ]
    });

    await alert.present();
  }

  private async showAuctionCompleteDialog() {
    const alert = await this.alertController.create({
      header: 'Auction Complete',
      message: 'The auction has been completed successfully!',
      buttons: [
        {
          text: 'View Results',
          handler: () => {
            this.router.navigate(['/tournaments']);
          }
        }
      ]
    });

    await alert.present();
  }

  getPlayerRoleColor(role: string): string {
    switch (role) {
      case 'Batsman': return 'primary';
      case 'Bowler': return 'secondary';
      case 'All-Rounder': return 'tertiary';
      case 'Wicket-Keeper': return 'success';
      default: return 'medium';
    }
  }

  getStatusColor(status?: string): string {
    switch (status) {
      case 'SCHEDULED': return 'primary';
      case 'IN_PROGRESS': return 'success';
      case 'COMPLETED': return 'medium';
      case 'CANCELLED': return 'danger';
      default: return 'medium';
    }
  }

  onImageError(event: any) {
    event.target.src = 'assets/images/default-player.png';
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  private cleanup() {
    // Clear timer
    if (this.timerInterval) {
      this.timerInterval.unsubscribe();
    }

    // Unsubscribe from all observables
    this.subscriptions.forEach(sub => sub.unsubscribe());

    // Leave tournament room
    this.socketService.leaveTournament(this.tournamentId);
  }
}
