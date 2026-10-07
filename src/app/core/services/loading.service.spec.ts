import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
    service.forceReset();
  });

  it('should be created and default to not loading', () => {
    expect(service).toBeTruthy();
    expect(service.isLoading()).toBe(false);
  });

  it('should increment and decrement active requests count', () => {
    service.show();
    expect(service.isLoading()).toBe(true);

    service.show();
    expect(service.isLoading()).toBe(true);

    service.hide();
    expect(service.isLoading()).toBe(true);

    service.hide();
    expect(service.isLoading()).toBe(false);
  });

  it('should force reset loading state to false', () => {
    service.show();
    service.show();
    expect(service.isLoading()).toBe(true);

    service.forceReset();
    expect(service.isLoading()).toBe(false);
  });
});
