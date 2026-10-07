import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenService);
    service.clearToken();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store and clear token properly', () => {
    expect(service.getToken()).toBeNull();

    service.setToken('sample.jwt.token');
    expect(service.getToken()).toBe('sample.jwt.token');

    service.clearToken();
    expect(service.getToken()).toBeNull();
  });

  it('should report invalid or expired for non-JWT strings', () => {
    service.setToken('not-a-jwt');
    expect(service.isTokenExpired()).toBe(true);
    expect(service.getTokenPayload()).toBeNull();
  });
});
