import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { RoleSelectionComponent } from './role-selection.component';
import { AuthService } from '../../../../core/auth/services/auth.service';

describe('RoleSelectionComponent', () => {
  let component: RoleSelectionComponent;
  let fixture: ComponentFixture<RoleSelectionComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleSelectionComponent],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    authService.setSalonContext('mon-salon', ['MANAGER', 'COIFFEUR']);

    fixture = TestBed.createComponent(RoleSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the available roles for the user', () => {
    expect(component.availableRoles().length).toBe(2);
    expect(component.availableRoles()[0].role).toBe('MANAGER');
    expect(component.availableRoles()[1].role).toBe('COIFFEUR');
  });

  it('should display client role when user has CLIENT role', () => {
    authService.setSalonContext('mon-salon', ['COIFFEUR', 'CLIENT']);
    expect(component.availableRoles().length).toBe(2);
    expect(component.availableRoles()[0].role).toBe('COIFFEUR');
    expect(component.availableRoles()[1].role).toBe('CLIENT');
  });
});
