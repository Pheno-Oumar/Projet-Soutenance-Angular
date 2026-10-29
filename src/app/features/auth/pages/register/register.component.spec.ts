import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { RegisterComponent } from './register.component';
import { ClientAuthService } from '../../services/client-auth.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  const mockClientAuthService = {
    checkSalonExists: vi.fn().mockReturnValue(of({
      success: true,
      message: 'Salon trouvé',
      data: { exists: true, id: 1, nom: 'Mon Salon', slug: 'mon-salon', statut: true }
    })),
    registerClient: vi.fn().mockReturnValue(of({
      success: true,
      message: 'Client créé',
      data: {}
    }))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
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
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate password strength accurately', () => {
    const pwdControl = component.registerForm.get('password');

    pwdControl?.setValue('12345');
    expect(component.passwordStrength()).toBe(0);

    pwdControl?.setValue('123456');
    expect(component.passwordStrength()).toBe(1);

    pwdControl?.setValue('Password123');
    expect(component.passwordStrength()).toBe(2);

    pwdControl?.setValue('Password123!#');
    expect(component.passwordStrength()).toBe(3);
  });

  it('should reject mismatched passwords', () => {
    component.registerForm.get('password')?.setValue('Secret123');
    component.registerForm.get('confirmPassword')?.setValue('Different123');
    expect(component.registerForm.errors?.['passwordMismatch']).toBe(true);

    component.registerForm.get('confirmPassword')?.setValue('Secret123');
    expect(component.registerForm.errors?.['passwordMismatch']).toBeUndefined();
  });
});
