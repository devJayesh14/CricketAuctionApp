import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-player-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Player Registration</ion-title>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/login"></ion-back-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="registration-container">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Create Account</ion-card-title>
            <ion-card-subtitle>Join the auction platform</ion-card-subtitle>
          </ion-card-header>
          
          <ion-card-content>
            <form #registrationForm="ngForm" (ngSubmit)="register()">
              <ion-item>
                <ion-label position="stacked">Username</ion-label>
                <ion-input
                  type="text"
                  name="username"
                  ngModel
                  required
                  minlength="3"
                  maxlength="50"
                  [(ngModel)]="userData.username"
                  placeholder="Choose a username"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Email</ion-label>
                <ion-input
                  type="email"
                  name="email"
                  ngModel
                  required
                  email
                  [(ngModel)]="userData.email"
                  placeholder="Enter your email"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Password</ion-label>
                <ion-input
                  type="password"
                  name="password"
                  ngModel
                  required
                  minlength="6"
                  [(ngModel)]="userData.password"
                  placeholder="Create a password"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Confirm Password</ion-label>
                <ion-input
                  type="password"
                  name="confirmPassword"
                  ngModel
                  required
                  [(ngModel)]="confirmPassword"
                  placeholder="Confirm your password"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">First Name</ion-label>
                <ion-input
                  type="text"
                  name="firstName"
                  ngModel
                  maxlength="50"
                  [(ngModel)]="userData.profile.firstName"
                  placeholder="Enter your first name"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Last Name</ion-label>
                <ion-input
                  type="text"
                  name="lastName"
                  ngModel
                  maxlength="50"
                  [(ngModel)]="userData.profile.lastName"
                  placeholder="Enter your last name"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Phone Number</ion-label>
                <ion-input
                  type="tel"
                  name="phone"
                  ngModel
                  maxlength="20"
                  [(ngModel)]="userData.profile.phone"
                  placeholder="Enter your phone number"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Account Type</ion-label>
                <ion-select name="role" ngModel [(ngModel)]="userData.role" placeholder="Select account type">
                  <ion-select-option value="PLAYER">Player (View Only)</ion-select-option>
                  <ion-select-option value="CAPTAIN_ADMIN">Captain Admin</ion-select-option>
                </ion-select>
              </ion-item>

              <div class="role-info ion-margin-top" *ngIf="userData.role">
                <ion-card color="light">
                  <ion-card-content>
                    <h4 *ngIf="userData.role === 'PLAYER'">
                      <ion-icon name="eye-outline"></ion-icon> Player Account
                    </h4>
                    <h4 *ngIf="userData.role === 'CAPTAIN_ADMIN'">
                      <ion-icon name="person-outline"></ion-icon> Captain Account
                    </h4>
                    
                    <p *ngIf="userData.role === 'PLAYER'">
                      • View tournament lists<br>
                      • Watch live auctions<br>
                      • No bidding privileges<br>
                      • Perfect for spectators
                    </p>
                    <p *ngIf="userData.role === 'CAPTAIN_ADMIN'">
                      • Participate in live auctions<br>
                      • Place bids on players<br>
                      • Manage team budget<br>
                      • Requires admin assignment to tournament
                    </p>
                  </ion-card-content>
                </ion-card>
              </div>

              <ion-button
                expand="block"
                type="submit"
                [disabled]="!registrationForm.valid || !passwordsMatch || isLoading"
                class="ion-margin-top"
              >
                <ion-spinner name="crescent" *ngIf="isLoading"></ion-spinner>
                <span *ngIf="!isLoading">Create Account</span>
              </ion-button>
            </form>

            <div class="login-link ion-margin-top">
              <p>Already have an account? <a routerLink="/login">Sign in here</a></p>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .registration-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
    }

    ion-card {
      width: 100%;
      max-width: 500px;
    }

    .role-info h4 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.5rem 0;
      color: var(--ion-color-primary);
    }

    .role-info p {
      margin: 0;
      line-height: 1.5;
    }

    .login-link {
      text-align: center;
    }

    .login-link a {
      color: var(--ion-color-primary);
      text-decoration: none;
    }
  `]
})
export class PlayerRegistrationComponent {
  userData = {
    username: '',
    email: '',
    password: '',
    role: 'PLAYER' as 'PLAYER' | 'CAPTAIN_ADMIN',
    profile: {
      firstName: '',
      lastName: '',
      phone: ''
    }
  };
  confirmPassword = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  get passwordsMatch(): boolean {
    return this.userData.password === this.confirmPassword;
  }

  async register() {
    if (!this.passwordsMatch) {
      this.showToast('Passwords do not match', 'danger');
      return;
    }

    if (!this.userData.username || !this.userData.email || !this.userData.password) {
      this.showToast('Please fill in all required fields', 'danger');
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Creating account...'
    });
    await loading.present();

    try {
      await this.authService.register(this.userData).toPromise();
      
      await loading.dismiss();
      this.showToast('Account created successfully!', 'success');
      
      const user = this.authService.currentUser;
      if (user?.role === 'SUPER_ADMIN') {
        this.router.navigate(['/admin-dashboard']);
      } else if (user?.role === 'CAPTAIN_ADMIN') {
        this.router.navigate(['/captain-dashboard']);
      } else {
        this.router.navigate(['/tournaments']);
      }
    } catch (error: any) {
      await loading.dismiss();
      const message = error.error?.error || 'Registration failed. Please try again.';
      this.showToast(message, 'danger');
    } finally {
      this.isLoading = false;
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
}
