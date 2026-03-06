import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AuctionService } from '../../services/auction.service';
import { AuctionPlayer, PlayerFormData } from '../../models/player.model';
import { AuthService } from '../../services/auth.service';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, AppHeaderComponent],
  template: `
    <app-header title="Player Management"></app-header>

    <ion-content>
      <!-- Tournament Info -->
      <div class="tournament-info ion-padding" *ngIf="tournament">
        <h3>{{ tournament.name }}</h3>
        <p>Manage players for this tournament</p>
      </div>

      <!-- Registration Link Section -->
      <ion-card class="registration-link-card">
        <ion-card-header>
          <ion-card-title>Player Registration Link</ion-card-title>
          <ion-card-subtitle>Share this link with players to self-register</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <div class="link-container">
            <ion-input 
              [value]="registrationLink" 
              readonly 
              class="link-input"
              placeholder="Generate registration link"
            ></ion-input>
            <ion-button 
              (click)="copyRegistrationLink()" 
              fill="clear" 
              color="primary"
              [disabled]="!registrationLink"
            >
              <ion-icon name="copy-outline"></ion-icon>
            </ion-button>
          </div>
          
          <ion-button 
            expand="block" 
            (click)="generateRegistrationLink()" 
            color="secondary"
            class="ion-margin-top"
          >
            <ion-icon name="link-outline" slot="start"></ion-icon>
            Generate New Registration Link
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Player Stats -->
      <div class="stats-container ion-padding">
        <div class="stat-card">
          <ion-icon name="people-outline"></ion-icon>
          <h3>{{ players.length }}</h3>
          <p>Total Players</p>
        </div>
        <div class="stat-card">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
          <h3>{{ availablePlayers }}</h3>
          <p>Available</p>
        </div>
        <div class="stat-card">
          <ion-icon name="cash-outline"></ion-icon>
          <h3>{{ soldPlayers }}</h3>
          <p>Sold</p>
        </div>
      </div>

      <!-- Player List -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Player List</ion-card-title>
          <ion-card-subtitle>All players in the tournament</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <ion-list>
            <ion-item *ngFor="let player of players" button (click)="editPlayer(player)">
              <ion-avatar slot="start">
                <img [src]="getPlayerImageUrl(player.profileImage || '')" [alt]="player.name" 
                     onerror="this.src='assets/default-avatar.png'">
              </ion-avatar>
              
              <ion-label>
                <h3>{{ player.name }}</h3>
                <p>{{ player.role }} • {{ getPlayerAge(player) }} years • {{ getPlayerHandedness(player) }}</p>
                <p>Base Price: ₹{{ player.basePrice.toLocaleString() }}</p>
              </ion-label>

              <div slot="end" class="player-status">
                <ion-chip [color]="getStatusColor(player.status)">
                  {{ player.status }}
                </ion-chip>
                <ion-buttons>
                  <ion-button (click)="deletePlayer(player._id)" fill="clear" color="danger">
                    <ion-icon name="trash-outline"></ion-icon>
                  </ion-button>
                </ion-buttons>
              </div>
            </ion-item>
          </ion-list>

          <div *ngIf="players.length === 0" class="empty-state">
            <ion-icon name="people-outline" size="large"></ion-icon>
            <h3>No Players Added</h3>
            <p>Start by adding players manually or sharing the registration link.</p>
            <ion-button (click)="addPlayer()" fill="clear">
              <ion-icon name="add-outline" slot="start"></ion-icon>
              Add First Player
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>

    <!-- Add/Edit Player Modal -->
    <ion-modal [isOpen]="showPlayerModal" (willDismiss)="closePlayerModal()">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ editingPlayer ? 'Edit Player' : 'Add Player' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="closePlayerModal()">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <form #pForm="ngForm" (ngSubmit)="savePlayer()">
            <ion-item>
              <ion-label position="stacked">Player Name</ion-label>
              <ion-input
                type="text"
                name="name"
                ngModel
                required
                [(ngModel)]="playerForm.name"
                placeholder="Enter player name"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Role</ion-label>
              <ion-select 
                name="role" 
                ngModel 
                required 
                [(ngModel)]="playerForm.role"
                placeholder="Select role"
              >
                <ion-select-option value="Batsman">Batsman</ion-select-option>
                <ion-select-option value="Bowler">Bowler</ion-select-option>
                <ion-select-option value="All-Rounder">All-Rounder</ion-select-option>
                <ion-select-option value="Wicket-Keeper">Wicket-Keeper</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Age</ion-label>
              <ion-input
                type="number"
                name="age"
                ngModel
                [(ngModel)]="playerForm.age"
                placeholder="Enter age"
                min="15"
                max="50"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Batting Style</ion-label>
              <ion-select 
                name="handedness" 
                ngModel 
                [(ngModel)]="playerForm.handedness"
                placeholder="Select batting style"
              >
                <ion-select-option value="Righty">Righty</ion-select-option>
                <ion-select-option value="Lefty">Lefty</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Base Price</ion-label>
              <ion-input
                type="number"
                name="basePrice"
                ngModel
                value="100"
                readonly
                style="background: var(--ion-color-light); color: var(--ion-color-dark);"
              ></ion-input>
              <small style="color: var(--ion-color-medium); margin-top: 4px; display: block;">
                Fixed base price of ₹100 for all players
              </small>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Profile Photo</ion-label>
              <input 
                type="file" 
                name="profileImage"
                accept=".jpeg,.jpg,.png"
                (change)="onFileSelect($event)"
                style="padding: 12px 0; color: var(--ion-color-primary);"
              />
              <small style="color: var(--ion-color-medium); margin-top: 4px; display: block;">
                Accepted formats: JPEG, PNG (Max size: 5MB)
              </small>
            </ion-item>

            <div class="photo-preview ion-margin-top" *ngIf="imagePreview">
              <img [src]="imagePreview" [alt]="playerForm.name" class="preview-image">
              <ion-button 
                size="small" 
                fill="clear" 
                color="danger" 
                (click)="removeImage()"
                style="margin-top: 8px;"
              >
                <ion-icon name="trash-outline"></ion-icon>
                Remove Photo
              </ion-button>
            </div>

            <ion-item>
              <ion-label position="stacked">Description</ion-label>
              <ion-textarea
                name="description"
                ngModel
                [(ngModel)]="playerForm.description"
                placeholder="Enter player description"
                rows="3"
              ></ion-textarea>
            </ion-item>

            <ion-button
              expand="block"
              type="submit"
              [disabled]="!pForm.valid || isSaving"
              class="ion-margin-top"
            >
              <ion-spinner name="crescent" *ngIf="isSaving"></ion-spinner>
              <span *ngIf="!isSaving">{{ editingPlayer ? 'Update' : 'Add' }} Player</span>
            </ion-button>
          </form>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    .tournament-info {
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-secondary) 100%);
      color: white;
    }

    .registration-link-card {
      margin: 1rem;
    }

    .link-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .link-container ion-input {
      flex: 1;
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
      padding: 1rem;
      border-radius: 8px;
    }

    .stat-card ion-icon {
      font-size: 2rem;
      color: var(--ion-color-primary);
      margin-bottom: 0.5rem;
    }

    .stat-card h3 {
      margin: 0.25rem 0;
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--ion-color-dark);
    }

    .stat-card p {
      margin: 0;
      color: var(--ion-color-medium);
      font-size: 0.9rem;
    }

    .player-status {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--ion-color-medium);
    }

    .empty-state ion-icon {
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      margin: 0.5rem 0;
      color: var(--ion-color-dark);
    }
  `]
})
export class PlayerListComponent implements OnInit {
  tournamentId: string = '';
  tournament: any = null;
  players: AuctionPlayer[] = [];
  registrationLink: string = '';

