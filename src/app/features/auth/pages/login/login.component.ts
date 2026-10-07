import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { RoleService } from '../../../../core/auth/services/role.service';
import { ClientAuthService } from '../../services/client-auth.service';
import { SalonCheckDto } from '../../models/auth.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { SeoService } from '../../../../core/services/seo.service';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SafeMediaUrlPipe, MatIconModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly clientAuthService = inject(ClientAuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly seoService = inject(SeoService);

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [true]
  });

  readonly slugSalon = signal<string | null>(null);
  readonly salonInfo = signal<SalonCheckDto | null>(null);
  readonly nomSalon = computed(() => this.salonInfo()?.nom || this.slugSalon());
  readonly logoUrl = computed(() => this.salonInfo()?.logoUrl || null);
  readonly isSalonMode = computed(() => !!this.slugSalon());
  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);

  // 3D Tilt perspective card
  protected readonly tiltRotateX = signal(0);
  protected readonly tiltRotateY = signal(0);
  protected readonly isHovered = signal(false);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slugSalon');
    this.slugSalon.set(slug);

    if (slug) {
      this.clientAuthService.checkSalonExists(slug).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.salonInfo.set(res.data);
            const nom = res.data.nom || slug;
            this.seoService.updateTags({
              title: `Connexion • Salon ${nom} | Hair Style`,
              description: `Connectez-vous à votre espace membre du salon de coiffure ${nom}.`,
              robots: 'noindex, follow'
            });
          }
        },
        error: () => {
          this.router.navigate(['/404']);
        }
      });
    } else {
      this.seoService.updateTags({
        title: 'Connexion Administration Plateforme | AON',
        description: "Portail de sécurité et de connexion pour les administrateurs de la plateforme AON.",
        robots: 'noindex, nofollow'
      });
    }
  }

  onMouseMove(event: MouseEvent, cardElement: HTMLElement): void {
    const rect = cardElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

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

  onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { email, password } = this.loginForm.value;
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    const slug = this.slugSalon();
    const payload = {
      email: (email || '').trim(),
      password: password || ''
    };

    const loginObservable = slug
      ? this.authService.loginSalon(slug, payload)
      : this.authService.loginAdminSysteme(payload);

    loginObservable.subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.notificationService.success(
          `Bienvenue ${response.data.compte.prenom} ! Connexion réussie.`,
          'Accès Autorisé'
        );

        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else if (slug) {
          const roles = response.data.rolesSalon || [];
          if (roles.includes('CLIENT') && roles.length === 1) {
            this.router.navigateByUrl(`/${slug}/client`);
          } else {
            this.roleService.navigateToDefaultSpace();
          }
        } else {
          this.roleService.navigateToDefaultSpace();
        }
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  onForgotPassword(): void {
    const slug = this.slugSalon();
    if (slug) {
      this.notificationService.info(
        `Pour réinitialiser votre mot de passe, contactez directement l'accueil du salon ${this.nomSalon()} ou le service client.`
      );
    } else {
      this.notificationService.info(
        'Veuillez contacter le support à support@hairstyle.com pour la réinitialisation sécurisée de votre accès.'
      );
    }
  }
}
