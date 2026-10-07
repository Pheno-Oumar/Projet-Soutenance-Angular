import { CompteSummary } from './compte.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  compte: CompteSummary;
  slugSalon?: string;
  nomSalon?: string;
  logoUrl?: string;
  rolesSalon?: string[];
}

export interface TokenRefreshResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  roles?: string[];
  slugSalon?: string;
  exp: number;
  iat?: number;
  [key: string]: unknown;
}
