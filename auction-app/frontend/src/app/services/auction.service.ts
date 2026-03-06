import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Tournament, TournamentTeam } from '../models/tournament.model';
import { AuctionPlayer } from '../models/player.model';

export interface AuctionState {
  _id?: string;
  tournament: string;
  currentPlayer?: import('../models/player.model').AuctionPlayer;
  currentPlayerIndex: number;
  currentBid: number;
  currentBidder?: any;
  timerEndsAt?: string;
  bidTimerSeconds: number;
  isAuctionActive: boolean;
  isPaused: boolean;
  totalPlayers: number;
  soldPlayers: number;
  lastBidTime?: string;
  auctionStartTime?: string;
  auctionEndTime?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuctionService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getTournaments(): Observable<{ tournaments: Tournament[] }> {
    return this.http.get<{ tournaments: Tournament[] }>(
      `${this.apiUrl}/tournaments`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getTournament(id: string): Observable<{ tournament: Tournament }> {
    return this.http.get<{ tournament: Tournament }>(
      `${this.apiUrl}/tournaments/${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getTournamentPlayers(tournamentId: string): Observable<{ players: AuctionPlayer[] }> {
    return this.http.get<{ players: AuctionPlayer[] }>(
      `${this.apiUrl}/players/tournament/${tournamentId}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getPlayer(playerId: string): Observable<{ player: AuctionPlayer }> {
    return this.http.get<{ player: AuctionPlayer }>(
      `${this.apiUrl}/players/${playerId}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getAuctionState(tournamentId: string): Observable<{ auctionState: AuctionState }> {
    return this.http.get<{ auctionState: AuctionState }>(
      `${this.apiUrl}/auction/state/${tournamentId}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  startAuction(tournamentId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/auction/start/${tournamentId}`,
      {},
      { headers: this.authService.getAuthHeaders() }
    );
  }

  placeBid(tournamentId: string, amount: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/auction/bid/${tournamentId}`,
      { amount },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getMyBids(tournamentId: string): Observable<{ tournamentTeam: TournamentTeam }> {
    return this.http.get<{ tournamentTeam: TournamentTeam }>(
      `${this.apiUrl}/auction/my-bids/${tournamentId}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getSoldPlayers(tournamentId: string): Observable<{ soldPlayers: AuctionPlayer[] }> {
    return this.http.get<{ soldPlayers: AuctionPlayer[] }>(
      `${this.apiUrl}/auction/sold-players/${tournamentId}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  createTournament(tournamentData: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/tournaments`,
      tournamentData,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  updateTournament(id: string, tournamentData: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/tournaments/${id}`,
      tournamentData,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  deleteTournament(id: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/tournaments/${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  createPlayer(playerData: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/players`,
      playerData,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  updatePlayer(id: string, playerData: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/players/${id}`,
      playerData,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  deletePlayer(id: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/players/${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Auction Control Methods
  startAuctionControl(tournamentId: string) {
    return this.http.post(`${this.apiUrl}/tournaments/${tournamentId}/start-auction`, {});
  }

  pauseAuctionControl(tournamentId: string) {
    return this.http.post(`${this.apiUrl}/tournaments/${tournamentId}/pause-auction`, {});
  }

  resumeAuctionControl(tournamentId: string) {
    return this.http.post(`${this.apiUrl}/tournaments/${tournamentId}/resume-auction`, {});
  }

  nextPlayerControl(tournamentId: string) {
    return this.http.post(`${this.apiUrl}/tournaments/${tournamentId}/next-player`, {});
  }

  // Public registration methods (no auth required)
  getPublicTournament(tournamentId: string): Observable<{ tournament: any }> {
    return this.http.get<{ tournament: any }>(
      `${this.apiUrl}/players/tournament/${tournamentId}/public`
    );
  }

  registerPlayerPublic(playerData: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/players/register`,
      playerData
    );
  }
}
