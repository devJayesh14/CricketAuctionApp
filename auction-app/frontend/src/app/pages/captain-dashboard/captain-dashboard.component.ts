import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuctionService } from '../../services/auction.service';
import { Tournament, TournamentTeam } from '../../models/tournament.model';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { AuctionPlayer } from '../../models/player.model';
import { BidEvent, PlayerSoldEvent } from '../../models/bid.model';

@Component({
  selector: 'app-captain-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Captain Dashboard</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="logout()" fill="clear">
            <ion-icon name="log-out-outline"></ion-icon>
          </ion-button>
          <ion-button routerLink="/tournaments" fill="clear">
            <ion-icon name="list-outline"></ion-icon>
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

      <div class="header-section ion-padding">
        <h2>Welcome, Captain!</h2>
        <p>Manage your team and participate in live auctions</p>
      </div>

      <!-- Team Overview -->
      <ion-card *ngIf="tournamentTeam" class="team-overview">
        <ion-card-header>
          <ion-card-title>{{ tournamentTeam.team?.name }}</ion-card-title>
          <ion-card-subtitle>{{ tournamentTeam.team?.code }}</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <div class="purse-info">
            <div class="purse-card">
              <h4>Total Purse</h4>
              <strong>₹{{ tournamentTeam.purseAmount.toLocaleString() }}</strong>
            </div>
            <div class="purse-card" [ngClass]="{ 'low-purse': remainingPursePercentage < 20 }">
              <h4>Remaining</h4>
              <strong>₹{{ tournamentTeam.remainingPurse.toLocaleString() }}</strong>
              <small>{{ remainingPursePercentage }}%</small>
            </div>
            <div class="purse-card">
              <h4>Spent</h4>
              <strong>₹{{ (tournamentTeam.purseAmount - tournamentTeam.remainingPurse).toLocaleString() }}</strong>
            </div>
            <div class="purse-card">
              <h4>Players</h4>
              <strong>{{ tournamentTeam.players?.length || 0 }}</strong>
            </div>
          </div>

          <div class="progress-bar">
            <div class="progress-fill" 
                 [style.width.%]="spentPercentage"
                 [ngClass]="{ 'warning': spentPercentage > 80, 'danger': spentPercentage > 95 }">
            </div>
            <span class="progress-text">{{ spentPercentage }}% Spent</span>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Live Auction Status -->
      <ion-card *ngIf="tournament" class="auction-status-card">
        <ion-card-header>
          <ion-card-title>Current Tournament</ion-card-title>
          <ion-card-subtitle>{{ tournament.name }}</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <div class="tournament-info">
            <ion-chip [color]="getStatusColor(tournament.status)">
              {{ tournament.status }}
            </ion-chip>
            <span class="detail-text">
              {{ tournament.totalTeams }} Teams • 
              {{ totalPlayers }} Players
            </span>
          </div>

          <div class="auction-progress" *ngIf="auctionState">
            <div class="progress-item">
              <span>Players Sold:</span>
              <strong>{{ auctionState.soldPlayers }} / {{ auctionState.totalPlayers }}</strong>
            </div>
            <div class="progress-item" *ngIf="auctionState.currentPlayer">
              <span>Current Player:</span>
              <strong>{{ auctionState.currentPlayer.name }}</strong>
            </div>
            <div class="progress-item" *ngIf="auctionState.currentBid > 0">
              <span>Current Bid:</span>
              <strong>₹{{ auctionState.currentBid.toLocaleString() }}</strong>
            </div>
          </div>

          <div class="action-buttons">
            <ion-button 
              *ngIf="tournament.status === 'IN_PROGRESS'" 
              [routerLink]="['/auction-live', tournament._id]" 
              expand="block" 
              color="success"
            >
              <ion-icon name="play-outline" slot="start"></ion-icon>
              Join Live Auction
            </ion-button>

            <ion-button 
              *ngIf="tournament.status === 'SCHEDULED'" 
              [routerLink]="['/auction-live', tournament._id]" 
              expand="block" 
              fill="outline"
            >
              <ion-icon name="time-outline" slot="start"></ion-icon>
              View Auction Room
            </ion-button>

            <ion-button 
              *ngIf="tournament.status === 'COMPLETED'" 
              expand="block" 
              fill="outline"
              color="medium"
              disabled
            >
              <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
              Auction Completed
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Purchased Players -->
      <ion-card *ngIf="(tournamentTeam?.players?.length || 0) > 0" class="players-section">
        <ion-card-header>
          <ion-card-title>Your Squad ({{ tournamentTeam?.players?.length || 0 }})</ion-card-title>
          <ion-card-subtitle>Total spent: ₹{{ getTotalSpent().toLocaleString() }}</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <ion-list>
            <ion-item *ngFor="let player of (tournamentTeam?.players || []); trackBy: trackByPlayerId" 
                      [ngClass]="{ 'recent-purchase': isRecentPurchase(player) }">
              <ion-avatar slot="start">
                <img *ngIf="player.player.profileImage" 
                     [src]="player.player.profileImage" 
                     [alt]="player.player.name"
                     (error)="onImageError($event)">
                <ion-icon *ngIf="!player.player.profileImage" name="person-outline"></ion-icon>
              </ion-avatar>
              
              <ion-label>
                <h3>{{ player.player.name }}</h3>
                <p>{{ player.player.role }} • Purchased for ₹{{ player.purchasePrice.toLocaleString() }}</p>
                <p class="purchase-time">{{ formatPurchaseTime(player.purchasedAt) }}</p>
              </ion-label>

              <ion-note slot="end" color="success">
                <div class="price-tag">₹{{ player.purchasePrice.toLocaleString() }}</div>
                <ion-chip *ngIf="isRecentPurchase(player)" color="warning" size="small">
                  NEW
                </ion-chip>
              </ion-note>
            </ion-item>
          </ion-list>

          <!-- Team Statistics -->
          <div class="team-stats" *ngIf="(tournamentTeam?.players?.length || 0) > 0">
            <h4>Team Composition</h4>
            <div class="role-breakdown">
              <div *ngFor="let stat of getRoleBreakdown()" class="role-stat">
                <ion-chip [color]="getPlayerRoleColor(stat.role)" size="small">
                  {{ stat.count }} {{ stat.role }}
                </ion-chip>
              </div>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Empty State -->
      <div *ngIf="!tournamentTeam?.players?.length" class="empty-state ion-padding">
        <ion-icon name="people-outline" style="font-size: 4rem; color: var(--ion-color-medium);"></ion-icon>
        <h3>No Players Purchased Yet</h3>
        <p>Join live auctions to build your team</p>
        <ion-button routerLink="/tournaments" fill="outline">
          Browse Tournaments
        </ion-button>
      </div>

      <!-- Recent Activity -->
      <ion-card *ngIf="recentActivity.length > 0" class="recent-activity">
        <ion-card-header>
          <ion-card-title>Recent Activity</ion-card-title>
        </ion-card-header>
        
        <ion-card-content>
          <ion-list>
            <ion-item *ngFor="let activity of recentActivity.slice(0, 5)" 
                      [ngClass]="{ 'success': activity.type === 'purchase', 'info': activity.type === 'bid' }">
              <ion-icon [name]="activity.icon" slot="start" [color]="activity.color"></ion-icon>
              
              <ion-label>
                <h3>{{ activity.title }}</h3>
                <p>{{ activity.description }}</p>
              </ion-label>

              <ion-note slot="end">
                <small>{{ formatTime(activity.timestamp) }}</small>
              </ion-note>
            </ion-item>
          </ion-list>
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

    .header-section {
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-secondary) 100%);
      color: white;
    }

    .team-overview, .auction-status-card, .players-section, .recent-activity {
      margin: 1rem;
    }

    .purse-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .purse-card {
      text-align: center;
      padding: 1rem;
      border-radius: 8px;
      background: var(--ion-color-light);
      position: relative;
    }

    .purse-card.low-purse {
      background: var(--ion-color-danger);
      color: white;
    }

    .purse-card h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      color: var(--ion-color-medium);
    }

    .purse-card.low-purse h4 {
      color: rgba(255, 255, 255, 0.8);
    }

    .purse-card strong {
      font-size: 1.3rem;
      color: var(--ion-color-primary);
      display: block;
    }

    .purse-card.low-purse strong {
      color: white;
    }

    .purse-card small {
      font-size: 0.7rem;
      color: var(--ion-color-medium);
    }

    .purse-card.low-purse small {
      color: rgba(255, 255, 255, 0.8);
    }

    .progress-bar {
      position: relative;
      height: 8px;
      background: var(--ion-color-light);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--ion-color-primary), var(--ion-color-secondary));
      transition: width 0.3s ease;
    }

    .progress-fill.warning {
      background: linear-gradient(90deg, var(--ion-color-warning), var(--ion-color-warning-tint));
    }

    .progress-fill.danger {
      background: linear-gradient(90deg, var(--ion-color-danger), var(--ion-color-danger-tint));
    }

    .progress-text {
      position: absolute;
      top: -20px;
      right: 0;
      font-size: 0.8rem;
      color: var(--ion-color-medium);
    }

    .tournament-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 1rem 0;
      flex-wrap: wrap;
    }

    .detail-text {
      font-size: 0.9rem;
      color: var(--ion-color-medium);
    }

    .auction-progress {
      background: var(--ion-color-light);
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
    }

    .progress-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 0.5rem 0;
    }

    .action-buttons {
      margin-top: 1rem;
    }

    .recent-purchase {
      background: linear-gradient(90deg, rgba(var(--ion-color-success-rgb), 0.1), transparent);
      animation: fadeInHighlight 2s ease-out;
    }

    @keyframes fadeInHighlight {
      0% { background: rgba(var(--ion-color-success-rgb), 0.3); }
      100% { background: rgba(var(--ion-color-success-rgb), 0.1); }
    }

    .purchase-time {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
    }

    .price-tag {
      font-weight: bold;
      color: var(--ion-color-success);
    }

    .team-stats {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--ion-color-light);
    }

    .team-stats h4 {
      margin: 0 0 1rem 0;
      color: var(--ion-color-dark);
    }

    .role-breakdown {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .role-stat {
      margin: 0;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
    }

    .recent-activity ion-item.success {
      border-left: 4px solid var(--ion-color-success);
    }

    .recent-activity ion-item.info {
      border-left: 4px solid var(--ion-color-primary);
    }

    @media (max-width: 768px) {
      .purse-info {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class CaptainDashboardComponent implements OnInit, OnDestroy {
  tournamentTeam: TournamentTeam | null = null;
  tournament: Tournament | null = null;
  auctionState: any = null;
  totalPlayers: number = 0;
  isConnected: boolean = false;

  private subscriptions: Subscription[] = [];
  recentActivity: any[] = [];

  constructor(
    private auctionService: AuctionService,
    private socketService: SocketService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initializeDashboard();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  async initializeDashboard() {
    try {
      // Connect to socket for real-time updates
      this.socketService.connect();
      
      // Set up subscriptions
      this.setupSubscriptions();

      // Load initial data
      await this.loadDashboardData();

    } catch (error) {
      console.error('Error initializing dashboard:', error);
    }
  }

  private setupSubscriptions() {
    // Connection status
    this.subscriptions.push(
      this.socketService.getConnectionStatus().subscribe(connected => {
        this.isConnected = connected;
        this.cdr.detectChanges();
      })
    );

    // Auction state updates
    this.subscriptions.push(
      this.socketService.getAuctionState().subscribe(state => {
        if (state && state.tournament === this.tournament?._id) {
          this.auctionState = state;
          this.cdr.detectChanges();
        }
      })
    );

    // Player sold events (for real-time updates)
    this.subscriptions.push(
      this.socketService.getPlayerSoldEvents().subscribe(event => {
        if (event.soldTo === this.tournamentTeam?._id) {
          // Refresh team data when we get a new player
          this.loadTeamData();
          this.addActivity({
            type: 'purchase',
            title: 'Player Purchased',
            description: `${event.player.name} added to your squad`,
            icon: 'person-add-outline',
            color: 'success',
            timestamp: new Date()
          });
        }
      })
    );

    // Bid placed events
    this.subscriptions.push(
      this.socketService.getBidPlacedEvents().subscribe(event => {
        if (event.bidder._id === this.tournamentTeam?._id) {
          this.addActivity({
            type: 'bid',
            title: 'Bid Placed',
            description: `₹${event.amount.toLocaleString()} for current player`,
            icon: 'cash-outline',
            color: 'primary',
            timestamp: new Date()
          });
        }
      })
    );
  }

  async loadDashboardData() {
    try {
      // Load tournaments
      const tournamentsResponse = await this.auctionService.getTournaments().toPromise();
      const tournaments = tournamentsResponse?.tournaments || [];

      if (tournaments.length > 0) {
        // Find the tournament where this captain is participating
        for (const tournament of tournaments) {
          try {
            const teamResponse = await this.auctionService.getMyBids(tournament._id).toPromise();
            if (teamResponse?.tournamentTeam) {
              this.tournament = tournament;
              this.tournamentTeam = teamResponse.tournamentTeam;
              
              // Load total players count
              const playersResponse = await this.auctionService.getTournamentPlayers(tournament._id).toPromise();
              this.totalPlayers = playersResponse?.players?.length || 0;
              
              // Join tournament room for real-time updates
              this.socketService.joinTournament(tournament._id);
              
              break;
            }
          } catch (error) {
            // Captain not participating in this tournament, continue
            continue;
          }
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  async loadTeamData() {
    if (!this.tournament?._id) return;
    
    try {
      const response = await this.auctionService.getMyBids(this.tournament._id).toPromise();
      this.tournamentTeam = response?.tournamentTeam || null;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  }

  get remainingPursePercentage(): number {
    if (!this.tournamentTeam) return 100;
    return Math.round((this.tournamentTeam.remainingPurse / this.tournamentTeam.purseAmount) * 100);
  }

  get spentPercentage(): number {
    if (!this.tournamentTeam) return 0;
    return Math.round(((this.tournamentTeam.purseAmount - this.tournamentTeam.remainingPurse) / this.tournamentTeam.purseAmount) * 100);
  }

  getTotalSpent(): number {
    if (!this.tournamentTeam) return 0;
    return this.tournamentTeam.purseAmount - this.tournamentTeam.remainingPurse;
  }

  trackByPlayerId(index: number, player: any): string {
    return player.player._id;
  }

  isRecentPurchase(player: any): boolean {
    const purchaseTime = new Date(player.purchasedAt);
    const now = new Date();
    const timeDiff = now.getTime() - purchaseTime.getTime();
    return timeDiff < 60000; // Less than 1 minute ago
  }

  formatPurchaseTime(purchaseTime: string): string {
    const now = new Date();
    const purchase = new Date(purchaseTime);
    const diffMs = now.getTime() - purchase.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return purchase.toLocaleDateString();
  }

  formatTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getRoleBreakdown(): Array<{ role: string; count: number }> {
    if (!this.tournamentTeam?.players) return [];
    
    const roleCount: { [key: string]: number } = {};
    
    this.tournamentTeam?.players?.forEach((p: { player: { role: string } }) => {
      const role = p.player.role;
      roleCount[role] = (roleCount[role] || 0) + 1;
    });
    
    return Object.entries(roleCount).map(([role, count]) => ({ role, count }));
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

  getStatusColor(status: string): string {
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

  addActivity(activity: any) {
    this.recentActivity.unshift(activity);
    if (this.recentActivity.length > 20) {
      this.recentActivity = this.recentActivity.slice(0, 20);
    }
    this.cdr.detectChanges();
  }

  logout() {
    this.cleanup();
    this.authService.logout();
  }

  private cleanup() {
    // Unsubscribe from all observables
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Leave tournament room
    if (this.tournament?._id) {
      this.socketService.leaveTournament(this.tournament._id);
    }
  }
}
