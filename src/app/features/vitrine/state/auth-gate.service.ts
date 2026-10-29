import { Injectable, signal } from '@angular/core';

export interface AuthGateOptions {
  title?: string;
  message?: string;
  salonNom?: string;
  redirectUrl?: string;
  actionType?: 'BOOKING' | 'CART' | 'REVIEW' | 'FAVORITE';
}

@Injectable({
  providedIn: 'root'
})
export class AuthGateService {
  readonly isOpen = signal<boolean>(false);
  readonly options = signal<AuthGateOptions>({
    title: 'Votre sélection est prête',
    message: 'Pour valider votre rendez-vous et recevoir votre confirmation instantanée par SMS, connectez-vous ou rejoignez-nous en quelques secondes.',
    actionType: 'BOOKING'
  });

  open(options: AuthGateOptions): void {
    this.options.set({
      title: options.title || 'Votre sélection est prête',
      message: options.message || 'Pour confirmer votre rendez-vous et recevoir votre rappel SMS, connectez-vous ou rejoignez-nous en 30 secondes.',
      salonNom: options.salonNom,
      redirectUrl: options.redirectUrl,
      actionType: options.actionType || 'BOOKING'
    });
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