  showPlayerModal: boolean = false;
  editingPlayer: AuctionPlayer | null = null;
  isSaving: boolean = false;

  // File handling properties
  selectedFile: File | null = null;
  imagePreview: string = '';

  playerForm = {
    name: '',
    role: 'Batsman',
    age: '',
    handedness: 'Righty',
    profileImage: '',
    description: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auctionService: AuctionService,
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.tournamentId = this.route.snapshot.paramMap.get('tournamentId') || '';
    if (this.tournamentId) {
      this.loadTournamentData();
    }
  }

  async loadTournamentData() {
    try {
      const tournamentResponse = await this.auctionService.getTournament(this.tournamentId).toPromise();
      this.tournament = tournamentResponse?.tournament;

      const playersResponse = await this.auctionService.getTournamentPlayers(this.tournamentId).toPromise();
      this.players = playersResponse?.players || [];
    } catch (error) {
      console.error('Error loading tournament data:', error);
      this.showToast('Failed to load tournament data', 'danger');
    }
  }

  get availablePlayers(): number {
    return this.players.filter(p => p.status === 'AVAILABLE').length;
  }

  get soldPlayers(): number {
    return this.players.filter(p => p.status === 'SOLD').length;
  }

  getPlayerAge(player: AuctionPlayer): string {
    return player.statistics?.age?.toString() || 'N/A';
  }

