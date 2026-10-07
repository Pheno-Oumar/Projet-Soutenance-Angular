import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../auth/services/auth.service';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    component.activeRole = 'MANAGER';
    component.slugSalon = 'mon-salon';
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load manager sidebar configuration', () => {
    expect(component.config().role).toBe('MANAGER');
    expect(component.config().sections.length).toBeGreaterThan(0);
    expect(component.getRolePrefix()).toBe('/mon-salon/manager');
  });

  it('should toggle submenus', () => {
    expect(component.isSubmenuOpen('services-menu')).toBe(false);
    component.toggleSubmenu('services-menu');
    expect(component.isSubmenuOpen('services-menu')).toBe(true);
  });
});
