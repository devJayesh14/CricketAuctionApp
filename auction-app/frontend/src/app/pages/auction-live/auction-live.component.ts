import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController, LoadingController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuctionService } from '../../services/auction.service';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { AuctionPlayer } from '../../models/player.model';

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
           [ngClass]="{ 
             'active': tournament?.auctionStatus === 'STARTED', 
             'paused': tournament?.auctionStatus === 'PAUSED',
             'not-started': tournament?.auctionStatus === 'NOT_STARTED',
             'completed': tournament?.auctionStatus === 'COMPLETED'
           }">
        <div class="status-content">
          <div class="status-indicator"></div>
          <span class="status-text">
            {{ getStatusText(tournament?.auctionStatus) }}
          </span>
        </div>
      </div>

      <!-- Admin Controls -->
      <div class="admin-controls" *ngIf="authService.isSuperAdmin">
        <div class="controls-header">
          <h3>Auction Controls</h3>
        </div>
        <div class="control-buttons">
          <ion-button 
            *ngIf="tournament?.auctionStatus === 'NOT_STARTED'" 
            (click)="startAuction()" 
            color="success"
            expand="block"
          >
            <ion-icon name="play-outline" slot="start"></ion-icon>
            Start Auction
          </ion-button>
          
          <ion-button 
            *ngIf="tournament?.auctionStatus === 'STARTED'" 
            (click)="pauseAuction()" 
            color="warning"
            expand="block"
          >
            <ion-icon name="pause-outline" slot="start"></ion-icon>
            Pause Auction
          </ion-button>
          
          <ion-button 
            *ngIf="tournament?.auctionStatus === 'PAUSED'" 
            (click)="resumeAuction()" 
            color="success"
            expand="block"
          >
            <ion-icon name="play-outline" slot="start"></ion-icon>
            Resume Auction
          </ion-button>
          
          <ion-button 
            *ngIf="tournament?.auctionStatus === 'STARTED'" 
            (click)="nextPlayer()" 
            color="primary"
            expand="block"
          >
            <ion-icon name="arrow-forward-outline" slot="start"></ion-icon>
            Next Player
          </ion-button>
        </div>
      </div>

      <!-- Current Player Info -->
      <div class="current-player-section" *ngIf="currentPlayer">
        <div class="player-header">
          <h2>Current Player</h2>
        </div>
        
        <ion-card class="player-card">
          <ion-card-header>
            <div class="player-info-header">
              <div class="player-avatar">
                <img [src]="getPlayerImageUrl(currentPlayer.profileImage ?? '')" 
                     [alt]="currentPlayer.name" 
                     onerror="this.src='assets/default-avatar.png'">
              </div>
              <div class="player-details">
                <ion-card-title>{{ currentPlayer.name }}</ion-card-title>
                <ion-card-subtitle>{{ currentPlayer.role }}</ion-card-subtitle>
                <div class="player-stats">
                  <span class="stat">{{ getPlayerAge(currentPlayer) }} years</span>
                  <span class="stat">{{ currentPlayer.statistics?.handedness }}</span>
                </div>
              </div>
            </div>
          </ion-card-header>
          
          <ion-card-content>
            <div class="player-bid-info">
              <div class="base-price">
                <small>Base Price</small>
                <h3>₹{{ currentPlayer.basePrice.toLocaleString() }}</h3>
              </div>
              
              <div class="current-bid" *ngIf="currentBid">
                <small>Current Bid</small>
                <h3>₹{{ currentBid.amount.toLocaleString() }}</h3>
                <p class="bid-team">{{ getBidderTeamName(currentBid.bidder) }}</p>
              </div>
              
              <div class="no-bids" *ngIf="!currentBid && tournament?.auctionStatus === 'STARTED'">
                <small>No bids yet</small>
                <h3>₹{{ currentPlayer.basePrice.toLocaleString() }}</h3>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Waiting for auction to start -->
      <div class="waiting-section" *ngIf="!currentPlayer && tournament?.auctionStatus === 'NOT_STARTED'">
        <ion-card>
          <ion-card-content class="ion-text-center">
            <ion-icon name="time-outline" size="large" color="medium"></ion-icon>
            <h2>Auction Not Started</h2>
            <p>Waiting for the administrator to start the auction...</p>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Bid History -->
      <div class="bid-history" *ngIf="bidHistory.length > 0">
        <h3>Bid History</h3>
        <ion-list>
          <ion-item *ngFor="let bid of bidHistory.slice().reverse()">
            <div class="bid-item">
              <div class="bid-info">
                <strong>₹{{ bid.amount.toLocaleString() }}</strong>
                <span class="bid-team">{{ getBidderTeamName(bid.bidder) }}</span>
              </div>
              <div class="bid-time">
                <small>{{ formatTime(bid.timestamp) }}</small>
              </div>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  `,
  styles: [`
    .connection-status {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      background: var(--ion-color-light);
      border-bottom: 1px solid var(--ion-color-light-shade);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 8px;
    }

    .connected .status-indicator {
      background: #10b981;
    }

    .disconnected .status-indicator {
      background: #ef4444;
    }

    .auction-status {
      padding: 12px 16px;
      border-bottom: 2px solid;
    }

    .auction-status.active {
      background: #10b981;
      color: white;
      border-color: #059669;
    }

    .auction-status.paused {
      background: #f59e0b;
      color: white;
      border-color: #d97706;
    }

    .auction-status.not-started {
      background: #6b7280;
      color: white;
      border-color: #4b5563;
    }

    .auction-status.completed {
      background: #8b5cf6;
      color: white;
      border-color: #7c3aed;
    }

    .status-content {
      display: flex;
      align-items: center;
    }

    .status-text {
      font-weight: 600;
    }

    .admin-controls {
      padding: 16px;
      background: var(--ion-color-light);
      margin: 16px;
      border-radius: 8px;
    }

    .controls-header h3 {
      margin: 0 0 12px 0;
      color: var(--ion-color-dark);
    }

    .control-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .current-player-section {
      padding: 16px;
    }

    .player-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .player-header h2 {
      margin: 0;
      color: var(--ion-color-dark);
    }

    .player-card {
      margin: 0;
    }

    .player-info-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .player-avatar img {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--ion-color-primary);
    }

    .player-details {
      flex: 1;
    }

    .player-stats {
      display: flex;
      gap: 16px;
      margin-top: 8px;
    }

    .stat {
      background: var(--ion-color-light);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .player-bid-info {
      display: flex;
      justify-content: space-around;
      text-align: center;
    }

    .base-price, .current-bid, .no-bids {
      flex: 1;
    }

    .base-price h3, .current-bid h3, .no-bids h3 {
      margin: 4px 0;
      color: var(--ion-color-dark);
    }

    .current-bid h3 {
      color: var(--ion-color-primary);
    }

    .bid-team {
      margin: 4px 0 0 0;
      color: var(--ion-color-medium);
      font-size: 0.875rem;
    }

    .waiting-section {
      padding: 32px 16px;
      text-align: center;
    }

    .bid-history {
      padding: 16px;
    }

    .bid-history h3 {
      margin: 0 0 16px 0;
      color: var(--ion-color-dark);
    }

    .bid-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 8px 0;
      border-bottom: 1px solid var(--ion-color-light);
    }

    .bid-item:last-child {
      border-bottom: none;
    }

    .bid-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .bid-time {
      color: var(--ion-color-medium);
    }
  `]
})
export class AuctionLiveComponent implements OnInit, OnDestroy {
  tournamentId: string = '';
  tournament: any = null;
  currentPlayer: AuctionPlayer | null = null;
  auctionState: any = null;
  bidHistory: any[] = [];
  currentBid: any = null;
  timeLeft: number = 0;
  isConnected: boolean = false;
  isSubscribed: boolean = false;

  private subscriptions: Subscription[] = [];

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

    this.loadTournamentData();
    this.initializeSocketConnection();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private async loadTournamentData() {
    try {
      const response: any = await this.auctionService.getTournament(this.tournamentId).toPromise();
      this.tournament = response.tournament;
      
      // Load current player if auction is active
      if (this.tournament.currentAuctionState?.currentPlayerId) {
        await this.loadCurrentPlayer();
      }
      
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to load tournament:', error);
      this.showToast('Failed to load tournament data', 'danger');
    }
  }

  private async loadCurrentPlayer() {
    try {
      const response: any = await this.auctionService.getPlayer(
        this.tournament.currentAuctionState.currentPlayerId
      ).toPromise();
      this.currentPlayer = response.player;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to load current player:', error);
    }
  }

  private initializeSocketConnection() {
    this.socketService.connect();
    
    // Listen for auction events
    this.subscriptions.push(
      this.socketService.auctionState$.subscribe((state) => {
        this.auctionState = state;
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.push(
      this.socketService.bidPlaced$.subscribe((bid) => {
        this.handleBidEvent(bid);
      })
    );

    this.subscriptions.push(
      this.socketService.playerSold$.subscribe((event) => {
        this.handlePlayerSoldEvent(event);
      })
    );

    this.subscriptions.push(
      this.socketService.timer$.subscribe((event) => {
        if (event) {
          this.timeLeft = event.timeLeft;
          this.cdr.detectChanges();
        }
      })
    );

    // Join auction room
    this.socketService.joinTournament(this.tournamentId);
    this.isSubscribed = true;
  }

  private cleanup() {
    if (this.isSubscribed) {
      this.socketService.leaveTournament(this.tournamentId);
      this.isSubscribed = false;
    }
    
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.socketService.disconnect();
  }

  async leaveAuction() {
    const alert = await this.alertController.create({
      header: 'Leave Auction',
      message: 'Are you sure you want to leave the live auction?',
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

  // Auction Control Methods (Admin only)
  async startAuction() {
    const loading = await this.loadingController.create({
      message: 'Starting auction...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response: any = await this.auctionService.startAuctionControl(this.tournamentId).toPromise();
      this.tournament = response.tournament;
      this.currentPlayer = response.currentPlayer;
      
      await loading.dismiss();
      this.showToast('Auction started successfully!', 'success');
    } catch (error: any) {
      await loading.dismiss();
      this.showToast(error.error?.error || 'Failed to start auction', 'danger');
    }
  }

  async pauseAuction() {
    const loading = await this.loadingController.create({
      message: 'Pausing auction...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response: any = await this.auctionService.pauseAuctionControl(this.tournamentId).toPromise();
      this.tournament = response.tournament;
      
      await loading.dismiss();
      this.showToast('Auction paused', 'success');
    } catch (error: any) {
      await loading.dismiss();
      this.showToast(error.error?.error || 'Failed to pause auction', 'danger');
    }
  }

  async resumeAuction() {
    const loading = await this.loadingController.create({
      message: 'Resuming auction...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response: any = await this.auctionService.resumeAuctionControl(this.tournamentId).toPromise();
      this.tournament = response.tournament;
      
      await loading.dismiss();
      this.showToast('Auction resumed', 'success');
    } catch (error: any) {
      await loading.dismiss();
      this.showToast(error.error?.error || 'Failed to resume auction', 'danger');
    }
  }

  async nextPlayer() {
    const loading = await this.loadingController.create({
      message: 'Moving to next player...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response: any = await this.auctionService.nextPlayerControl(this.tournamentId).toPromise();
      this.tournament = response.tournament;
      
      if (response.isCompleted) {
        await loading.dismiss();
        const alert = await this.alertController.create({
          header: 'Auction Completed!',
          message: 'All players have been auctioned successfully!',
          buttons: ['OK']
        });
        await alert.present();
        this.router.navigate(['/tournaments']);
        return;
      }
      
      this.currentPlayer = response.currentPlayer;
      this.currentBid = null;
      this.bidHistory = [];
      
      await loading.dismiss();
      this.showToast('Moved to next player', 'success');
    } catch (error: any) {
      await loading.dismiss();
      this.showToast(error.error?.error || 'Failed to move to next player', 'danger');
    }
  }

  private handleBidEvent(bid: any) {
    this.currentBid = bid;
    this.bidHistory.push(bid);
    this.cdr.detectChanges();
  }

  private handlePlayerSoldEvent(event: any) {
    this.showToast(`${event.player?.name || 'Player'} sold to ${event.team?.name || 'team'} for ₹${event.price || 0}`, 'success');
    this.currentPlayer = null;
    this.currentBid = null;
    this.cdr.detectChanges();
  }

  // Helper Methods
  getStatusText(status: string): string {
    switch (status) {
      case 'NOT_STARTED': return 'Not Started';
      case 'STARTED': return 'Live';
      case 'PAUSED': return 'Paused';
      case 'COMPLETED': return 'Completed';
      default: return 'Unknown';
    }
  }

  getPlayerImageUrl(imageString: string): string {
    if (!imageString) {
      return 'assets/default-avatar.png';
    }
    
    // Check if it's a base64 string
    if (imageString.startsWith('data:image/') || imageString.length > 100) {
      return `data:image/jpeg;base64,${imageString}`;
    }
    
    // Check if it's already a complete URL
    if (imageString.startsWith('http')) {
      return imageString;
    }
    
    // Otherwise, treat as base64
    return `data:image/jpeg;base64,${imageString}`;
  }

  getPlayerAge(player: AuctionPlayer): string {
    return player.statistics?.age?.toString() || 'N/A';
  }

  getBidderTeamName(bidder: any): string {
    return bidder.team?.name || bidder.username || 'Unknown';
  }

  formatTime(timestamp: any): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
