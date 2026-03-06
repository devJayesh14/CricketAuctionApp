import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar style="--background: #3880ff; --color: white; min-height: 60px;">
        <div class="toolbar-content">
          <ion-title style="color: white; font-size: 1.2rem; margin: 0;">{{ title }}</ion-title>
          <div class="header-links">
            <a routerLink="/admin-dashboard" class="header-link" *ngIf="userRole === 'SUPER_ADMIN'">Dashboard</a>
            <a routerLink="/tournaments" class="header-link" *ngIf="isAuthenticated">Tournaments</a>
            <a routerLink="/captain-dashboard" class="header-link" *ngIf="userRole === 'CAPTAIN_ADMIN' || userRole === 'SUPER_ADMIN'">Captain Dashboard</a>
            <a routerLink="/player-registration" class="header-link" *ngIf="!isAuthenticated">Register</a>
            <a routerLink="/login" class="header-link" *ngIf="!isAuthenticated">Login</a>
            <a (click)="logout()" class="header-link logout-link" *ngIf="isAuthenticated">Logout</a>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>
  `,
  styles: [`
    /* Toolbar Content Layout */
    .toolbar-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 0 1rem;
      min-height: 60px;
    }

    /* Header Links Styling */
    .header-links {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
      max-width: 70%;
    }

    .header-link {
      color: white !important;
      text-decoration: none;
      padding: 0.4rem 0.8rem;
      border-radius: 4px;
      transition: background-color 0.2s ease;
      font-weight: 500;
      font-size: 0.85rem;
      white-space: nowrap;
      background-color: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .header-link:hover {
      background-color: rgba(255, 255, 255, 0.2);
      text-decoration: none;
      color: white !important;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .logout-link {
      background-color: rgba(220, 53, 69, 0.9);
      border-color: rgba(220, 53, 69, 1);
    }

    .logout-link:hover {
      background-color: rgba(220, 53, 69, 1);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .toolbar-content {
        flex-direction: column;
        padding: 0.5rem;
        gap: 0.5rem;
      }

      .header-links {
        max-width: 100%;
        justify-content: center;
        gap: 0.3rem;
      }
      
      .header-link {
        padding: 0.3rem 0.6rem;
        font-size: 0.75rem;
      }

      ion-title {
        font-size: 1rem !important;
      }
    }

    @media (max-width: 480px) {
      .header-links {
        gap: 0.2rem;
      }
      
      .header-link {
        padding: 0.25rem 0.5rem;
        font-size: 0.7rem;
      }
    }

    /* Ensure proper spacing in Ionic toolbar */
    ion-toolbar {
      --padding-start: 0;
      --padding-end: 0;
    }

    ion-title {
      padding: 0;
      margin: 0;
    }
  `]
})
export class AppHeaderComponent {
  @Input() title: string = 'Cricket Auction';
  userRole: string | null = null;
  isAuthenticated: boolean = false;

  constructor(private authService: AuthService) {
    this.updateAuthStatus();
  }

  private updateAuthStatus() {
    this.isAuthenticated = this.authService.isAuthenticated;
    this.userRole = this.authService.currentUser?.role || null;
  }

  logout() {
    this.authService.logout();
  }
}
