import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { salonExistsGuard } from './salon-exists.guard';
import { ClientAuthService } from '../../../features/auth/services/client-auth.service';

describe('salonExistsGuard', () => {
  let routerSpy: { navigate: any; createUrlTree: any };
  let clientAuthServiceSpy: { checkSalonExists: any };

  beforeEach(() => {
    routerSpy = {
      navigate: vi.fn(),
      createUrlTree: vi.fn().mockImplementation((commands) => ({ commands }))
    };

    clientAuthServiceSpy = {
      checkSalonExists: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ClientAuthService, useValue: clientAuthServiceSpy }
      ]
    });
  });

  it('should allow navigation if salon exists (even if inactive)', async () => {
    clientAuthServiceSpy.checkSalonExists.mockReturnValue(
      of({
        success: true,
        data: { exists: true, slug: 'salon-coiffure', statut: false }
      })
    );

    const route = {
      paramMap: {
        get: (key: string) => (key === 'slugSalon' ? 'salon-coiffure' : null)
      }
    } as unknown as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() => {
      const guardResult = salonExistsGuard(route, {} as any);
      return typeof guardResult === 'object' && 'subscribe' in (guardResult as any)
        ? new Promise((resolve) => (guardResult as any).subscribe(resolve))
        : guardResult;
    });

    expect(result).toBe(true);
    expect(clientAuthServiceSpy.checkSalonExists).toHaveBeenCalledWith('salon-coiffure');
  });

  it('should redirect to /404 if salon does not exist', async () => {
    clientAuthServiceSpy.checkSalonExists.mockReturnValue(
      throwError(() => new Error('Salon introuvable'))
    );

    const route = {
      paramMap: {
        get: (key: string) => (key === 'slugSalon' ? 'salon-inexistant' : null)
      }
    } as unknown as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() => {
      const guardResult = salonExistsGuard(route, {} as any);
      return typeof guardResult === 'object' && 'subscribe' in (guardResult as any)
        ? new Promise((resolve) => (guardResult as any).subscribe(resolve))
        : guardResult;
    });

    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/404']);
  });
});
