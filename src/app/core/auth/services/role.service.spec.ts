import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { RoleService } from './role.service';
import { AuthService } from './auth.service';
import { TypeRoleSalon, TypeRolePlateforme } from '../models/role-salon.enum';

describe('RoleService', () => {
  let roleService: RoleService;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])]
    });
    roleService = TestBed.inject(RoleService);
    authService = TestBed.inject(AuthService);
    authService.clearSession();
  });

  it('should be created', () => {
    expect(roleService).toBeTruthy();
  });

  it('should return false for roles when user has no roles', () => {
    expect(roleService.hasRole(TypeRoleSalon.MANAGER)).toBe(false);
    expect(roleService.hasAnyRole([TypeRoleSalon.MANAGER, TypeRoleSalon.COIFFEUR])).toBe(false);
  });

  it('should return correct default routes for roles', () => {
    expect(roleService.getDefaultRouteForRole(TypeRolePlateforme.ADMIN_SYSTEME)).toBe(
      '/admin-plateforme'
    );
    expect(roleService.getDefaultRouteForRole(TypeRoleSalon.MANAGER, 'mon-salon')).toBe(
      '/mon-salon/manager'
    );
    expect(roleService.getDefaultRouteForRole(TypeRoleSalon.CLIENT, 'mon-salon')).toBe(
      '/mon-salon/client'
    );
  });
});
