import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController, LoadingController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AuctionService } from '../../services/auction.service';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';

@Component({
  selector: 'app-player-register',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, AppHeaderComponent],
  template: `
    <app-header title="Player Registration"></app-header>

    <ion-content>
      <!-- Tournament Info -->
      <div class="tournament-info ion-padding" *ngIf="tournament">
        <h2>{{ tournament.name }}</h2>
        <p>Register yourself for the auction</p>
      </div>

      <!-- Registration Form -->
      <ion-card class="registration-form">
        <ion-card-header>
          <ion-card-title>Player Information</ion-card-title>
          <ion-card-subtitle>Please fill in your details</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <form #registrationForm="ngForm" (ngSubmit)="registerPlayer()">
            <ion-item>
              <ion-label position="stacked">Full Name *</ion-label>
              <ion-input
                type="text"
                name="name"
                ngModel
                required
                [(ngModel)]="playerData.name"
                placeholder="Enter your full name"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Playing Role *</ion-label>
              <ion-select 
                name="role" 
                ngModel 
                required 
                [(ngModel)]="playerData.role" 
                placeholder="Select your role"
              >
                <ion-select-option value="Batsman">Batsman</ion-select-option>
                <ion-select-option value="Bowler">Bowler</ion-select-option>
                <ion-select-option value="All-Rounder">All-Rounder</ion-select-option>
                <ion-select-option value="Wicket-Keeper">Wicket-Keeper</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Age *</ion-label>
              <ion-input
                type="number"
                name="age"
                ngModel
                required
                [(ngModel)]="playerData.age"
                placeholder="Enter your age"
                min="16"
                max="50"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Batting Style *</ion-label>
              <ion-select 
                name="handedness" 
                ngModel 
                required 
                [(ngModel)]="playerData.handedness" 
                placeholder="Select batting style"
              >
                <ion-select-option value="Righty">Right-handed</ion-select-option>
                <ion-select-option value="Lefty">Left-handed</ion-select-option>
              </ion-select>
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
              <img [src]="imagePreview" [alt]="playerData.name" class="preview-image">
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

            <!-- Terms and Conditions -->
            <ion-item class="ion-margin-top">
              <ion-checkbox slot="start" [(ngModel)]="agreeToTerms" name="agreeToTerms"></ion-checkbox>
              <ion-label class="ion-text-wrap">
                I agree to the terms and conditions and confirm that all information provided is accurate
              </ion-label>
            </ion-item>

            <ion-button 
              type="submit" 
              expand="block" 
              color="primary" 
              class="ion-margin-top"
              [disabled]="!agreeToTerms || isSubmitting"
            >
              <ion-icon name="person-add-outline" slot="start"></ion-icon>
              {{ isSubmitting ? 'Registering...' : 'Register for Auction' }}
            </ion-button>
          </form>
        </ion-card-content>
      </ion-card>

      <!-- Instructions -->
      <ion-card class="instructions-card">
        <ion-card-header>
          <ion-card-title>Registration Instructions</ion-card-title>
        </ion-card-header>
        
        <ion-card-content>
          <ul class="instructions-list">
            <li>Fill in all required fields marked with *</li>
            <li>Provide accurate information about your cricket experience</li>
            <li>Upload a clear profile photo for better visibility</li>
            <li>Set a realistic base price based on your skills and experience</li>
            <li>Once registered, you cannot edit your information</li>
            <li>You will be notified when the auction starts</li>
          </ul>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styles: [`
    .tournament-info {
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-secondary) 100%);
      color: white;
      text-align: center;
    }

    .registration-form {
      margin: 1rem;
    }

    .photo-preview {
      text-align: center;
    }

    .preview-image {
      max-width: 150px;
      max-height: 150px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--ion-color-primary);
    }

    .terms-section {
      display: flex;
      align-items: flex-start;
      padding: 1rem;
      background: var(--ion-color-light);
      border-radius: 8px;
    }

    .instructions-card {
      margin: 1rem;
    }

    .instructions-list {
      margin: 0;
      padding-left: 1.5rem;
    }

    .instructions-list li {
      margin-bottom: 0.5rem;
      color: var(--ion-color-dark);
    }

    .instructions-list li:last-child {
      margin-bottom: 0;
    }
  `]
})
export class PlayerRegisterComponent implements OnInit {
  tournamentId: string = '';
  tournament: any = null;
  isSubmitting: boolean = false;
  agreeToTerms: boolean = false;

  // File handling properties
  selectedFile: File | null = null;
  imagePreview: string = '';

  playerData = {
    name: '',
    role: 'Batsman',
    age: '',
    handedness: 'Righty',
    profileImage: '' // Keep this for file upload handling
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auctionService: AuctionService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
    this.tournamentId = this.route.snapshot.paramMap.get('tournamentId') || '';
    
    if (!this.tournamentId) {
      this.showToast('Invalid registration link', 'danger');
      this.router.navigate(['/login']);
      return;
    }

    await this.loadTournament();
  }

  async loadTournament() {
    try {
      const response = await this.auctionService.getPublicTournament(this.tournamentId).toPromise();
      this.tournament = response?.tournament;

      if (!this.tournament) {
        this.showToast('Tournament not found', 'danger');
        this.router.navigate(['/login']);
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
      this.showToast('Failed to load tournament details', 'danger');
      this.router.navigate(['/login']);
    }
  }

  async registerPlayer() {
    if (!this.agreeToTerms) {
      this.showToast('Please agree to the terms and conditions', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Registering...',
      spinner: 'crescent'
    });
    await loading.present();

    this.isSubmitting = true;

    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add form fields
      formData.append('name', this.playerData.name);
      formData.append('role', this.playerData.role);
      formData.append('basePrice', '100'); // Fixed base price
      formData.append('tournament', this.tournamentId);
      formData.append('statistics[age]', this.playerData.age.toString());
      formData.append('statistics[handedness]', this.playerData.handedness);
      
      // Add file if selected
      if (this.selectedFile) {
        formData.append('profileImage', this.selectedFile, this.selectedFile.name);
      }

      // Send FormData instead of JSON
      const response = await fetch('http://localhost:3000/api/players/register', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const result = await response.json();

      await loading.dismiss();
      
      const alert = await this.alertController.create({
        header: 'Registration Successful!',
        message: `Thank you ${this.playerData.name}! You have been successfully registered for the ${this.tournament.name} auction. You will be notified when the auction starts.`,
        buttons: [
          {
            text: 'OK',
            handler: () => {
              this.router.navigate(['/login']);
            }
          }
        ]
      });

      await alert.present();

    } catch (error: any) {
      await loading.dismiss();
      console.error('Registration error:', error);
      const message = error.message || 'Registration failed. Please try again.';
      this.showToast(message, 'danger');
    } finally {
      this.isSubmitting = false;
    }
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
    this.playerData.profileImage = '';
    
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
