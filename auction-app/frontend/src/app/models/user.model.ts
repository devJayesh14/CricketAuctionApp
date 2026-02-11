/**
 * User Model
 * Defines the structure for user data in the frontend
 */
export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'SUPER_ADMIN' | 'CAPTAIN_ADMIN' | 'PLAYER';
  profile?: UserProfile;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  username: string;
  role: 'PLAYER' | 'CAPTAIN_ADMIN';
  profile?: UserProfile;
}
