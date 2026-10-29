import { Injectable, signal } from '@angular/core';

export type ConfirmationType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmationOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  icon?: string;
  showInput?: boolean;
  inputPlaceholder?: string;
  defaultValue?: string;
  inputRequired?: boolean;
}

export interface ActiveConfirmation extends ConfirmationOptions {
  resolve: (value: any) => void;
  inputValue?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  readonly currentConfirmation = signal<ActiveConfirmation | null>(null);

  confirm(options: ConfirmationOptions | string): Promise<boolean> {
    const opts: ConfirmationOptions = typeof options === 'string'
      ? { message: options, type: 'danger' }
      : options;

    const defaultTitle = opts.type === 'danger'
      ? 'Confirmation de suppression'
      : (opts.type === 'warning' ? 'Action requise' : 'Confirmation requise');

    const defaultConfirmText = opts.type === 'danger'
      ? 'Supprimer'
      : (opts.type === 'warning' ? 'Continuer' : 'Confirmer');

    const defaultIcon = opts.type === 'danger'
      ? 'delete_forever'
      : (opts.type === 'warning' ? 'warning_amber' : 'help_outline');

    return new Promise<boolean>((resolve) => {
      this.currentConfirmation.set({
        title: opts.title || defaultTitle,
        message: opts.message,
        confirmText: opts.confirmText || defaultConfirmText,
        cancelText: opts.cancelText || 'Annuler',
        type: opts.type || 'danger',
        icon: opts.icon || defaultIcon,
        showInput: false,
        resolve
      });
    });
  }

  prompt(options: ConfirmationOptions | string): Promise<string | null> {
    const opts: ConfirmationOptions = typeof options === 'string'
      ? { message: options, type: 'warning' }
      : options;

    return new Promise<string | null>((resolve) => {
      this.currentConfirmation.set({
        title: opts.title || 'Saisie requise',
        message: opts.message,
        confirmText: opts.confirmText || 'Valider',
        cancelText: opts.cancelText || 'Annuler',
        type: opts.type || 'warning',
        icon: opts.icon || 'edit_note',
        showInput: true,
        inputPlaceholder: opts.inputPlaceholder || 'Veuillez saisir votre texte ici...',
        defaultValue: opts.defaultValue || '',
        inputValue: opts.defaultValue || '',
        inputRequired: opts.inputRequired !== false,
        resolve
      });
    });
  }

  updateInputValue(val: string): void {
    const active = this.currentConfirmation();
    if (active) {
      active.inputValue = val;
    }
  }

  handleConfirm(): void {
    const active = this.currentConfirmation();
    if (active) {
      if (active.showInput) {
        const val = active.inputValue ?? '';
        if (active.inputRequired && !val.trim()) {
          return;
        }
        active.resolve(val.trim());
      } else {
        active.resolve(true);
      }
      this.currentConfirmation.set(null);
    }
  }

  handleCancel(): void {
    const active = this.currentConfirmation();
    if (active) {
      if (active.showInput) {
        active.resolve(null);
      } else {
        active.resolve(false);
      }
      this.currentConfirmation.set(null);
    }
  }
}

