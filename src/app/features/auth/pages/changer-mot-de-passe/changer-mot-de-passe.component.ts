import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { RoleService } from '../../../../core/auth/services/role.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SeoService } from '../../../../core/services/seo.service';
import { MatIconModule } from '@angular/material/icon';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('nouveauMotDePasse')?.value;
  const confirm = control.get('confirmerMotDePasse')?.value;
  if (!password || !confirm) {
    return null;
  }
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-changer-mot-de-passe',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './changer-mot-de-passe.component.html',
  styleUrl: './changer-mot-de-passe.component.css'
})
export class ChangerMotDePasseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly notificationService = inject(NotificationService);
  private readonly seoService = inject(SeoService);

  readonly isSubmitting = signal(false);
  readonly showOldPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly form: FormGroup = this.fb.group(
    {
      ancienMotDePasse: ['', [Validators.required]],
      nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmerMotDePasse: ['', [Validators.required]]
    },
    { validators: [passwordMatchValidator] }
  );

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Modifier le mot de passe | Hair Style',
      description: 'Mise à jour de votre mot de passe pour accéder à vos services.',
      robots: 'noindex, nofollow'
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { ancienMotDePasse, nouveauMotDePasse } = this.form.value;

    this.authService.changerMotDePasseInitial(ancienMotDePasse.trim(), nouveauMotDePasse.trim()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notificationService.success(
          'Mot de passe mis à jour avec succès.',
          'Succès'
        );

        // Si l'utilisateur possède plusieurs rôles, redirection obligatoire vers /espace-selection
        const roles = this.authService.currentRoles();
        if (roles.length > 1) {
          this.router.navigateByUrl('/espace-selection');
        } else {
          this.roleService.navigateToDefaultSpace();
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errorMsg =
          err.error?.message ||
          'Une erreur est survenue lors de la mise à jour du mot de passe.';
        this.notificationService.error(errorMsg, 'Erreur');
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
