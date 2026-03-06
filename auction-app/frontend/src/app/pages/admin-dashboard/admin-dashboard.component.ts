import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuctionService } from '../../services/auction.service';
import { SocketService } from '../../services/socket.service';
import { Tournament } from '../../models/tournament.model';
import { AuctionPlayer } from '../../models/player.model';
import { AuthService } from '../../services/auth.service';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, AppHeaderComponent],
  template: `
    <app-header title="Admin Dashboard"></app-header>

    <ion-content>
      <div class="header-section ion-padding">
        <h2>Super Admin Panel</h2>
        <p>Manage tournaments, teams, and oversee all auction activities</p>
      </div>

      <!-- Quick Stats -->
      <div class="stats-container ion-padding">
        <div class="stat-card">
          <ion-icon name="trophy-outline"></ion-icon>
          <h3>{{ tournaments.length }}</h3>
          <p>Tournaments</p>
        </div>
        <div class="stat-card">
          <ion-icon name="people-outline"></ion-icon>
          <h3>{{ totalPlayers }}</h3>
          <p>Total Players</p>
        </div>
        <div class="stat-card">
          <ion-icon name="play-circle-outline"></ion-icon>
          <h3>{{ activeTournaments }}</h3>
          <p>Active</p>
        </div>
      </div>

      <!-- Player Management Section -->
      <ion-card class="management-section">
        <ion-card-header>
          <ion-card-title>Player Management</ion-card-title>
          <ion-card-subtitle>Manage players and generate registration links</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <ion-button expand="block" (click)="goToPlayerManagement()" color="secondary">
            <ion-icon name="people-outline" slot="start"></ion-icon>
            Manage Players
          </ion-button>

          <ion-list class="ion-margin-top">
            <ion-item *ngFor="let tournament of tournaments" button (click)="managePlayers(tournament._id)">
              <ion-icon name="trophy-outline" slot="start"></ion-icon>
              
              <ion-label>
                <h3>{{ tournament.name }} - Players</h3>
                <p>Manage players for this tournament</p>
              </ion-label>

              <ion-buttons slot="end">
                <ion-button (click)="managePlayers(tournament._id)" fill="clear" color="secondary">
                  <ion-icon name="arrow-forward-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Tournament Management -->
      <ion-card class="management-section">
        <ion-card-header>
          <ion-card-title>Tournament Management</ion-card-title>
          <ion-card-subtitle>Create and manage tournaments</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <ion-button expand="block" (click)="createTournament()" color="primary">
            <ion-icon name="add-outline" slot="start"></ion-icon>
            Create New Tournament
          </ion-button>

          <!-- Auction Controls -->
          <div class="auction-controls ion-margin-top" *ngIf="tournaments.length > 0">
            <h4>Auction Controls</h4>
            <ion-select [(ngModel)]="selectedTournamentId" placeholder="Select Tournament" interface="popover">
              <ion-select-option *ngFor="let tournament of tournaments" [value]="tournament._id">
                {{ tournament.name }}
              </ion-select-option>
            </ion-select>
            
            <div class="control-buttons ion-margin-top">
              <ion-button (click)="startAuction()" [disabled]="!selectedTournamentId || isAuctionRunning" color="success" expand="block">
                <ion-icon name="play-outline" slot="start"></ion-icon>
                Start Auction
              </ion-button>
              
              <ion-button (click)="stopAuction()" [disabled]="!isAuctionRunning" color="danger" expand="block">
                <ion-icon name="stop-outline" slot="start"></ion-icon>
                Stop Auction
              </ion-button>
            </div>
            
            <div class="auction-status ion-margin-top" *ngIf="selectedTournamentId">
              <p><strong>Status:</strong> {{ isAuctionRunning ? 'Running' : 'Stopped' }}</p>
              <p><strong>Selected:</strong> {{ getSelectedTournamentName() }}</p>
            </div>
          </div>

          <ion-list class="ion-margin-top">
            <ion-item *ngFor="let tournament of tournaments" button (click)="editTournament(tournament)">
              <ion-icon name="trophy-outline" slot="start"></ion-icon>
              
              <ion-label>
                <h3>{{ tournament.name }}</h3>
                <p>{{ tournament.totalTeams }} Teams • {{ tournament.status }}</p>
              </ion-label>

              <ion-buttons slot="end">
                <ion-button (click)="managePlayers(tournament._id)" fill="clear">
                  <ion-icon name="people-outline"></ion-icon>
                </ion-button>
                <ion-button (click)="deleteTournament(tournament._id)" fill="clear" color="danger">
                  <ion-icon name="trash-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Recent Activity -->
      <ion-card class="activity-section">
        <ion-card-header>
          <ion-card-title>Recent Activity</ion-card-title>
        </ion-card-header>
        
        <ion-card-content>
          <div *ngIf="recentActivity.length === 0" class="empty-state">
            <p>No recent activity</p>
          </div>
          
          <ion-list *ngIf="recentActivity.length > 0">
            <ion-item *ngFor="let activity of recentActivity">
              <ion-icon [name]="activity.icon" slot="start" [color]="activity.color"></ion-icon>
              <ion-label>
                <h3>{{ activity.title }}</h3>
                <p>{{ activity.description }}</p>
              </ion-label>
              <ion-note slot="end">{{ activity.time }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>
    </ion-content>

    <!-- Tournament Modal -->
    <ion-modal [isOpen]="showTournamentModal" (willDismiss)="closeTournamentModal()">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ editingTournament ? 'Edit Tournament' : 'Create Tournament' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="closeTournamentModal()">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <form #tForm="ngForm" (ngSubmit)="saveTournament()">
            <ion-item>
              <ion-label position="stacked">Tournament Name</ion-label>
              <ion-input
                type="text"
                name="name"
                ngModel
                required
                [(ngModel)]="tournamentForm.name"
                placeholder="Enter tournament name"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Description</ion-label>
              <ion-textarea
                name="description"
                ngModel
                [(ngModel)]="tournamentForm.description"
                placeholder="Enter tournament description"
                rows="3"
              ></ion-textarea>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Number of Teams</ion-label>
              <ion-input
                type="number"
                name="totalTeams"
                ngModel
                required
                min="2"
                max="20"
                [(ngModel)]="tournamentForm.totalTeams"
                placeholder="Enter number of teams"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Initial Purse Amount</ion-label>
              <ion-input
                type="number"
                name="initialPurseAmount"
                ngModel
                required
                min="1000"
                [(ngModel)]="tournamentForm.initialPurseAmount"
                placeholder="Enter initial purse amount"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Auction Start Time</ion-label>
              <ion-datetime
                name="auctionStartTime"
                ngModel
                required
                [(ngModel)]="tournamentForm.auctionStartTime"
                presentation="date-time"
              ></ion-datetime>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Bid Timer (seconds)</ion-label>
              <ion-input
                type="number"
                name="perPlayerBidTimer"
                ngModel
                required
                min="10"
                max="120"
                [(ngModel)]="tournamentForm.perPlayerBidTimer"
                placeholder="Enter bid timer in seconds"
              ></ion-input>
            </ion-item>

            <ion-button
              expand="block"
              type="submit"
              [disabled]="!tForm.valid || isSaving"
              class="ion-margin-top"
            >
              <ion-spinner name="crescent" *ngIf="isSaving"></ion-spinner>
              <span *ngIf="!isSaving">{{ editingTournament ? 'Update' : 'Create' }} Tournament</span>
            </ion-button>
          </form>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    .header-section {
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-secondary) 100%);
      color: white;
    }

    .stats-container {
      display: flex;
      justify-content: space-around;
      gap: 1rem;
    }

    .stat-card {
      flex: 1;
      text-align: center;
      background: var(--ion-color-light);
      padding: 1.5rem 1rem;
      border-radius: 12px;
    }

    .stat-card ion-icon {
      font-size: 2.5rem;
      color: var(--ion-color-primary);
      margin-bottom: 0.5rem;
    }

    .stat-card h3 {
      margin: 0.5rem 0;
      font-size: 2rem;
      font-weight: bold;
      color: var(--ion-color-dark);
    }

    .stat-card p {
      margin: 0;
      color: var(--ion-color-medium);
    }

    .management-section, .activity-section {
      margin: 1rem;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--ion-color-medium);
    }

    .auction-controls {
      background: var(--ion-color-light);
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
    }

    .auction-controls h4 {
      margin: 0 0 1rem 0;
      color: var(--ion-color-dark);
    }

    .control-buttons {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .control-buttons ion-button {
      flex: 1;
    }

    .auction-status {
      background: var(--ion-color-primary);
      color: white;
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .auction-status p {
      margin: 0.25rem 0;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  tournaments: Tournament[] = [];
  totalPlayers: number = 0;
  activeTournaments: number = 0;
  recentActivity: any[] = [];

  showTournamentModal: boolean = false;
  editingTournament: Tournament | null = null;
  isSaving: boolean = false;

  // Auction control properties
  selectedTournamentId: string = '';
  isAuctionRunning: boolean = false;

  tournamentForm = {
    name: '',
    description: '',
    totalTeams: 8,
    initialPurseAmount: 10000,
    auctionStartTime: '',
    perPlayerBidTimer: 20
  };

  constructor(
    private auctionService: AuctionService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    try {
      const response = await this.auctionService.getTournaments().toPromise();
      this.tournaments = response?.tournaments || [];
      
      this.activeTournaments = this.tournaments.filter(t => t.status === 'IN_PROGRESS').length;
      
      this.calculateStats();
      this.generateRecentActivity();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  async calculateStats() {
    try {
      let totalPlayerCount = 0;
      for (const tournament of this.tournaments) {
        const playersResponse = await this.auctionService.getTournamentPlayers(tournament._id).toPromise();
        totalPlayerCount += playersResponse?.players?.length || 0;
      }
      this.totalPlayers = totalPlayerCount;
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  }

  generateRecentActivity() {
    this.recentActivity = this.tournaments.slice(0, 5).map(tournament => ({
      title: tournament.name,
      description: `${tournament.totalTeams} teams • ${tournament.status}`,
      icon: this.getStatusIcon(tournament.status),
      color: this.getStatusColor(tournament.status),
      time: this.formatDate(tournament?.createdAt || new Date())
    }));
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'SCHEDULED': return 'calendar-outline';
      case 'IN_PROGRESS': return 'play-circle-outline';
      case 'COMPLETED': return 'checkmark-circle-outline';
      case 'CANCELLED': return 'close-circle-outline';
      default: return 'help-circle-outline';
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

  formatDate(dateInput: string | Date): string {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return date.toLocaleDateString();
  }

  createTournament() {
    this.editingTournament = null;
    this.resetTournamentForm();
    this.showTournamentModal = true;
  }

  editTournament(tournament: Tournament) {
    this.editingTournament = tournament;
    this.tournamentForm = {
      name: tournament.name,
      description: tournament.description || '',
      totalTeams: tournament.totalTeams,
      initialPurseAmount: tournament.initialPurseAmount,
      auctionStartTime: tournament.auctionStartTime,
      perPlayerBidTimer: tournament.perPlayerBidTimer
    };
    this.showTournamentModal = true;
  }

  resetTournamentForm() {
    this.tournamentForm = {
      name: '',
      description: '',
      totalTeams: 8,
      initialPurseAmount: 10000,
      auctionStartTime: '',
      perPlayerBidTimer: 20
    };
  }

  async saveTournament() {
    this.isSaving = true;

    try {
      if (this.editingTournament) {
        await this.auctionService.updateTournament(this.editingTournament._id, this.tournamentForm).toPromise();
      } else {
        await this.auctionService.createTournament(this.tournamentForm).toPromise();
      }

      await this.loadDashboardData();
      this.closeTournamentModal();
    } catch (error: any) {
      const message = error.error?.error || 'Failed to save tournament';
      this.showAlert('Error', message);
    } finally {
      this.isSaving = false;
    }
  }

  closeTournamentModal() {
    this.showTournamentModal = false;
    this.editingTournament = null;
    this.resetTournamentForm();
  }

  async deleteTournament(tournamentId: string) {
    const alert = await this.alertController.create({
      header: 'Delete Tournament',
      message: 'Are you sure you want to delete this tournament? This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.auctionService.deleteTournament(tournamentId).toPromise();
              await this.loadDashboardData();
            } catch (error: any) {
              const message = error.error?.error || 'Failed to delete tournament';
              this.showAlert('Error', message);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  managePlayers(tournamentId: string) {
    this.router.navigate(['/manage-players', tournamentId]);
  }

  goToPlayerManagement() {
    if (this.tournaments.length > 0) {
      // Navigate to first tournament's player management if no specific tournament selected
      this.router.navigate(['/manage-players', this.tournaments[0]._id]);
    } else {
      this.showAlert('No Tournaments', 'Please create a tournament first to manage players.');
    }
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  logout() {
    this.authService.logout();
  }

  // Auction control methods
  startAuction() {
    if (!this.selectedTournamentId) return;
    
    this.socketService.connect();
    this.socketService.joinTournament(this.selectedTournamentId);
    this.socketService.startAuction(this.selectedTournamentId);
    this.isAuctionRunning = true;
    
    this.showAlert('Auction Started', `Auction for ${this.getSelectedTournamentName()} has been started.`);
  }

  stopAuction() {
    if (!this.selectedTournamentId) return;
    
    this.socketService.disconnect();
    this.isAuctionRunning = false;
    
    this.showAlert('Auction Stopped', `Auction for ${this.getSelectedTournamentName()} has been stopped.`);
  }

  getSelectedTournamentName(): string {
    const tournament = this.tournaments.find(t => t._id === this.selectedTournamentId);
    return tournament ? tournament.name : '';
  }
}
