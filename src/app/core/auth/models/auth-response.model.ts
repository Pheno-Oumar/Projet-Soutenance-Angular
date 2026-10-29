import { CompteSummary } from './compte.model';

export interface LoginRequest {
  email?: string;
  telephone?: string;
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
  doitChangerMotDePasse?: boolean;
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
