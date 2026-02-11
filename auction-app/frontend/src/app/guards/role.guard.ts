import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRoles = route.data['roles'] as string[];
    const userRole = this.authService.currentUser?.role;

    if (!userRole) {
      this.router.navigate(['/login']);
      return false;
    }

    if (expectedRoles.includes(userRole)) {
      return true;
    } else {
      this.router.navigate(['/tournaments']);
      return false;
    }
  }
}
