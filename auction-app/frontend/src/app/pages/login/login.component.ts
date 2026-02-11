import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Auction Login</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="login-container">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Welcome to Live Auction</ion-card-title>
            <ion-card-subtitle>Sign in to continue</ion-card-subtitle>
          </ion-card-header>
          
          <ion-card-content>
            <form #loginForm="ngForm" (ngSubmit)="login()">
              <ion-item>
                <ion-label position="stacked">Email</ion-label>
                <ion-input
                  type="email"
                  name="email"
                  ngModel
                  required
                  email
                  [(ngModel)]="credentials.email"
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
                  [(ngModel)]="credentials.password"
                  placeholder="Enter your password"
                ></ion-input>
              </ion-item>

              <ion-button
                expand="block"
                type="submit"
                [disabled]="!loginForm.valid || isLoading"
                class="ion-margin-top"
              >
                <ion-spinner name="crescent" *ngIf="isLoading"></ion-spinner>
                <span *ngIf="!isLoading">Login</span>
              </ion-button>
            </form>

            <div class="register-link ion-margin-top">
              <p>Don't have an account? <a routerLink="/player-registration">Register here</a></p>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
    }

    ion-card {
      width: 100%;
      max-width: 400px;
    }

    .register-link {
      text-align: center;
    }

    .register-link a {
      color: var(--ion-color-primary);
      text-decoration: none;
    }
  `]
})
export class LoginComponent {
  credentials = {
    email: '',
    password: ''
  };
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  async login() {
    if (!this.credentials.email || !this.credentials.password) {
      this.showToast('Please fill in all fields', 'danger');
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Signing in...'
    });
    await loading.present();

    try {
      await this.authService.login(this.credentials.email, this.credentials.password).toPromise();
      
      await loading.dismiss();
      this.showToast('Login successful!', 'success');
      
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
      const message = error.error?.error || 'Login failed. Please try again.';
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
