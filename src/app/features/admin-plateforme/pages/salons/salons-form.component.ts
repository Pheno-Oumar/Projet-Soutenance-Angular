import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminSystemService } from '../../services/admin-system.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalonCreateDto } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { PhoneInputComponent } from '../../../../shared/components';

@Component({
  selector: 'app-salons-form',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatIconModule, PhoneInputComponent],
  templateUrl: './salons-form.component.html',
  styleUrl: './salons-form.component.css'
})
export class SalonsFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminSystemService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  readonly salonForm: FormGroup = this.fb.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    emailProprietaire: ['', [Validators.email]],
    telephoneProprietaire: ['', [Validators.required, Validators.pattern(/^[0-9+\s()-]{6,25}$/)]],
    pays: ['Mali', [Validators.required]]
  });

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {}

  onCountryChanged(country: string): void {
    if (country) {
      this.salonForm.patchValue({ pays: country }, { emitEvent: false });
    }
  }

  isFieldInvalid(name: string): boolean {
    const field = this.salonForm.get(name);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.salonForm.invalid) {
      this.salonForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.salonForm.value;
    const request: SalonCreateDto = {
      nom: val.nom.trim(),
      emailProprietaire: val.emailProprietaire?.trim() || undefined,
      telephoneProprietaire: val.telephoneProprietaire.trim(),
      pays: val.pays.trim()
    };

    this.adminService.creerSalon(request).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.notificationService.success(
          `Le salon "${res.data.nom}" a été créé avec succès.`,
          'Salon Créé'
        );
        this.router.navigate(['/admin-plateforme/salons']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message || 'Erreur lors de la création du salon.';
        this.errorMessage.set(msg);
        this.notificationService.error(msg, 'Création Échouée');
      }
    });
  }
}
