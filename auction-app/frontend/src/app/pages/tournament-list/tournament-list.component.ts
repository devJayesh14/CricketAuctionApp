import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuctionService } from '../../services/auction.service';
import { Tournament } from '../../models/tournament.model';
import { AuthService } from '../../services/auth.service';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';

@Component({
  selector: 'app-tournament-list',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, AppHeaderComponent],
  template: `
    <app-header title="Tournaments"></app-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refreshTournaments($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="header-section ion-padding">
        <h2>Welcome, {{ authService.currentUser?.username }}!</h2>
        <p *ngIf="authService.isSuperAdmin">Manage tournaments and oversee all auction activities</p>
        <p *ngIf="authService.isCaptain">View your assigned tournaments and participate in auctions</p>
        <p *ngIf="authService.currentUser?.role === 'PLAYER'">Browse available tournaments and watch live auctions</p>
      </div>

      <ion-list>
        <ion-list-header>
          <ion-label>
            {{ tournaments.length }} Tournament{{ tournaments.length !== 1 ? 's' : '' }}
          </ion-label>
        </ion-list-header>

        <ion-item *ngFor="let tournament of tournaments" button [routerLink]="['/auction-live', tournament._id]">
          <ion-avatar slot="start">
            <ion-icon name="trophy-outline" style="font-size: 2rem;"></ion-icon>
          </ion-avatar>
          
          <ion-label>
            <h2>{{ tournament.name }}</h2>
            <p>{{ tournament.description || 'No description available' }}</p>
            <div class="tournament-details">
              <ion-chip [color]="getStatusColor(tournament.status)">
                {{ tournament.status }}
              </ion-chip>
              <span class="detail-text">
                {{ tournament.totalTeams }} Teams • 
                Starting: {{ formatDate(tournament.auctionStartTime) }}
              </span>
            </div>
          </ion-label>

          <ion-icon slot="end" name="chevron-forward-outline"></ion-icon>
        </ion-item>
      </ion-list>

      <div *ngIf="tournaments.length === 0 && !isLoading" class="empty-state ion-padding">
        <ion-icon name="calendar-outline" style="font-size: 4rem; color: var(--ion-color-medium);"></ion-icon>
        <h3>No Tournaments Available</h3>
        <p>Check back later for new tournaments</p>
      </div>

      <div *ngIf="isLoading" class="loading-state ion-padding">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading tournaments...</p>
      </div>
    </ion-content>
  `,
  styles: [`
    .header-section {
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-secondary) 100%);
      color: white;
      margin-bottom: 1rem;
    }

    .tournament-details {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .detail-text {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
    }

    .empty-state, .loading-state {
      text-align: center;
      padding: 2rem;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
  `]
})
export class TournamentListComponent implements OnInit {
  tournaments: Tournament[] = [];
  isLoading = true;

  constructor(
    private auctionService: AuctionService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTournaments();
  }

  async refreshTournaments(event: RefresherCustomEvent) {
    await this.loadTournaments();
    event.target.complete();
  }

  async loadTournaments() {
    try {
      this.isLoading = true;
      const response = await this.auctionService.getTournaments().toPromise();
      this.tournaments = response?.tournaments || [];
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      this.isLoading = false;
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

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  logout() {
    this.authService.logout();
  }
}
