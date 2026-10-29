import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
    service.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add a success toast notification', () => {
    const id = service.success('Opération réussie', 'Succès');
    expect(id).toBeDefined();
    expect(service.notifications().length).toBe(1);
    expect(service.notifications()[0].type).toBe('success');
    expect(service.notifications()[0].message).toBe('Opération réussie');
    expect(service.notifications()[0].title).toBe('Succès');
  });

  it('should remove a notification by id', () => {
    const id = service.error('Erreur critique');
    expect(service.notifications().length).toBe(1);

    service.remove(id);
    expect(service.notifications().length).toBe(0);
  });

  it('should clear all notifications', () => {
    service.info('Info 1');
    service.warning('Warning 2');
    expect(service.notifications().length).toBe(2);

    service.clear();
    expect(service.notifications().length).toBe(0);
  });
});