  getPlayerHandedness(player: AuctionPlayer): string {
    return player.statistics?.handedness || 'N/A';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'AVAILABLE': return 'success';
      case 'SOLD': return 'primary';
      case 'IN_AUCTION': return 'warning';
      default: return 'medium';
    }
  }

  generateRegistrationLink() {
    const baseUrl = window.location.origin;
    this.registrationLink = `${baseUrl}/player-register/${this.tournamentId}`;
    this.showToast('Registration link generated', 'success');
  }

  async copyRegistrationLink() {
    if (!this.registrationLink) return;

    try {
      await navigator.clipboard.writeText(this.registrationLink);
      this.showToast('Registration link copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy link:', error);
      this.showToast('Failed to copy link', 'danger');
    }
  }

  addPlayer() {
    this.editingPlayer = null;
    this.resetPlayerForm();
    this.showPlayerModal = true;
  }

  editPlayer(player: AuctionPlayer) {
    this.editingPlayer = player;
    this.playerForm = {
      name: player.name,
      role: player.role,
      age: player.statistics?.age?.toString() || '',
      handedness: player.statistics?.handedness || 'Righty',
      profileImage: player.profileImage || '',
      description: player.description || ''
    };
    this.showPlayerModal = true;
  }

  resetPlayerForm() {
    this.playerForm = {
      name: '',
      role: 'Batsman',
      age: '',
      handedness: 'Righty',
      profileImage: '',
      description: ''
    };
    this.selectedFile = null;
    this.imagePreview = '';
  }

  async savePlayer() {
    this.isSaving = true;

    try {
      // Convert image to base64 if selected
      let profileImageData = this.playerForm.profileImage;
      if (this.selectedFile) {
        profileImageData = await this.convertFileToBase64();
      }

      const playerData = {
        name: this.playerForm.name,
        role: this.playerForm.role,
        profileImage: profileImageData,
        basePrice: 100, // Fixed base price for all players
        description: this.playerForm.description,
        tournament: this.tournamentId,
        statistics: {
          age: this.playerForm.age ? parseInt(this.playerForm.age.toString()) : undefined,
          handedness: this.playerForm.handedness
        },
        auctionOrder: this.players.length + 1
      };

      if (this.editingPlayer) {
        await this.auctionService.updatePlayer(this.editingPlayer._id, playerData).toPromise();
      } else {
        await this.auctionService.createPlayer(playerData).toPromise();
      }

      await this.loadTournamentData();
      this.closePlayerModal();
      this.showToast(
        this.editingPlayer ? 'Player updated successfully' : 'Player added successfully',
        'success'
      );
    } catch (error: any) {
      const message = error.error?.error || 'Failed to save player';
      this.showToast(message, 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  closePlayerModal() {
    this.showPlayerModal = false;
    this.editingPlayer = null;
    this.resetPlayerForm();
  }

  async deletePlayer(playerId: string) {
    const alert = await this.alertController.create({
      header: 'Delete Player',
      message: 'Are you sure you want to delete this player? This action cannot be undone.',
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
              await this.auctionService.deletePlayer(playerId).toPromise();
              await this.loadTournamentData();
              this.showToast('Player deleted successfully', 'success');
            } catch (error: any) {
              const message = error.error?.error || 'Failed to delete player';
              this.showToast(message, 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
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

  // File handling methods
  onFileSelect(event: any) {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      this.showToast('Please select a JPEG or PNG image', 'danger');
      event.target.value = ''; // Clear the input
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      this.showToast('Image size must be less than 5MB', 'danger');
      event.target.value = ''; // Clear the input
      return;
    }

    this.selectedFile = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.selectedFile = null;
    this.imagePreview = '';
    this.playerForm.profileImage = '';
    
    // Clear the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  async convertFileToBase64(): Promise<string> {
    if (!this.selectedFile) {
      return '';
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64String = result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(this.selectedFile!);
    });
  }
}
