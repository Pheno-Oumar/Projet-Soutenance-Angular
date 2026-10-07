import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientAuthService } from '../../services/client-auth.service';
import { SalonCheckDto } from '../../models/auth.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { SeoService } from '../../../../core/services/seo.service';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { MatIconModule } from '@angular/material/icon';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  if (password && confirmPassword && password !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SafeMediaUrlPipe, MatIconModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientAuthService = inject(ClientAuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly seoService = inject(SeoService);

  readonly slugSalon = signal<string>('mon-salon');
  readonly salonInfo = signal<SalonCheckDto | null>(null);
  readonly nomSalon = computed(() => this.salonInfo()?.nom || this.slugSalon());
  readonly logoUrl = computed(() => this.salonInfo()?.logoUrl || null);
  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly passwordValue = signal<string>('');

  // 3D Tilt perspective card
  protected readonly tiltRotateX = signal(0);
  protected readonly tiltRotateY = signal(0);
  protected readonly isHovered = signal(false);

  readonly registerForm: FormGroup = this.fb.group(
    {
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9+\s()-]{6,20}$/)]],
      dateNaissance: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordMatchValidator }
  );

  // Password strength calculation
  readonly passwordStrength = computed(() => {
    const pwd = this.passwordValue();
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
    if (pwd.length >= 10 && /[^A-Za-z0-9]/.test(pwd)) score++;
    return score; // 1: Faible, 2: Moyen, 3: Robuste
  });

  constructor() {
    this.registerForm.get('password')?.valueChanges.subscribe((val) => {
      this.passwordValue.set(val || '');
    });
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slugSalon');
    if (!slug) {
      this.router.navigate(['/404']);
      return;
    }
    this.slugSalon.set(slug);

    this.clientAuthService.checkSalonExists(slug).subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.exists) {
          this.salonInfo.set(res.data);
          const nom = res.data.nom || slug;
          this.seoService.updateTags({
            title: `Créer un compte client • Salon ${nom} | Hair Style`,
            description: `Inscrivez-vous en ligne pour réserver vos prestations et consulter votre profil capillaire au salon ${nom}.`,
            robots: 'noindex, follow'
          });
        } else {
          this.router.navigate(['/404']);
        }
      },
      error: () => {
        this.router.navigate(['/404']);
      }
    });
  }

  onMouseMove(event: MouseEvent, cardElement: HTMLElement): void {
    const rect = cardElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;

    this.tiltRotateX.set(Math.round(rotateX * 10) / 10);
    this.tiltRotateY.set(Math.round(rotateY * 10) / 10);
    this.isHovered.set(true);
  }

  onMouseLeave(): void {
    this.tiltRotateX.set(0);
    this.tiltRotateY.set(0);
    this.isHovered.set(false);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.isSubmitting()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.registerForm.value;

    const dto = {
      nom: formVal.nom.trim(),
      prenom: formVal.prenom.trim(),
      email: formVal.email.trim(),
      telephone: formVal.telephone.trim(),
      password: formVal.password,
      dateNaissance: formVal.dateNaissance ? formVal.dateNaissance : undefined
    };

    const slug = this.slugSalon();

    this.clientAuthService.registerClient(slug, dto).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notificationService.success(
          `Compte créé avec succès ! Connectez-vous maintenant à votre espace salon.`,
          'Bienvenue'
        );
        this.router.navigate([`/${slug}/login`]);
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }
}
