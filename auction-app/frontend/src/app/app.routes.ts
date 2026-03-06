import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { TournamentListComponent } from './pages/tournament-list/tournament-list.component';
import { AuctionLiveComponent } from './pages/auction-live/auction-live.component';
import { CaptainDashboardComponent } from './pages/captain-dashboard/captain-dashboard.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { PlayerRegistrationComponent } from './pages/player-registration/player-registration.component';
import { PlayerListComponent } from './pages/player-list/player-list.component';
import { PlayerRegisterComponent } from './pages/player-register/player-register.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { 
    path: 'tournaments', 
    component: TournamentListComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'auction-live/:id', 
    component: AuctionLiveComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'captain-dashboard', 
    component: CaptainDashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['CAPTAIN_ADMIN', 'SUPER_ADMIN'] }
  },
  { 
    path: 'admin-dashboard', 
    component: AdminDashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['SUPER_ADMIN'] }
  },
  { 
    path: 'player-registration', 
    component: PlayerRegistrationComponent
  },
  { 
    path: 'manage-players/:tournamentId', 
    component: PlayerListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['SUPER_ADMIN'] }
  },
  { 
    path: 'player-register/:tournamentId', 
    component: PlayerRegisterComponent
  },
  { path: '**', redirectTo: '/login' }
];
