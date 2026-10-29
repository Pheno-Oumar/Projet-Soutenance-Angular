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
import { VitrineService } from '../../../../core/services/vitrine.service';
import { MediaProxyService } from '../../../../core/services/media-proxy.service';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { MatIconModule } from '@angular/material/icon';
import { PhoneInputComponent } from '../../../../shared/components';
import { LoginRequest } from '../../../../core/auth/models/auth-response.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SafeMediaUrlPipe, MatIconModule, PhoneInputComponent],
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
  private readonly vitrineService = inject(VitrineService);
  private readonly mediaProxy = inject(MediaProxyService);
  private readonly notificationService = inject(NotificationService);
  private readonly seoService = inject(SeoService);

  readonly authMethod = signal<'phone' | 'email'>('phone');
  readonly selectedCountry = signal<string>('Mali');

  readonly loginForm: FormGroup = this.fb.group({
    telephone: ['', [Validators.required]],
    email: [''],
    password: ['', [Validators.required]],
    rememberMe: [true]
  });

  readonly slugSalon = signal<string | null>(null);
  readonly salonInfo = signal<SalonCheckDto | null>(null);
  readonly salonCoverUrl = signal<string | null>(null);

  readonly nomSalon = computed(() => this.salonInfo()?.nom || this.slugSalon());
  readonly logoUrl = computed(() => this.salonInfo()?.logoUrl || null);
  readonly isSalonMode = computed(() => !!this.slugSalon());
  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);

  /**
   * Arrière-plan dynamique :
   * - Si mode salon avec image cover : utilise l'image cover du salon
   * - Sinon (mode général / plateforme) : utilise loginCover.jpg situé dans public/assets/
   */
  readonly bgImageUrl = computed(() => {
    const cover = this.salonCoverUrl();
    if (this.isSalonMode() && cover) {
      return this.mediaProxy.getSafeMediaUrl(cover);
    }
    return '/assets/loginCover.jpg';
  });

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slugSalon');
    this.slugSalon.set(slug);

    if (slug) {
      // Charger les détails du salon (dont son image cover)
      this.vitrineService.getInfosSalon(slug).subscribe({
        next: (salon) => {
          if (salon?.coverUrl) {
            this.salonCoverUrl.set(salon.coverUrl);
          }
        },
        error: () => {}
      });

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
        title: 'Connexion Administration Plateforme | Hair Style',
        description: "Portail de sécurité et de connexion pour les administrateurs de la plateforme Hair Style.",
        robots: 'noindex, nofollow'
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  setAuthMethod(method: 'phone' | 'email'): void {
    this.authMethod.set(method);
    const telControl = this.loginForm.get('telephone');
    const emailControl = this.loginForm.get('email');

    if (method === 'phone') {
      telControl?.setValidators([Validators.required]);
      emailControl?.clearValidators();
    } else {
      emailControl?.setValidators([Validators.required, Validators.email]);
      telControl?.clearValidators();
    }
    telControl?.updateValueAndValidity();
    emailControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { email, telephone, password } = this.loginForm.value;
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    const slug = this.slugSalon();
    const isPhone = this.authMethod() === 'phone';
    const payload: LoginRequest = {
      password: password || '',
      ...(isPhone
        ? { telephone: (telephone || '').trim() }
        : { email: (email || '').trim() })
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

        const doitChanger = response.data.compte?.doitChangerMotDePasse ?? response.data.doitChangerMotDePasse;
        if (doitChanger) {
          this.notificationService.warning(
            'Pour des raisons de sécurité, vous devez obligatoirement personnaliser votre mot de passe temporaire avant de continuer.',
            'Changement Requis'
          );
          this.router.navigateByUrl('/auth/changer-mot-de-passe');
          return;
        }

        const roles = response.data.rolesSalon || (response.data.compte?.rolePlateforme ? [response.data.compte.rolePlateforme] : []);

        // Si l'utilisateur possède plusieurs rôles, il doit impérativement choisir son espace d'abord
        if (roles.length > 1) {
          this.router.navigateByUrl('/espace-selection');
          return;
        }

        if (returnUrl && !returnUrl.includes('/auth/changer-mot-de-passe')) {
          this.router.navigateByUrl(returnUrl);
        } else if (slug) {
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

  onLogoError(event: Event): void {
    const target = event.target as HTMLElement;
    if (target) {
      target.style.display = 'none';
    }
  }
}
