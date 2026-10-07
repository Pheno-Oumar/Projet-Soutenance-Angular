import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { RoleService } from '../../auth/services/role.service';
import { ClientAuthService } from '../../../features/auth/services/client-auth.service';
import { SafeMediaUrlPipe } from '../../../shared/pipes/safe-media-url.pipe';
import { SIDEBAR_CONFIGS, RoleSidebarConfig } from './sidebar-config';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, SafeMediaUrlPipe, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnChanges {
  private readonly authService = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly clientAuthService = inject(ClientAuthService);
  private readonly router = inject(Router);

  @Input({ required: true }) activeRole!: string;
  @Input() slugSalon?: string;
  @Input() nomSalon?: string;
  @Input() logoUrl?: string;
  @Input() isCompact = false;
  @Input() isMobileOpen = false;

  readonly logoImgError = signal(false);
  readonly internalLogoUrl = signal<string | null>(null);
  readonly internalNomSalon = signal<string | null>(null);

  readonly salonLogoUrl = computed(() => {
    if (this.logoImgError()) return null;
    return this.logoUrl || this.internalLogoUrl() || this.salonContext()?.logoUrl || null;
  });

  readonly salonNom = computed(() => {
    return this.nomSalon || this.internalNomSalon() || this.salonContext()?.nomSalon || this.slugSalon || 'Salon';
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['logoUrl'] || changes['slugSalon']) {
      this.logoImgError.set(false);
      if (this.slugSalon && !this.logoUrl && !this.salonContext()?.logoUrl) {
        this.fetchSalonFallback(this.slugSalon);
      }
    }
  }

  private fetchSalonFallback(slug: string): void {
    this.clientAuthService.checkSalonExists(slug).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.internalLogoUrl.set(res.data.logoUrl || null);
          this.internalNomSalon.set(res.data.nom || null);
          this.logoImgError.set(false);
        }
      },
      error: () => {}
    });
  }

  onLogoError(): void {
    this.logoImgError.set(true);
  }

  @Output() closeMobileDrawer = new EventEmitter<void>();
  @Output() toggleCompact = new EventEmitter<void>();

  readonly currentUser = this.authService.currentUser;
  readonly salonContext = this.authService.currentSalonContext;

  readonly hasMultipleRoles = computed(() => this.authService.currentRoles().length > 1);

  // Expanded submenus state
  readonly openSubmenus = signal<Record<string, boolean>>({});

  readonly config = computed<RoleSidebarConfig>(() => {
    return SIDEBAR_CONFIGS[this.activeRole] || SIDEBAR_CONFIGS['MANAGER'];
  });

  toggleSubmenu(itemId: string): void {
    this.openSubmenus.update((state) => ({
      ...state,
      [itemId]: !state[itemId]
    }));
  }

  isSubmenuOpen(itemId: string): boolean {
    return !!this.openSubmenus()[itemId];
  }

  getRolePrefix(): string {
    const slug = this.slugSalon || this.salonContext()?.slugSalon || 'salon';
    switch (this.activeRole) {
      case 'ADMIN_SYSTEME':
        return '/admin-plateforme';
      case 'PROPRIETAIRE':
        return `/${slug}/proprietaire`;
      case 'MANAGER':
        return `/${slug}/manager`;
      case 'COIFFEUR':
        return `/${slug}/coiffeur`;
      case 'COMPTABLE':
        return `/${slug}/comptabilite`;
      case 'RESPONSABLE_STOCK':
        return `/${slug}/responsable-stock`;
      case 'RECEPTIONNISTE':
        return `/${slug}/receptionniste`;
      default:
        return '';
    }
  }

  buildRoute(relativePath?: string): string {
    const prefix = this.getRolePrefix();
    if (!relativePath) return prefix;
    return `${prefix}/${relativePath}`;
  }

  onLinkClick(): void {
    if (this.isMobileOpen) {
      this.closeMobileDrawer.emit();
    }
  }

  goToRoleSelection(): void {
    this.onLinkClick();
    this.router.navigate(['/espace-selection']);
  }

  logout(): void {
    this.onLinkClick();
    this.authService.logout().subscribe();
  }

  getMatIcon(icon: string): string {
    const map: Record<string, string> = {
      'chart-bar': 'bar_chart',
      'building-storefront': 'storefront',
      'scale': 'balance',
      'shield-check': 'verified_user',
      'document-text': 'description',
      'user': 'person',
      'presentation-chart-line': 'monitoring',
      'credit-card': 'credit_card',
      'calendar-days': 'calendar_month',
      'clock': 'schedule',
      'star': 'star',
      'truck': 'local_shipping',
      'bell-alert': 'notifications_active',
      'document-currency-dollar': 'receipt_long',
      'document-chart-bar': 'analytics',
      'users': 'groups',
      'user-group': 'group',
      'scissors': 'content_cut',
      'banknotes': 'payments',
      'archive-box': 'inventory_2',
      'sparkles': 'auto_awesome',
      'identification': 'badge',
      'arrows-right-left': 'swap_horiz',
      'video-camera': 'videocam',
      'chat-bubble-left-right': 'chat',
      'cog': 'settings'
    };
    return map[icon] || 'circle';
  }
}
