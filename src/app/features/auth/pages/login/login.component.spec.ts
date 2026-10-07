import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { LoginComponent } from './login.component';
import { ClientAuthService } from '../../services/client-auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  const mockClientAuthService = {
    checkSalonExists: vi.fn().mockReturnValue(of({
      success: true,
      message: 'Salon trouvé',
      data: { exists: true, id: 1, nom: 'Mon Salon', slug: 'mon-salon', statut: true }
    }))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: ClientAuthService, useValue: mockClientAuthService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'slugSalon' ? 'mon-salon' : null)
              },
              queryParamMap: {
                get: () => null
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should detect salon mode and initialize form', () => {
    expect(component.isSalonMode()).toBe(true);
    expect(component.slugSalon()).toBe('mon-salon');
    expect(component.loginForm).toBeDefined();
    expect(component.loginForm.valid).toBe(false);
  });

  it('should validate form fields', () => {
    const emailControl = component.loginForm.get('email');
    const passwordControl = component.loginForm.get('password');

    expect(emailControl?.valid).toBe(false);
    emailControl?.setValue('invalid-email');
    expect(emailControl?.valid).toBe(false);
    emailControl?.setValue('admin@exemple.com');
    expect(emailControl?.valid).toBe(true);

    expect(passwordControl?.valid).toBe(false);
    passwordControl?.setValue('password123');
    expect(passwordControl?.valid).toBe(true);

    expect(component.loginForm.valid).toBe(true);
  });
});
