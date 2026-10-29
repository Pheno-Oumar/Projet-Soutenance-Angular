import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthService } from '../../auth/services/auth.service';
import { ClientAuthService } from '../../../features/auth/services/client-auth.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, MatIconModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly clientAuthService = inject(ClientAuthService);

  readonly isCompact = signal(false);
  readonly isMobileOpen = signal(false);

  readonly currentUser = this.authService.currentUser;
  readonly salonContext = this.authService.currentSalonContext;

  // Active role deduced from URL or route data
  readonly activeRole = signal<string>('MANAGER');
  readonly slugSalon = signal<string | undefined>(undefined);
  readonly salonInfo = signal<{ nom?: string; logoUrl?: string; slug?: string } | null>(null);

  readonly salonLogoUrl = computed(() => {
    return this.salonInfo()?.logoUrl || this.salonContext()?.logoUrl || undefined;
  });

  readonly salonNom = computed(() => {
    return this.salonInfo()?.nom || this.salonContext()?.nomSalon || undefined;
  });

  ngOnInit(): void {
    this.updateRoleFromRoute();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateRoleFromRoute();
        this.isMobileOpen.set(false);
      });
  }

  private updateRoleFromRoute(): void {
    const url = this.router.url;

    if (url.includes('/admin-plateforme')) {
      this.activeRole.set('ADMIN_SYSTEME');
      this.slugSalon.set(undefined);
    } else if (url.includes('/proprietaire')) {
      this.activeRole.set('PROPRIETAIRE');
      this.extractSlug(url);
    } else if (url.includes('/manager')) {
      this.activeRole.set('MANAGER');
      this.extractSlug(url);
    } else if (url.includes('/coiffeur')) {
      this.activeRole.set('COIFFEUR');
      this.extractSlug(url);
    } else if (url.includes('/comptabilite')) {
      this.activeRole.set('COMPTABLE');
      this.extractSlug(url);
    } else if (url.includes('/responsable-stock')) {
      this.activeRole.set('RESPONSABLE_STOCK');
      this.extractSlug(url);
    } else if (url.includes('/receptionniste')) {
      this.activeRole.set('RECEPTIONNISTE');
      this.extractSlug(url);
    }
  }

  private extractSlug(url: string): void {
    const parts = url.split('/').filter(Boolean);
    if (parts.length > 0) {
      const slug = parts[0];
      this.slugSalon.set(slug);
      this.loadSalonDetails(slug);
    }
  }

  private loadSalonDetails(slug: string): void {
    const ctx = this.salonContext();
    if (ctx && ctx.slugSalon === slug && ctx.logoUrl && ctx.nomSalon) {
      this.salonInfo.set({ nom: ctx.nomSalon, logoUrl: ctx.logoUrl, slug });
      return;
    }

    if (this.salonInfo()?.slug === slug && this.salonInfo()?.logoUrl) {
      return;
    }

    this.clientAuthService.checkSalonExists(slug).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.salonInfo.set({
            nom: res.data.nom,
            logoUrl: res.data.logoUrl,
            slug: res.data.slug
          });

          if (ctx && ctx.slugSalon === slug) {
            this.authService.setSalonContext(
              slug,
              ctx.roles,
              res.data.nom,
              ctx.actif,
              res.data.logoUrl
            );
          }
        }
      },
      error: () => {
        // Fallback gracefully without error
      }
    });
  }

  toggleCompact(): void {
    this.isCompact.update((c) => !c);
  }

  toggleMobile(): void {
    this.isMobileOpen.update((m) => !m);
  }

  closeMobile(): void {
    this.isMobileOpen.set(false);
  }
}
