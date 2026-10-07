import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { RoleService } from '../../../../core/auth/services/role.service';
import { SeoService } from '../../../../core/services/seo.service';
import { TypeRoleSalon, TypeRolePlateforme } from '../../../../core/auth/models/role-salon.enum';

import { MatIconModule } from '@angular/material/icon';

export interface RoleCardInfo {
  role: string;
  titre: string;
  badge: string;
  description: string;
  iconName: string;
  accentColor: string;
}

@Component({
  selector: 'app-role-selection',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './role-selection.component.html',
  styleUrl: './role-selection.component.css'
})
export class RoleSelectionComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);
  private readonly seoService = inject(SeoService);

  readonly currentUser = this.authService.currentUser;
  readonly salonContext = this.authService.currentSalonContext;

  // Active user roles
  readonly userRoles = computed(() => this.authService.currentRoles());

  // Card definitions mapping
  readonly availableRoles = computed<RoleCardInfo[]>(() => {
    const roles = this.userRoles();
    const list: RoleCardInfo[] = [];

    const roleDefinitions: Record<string, Omit<RoleCardInfo, 'role'>> = {
      [TypeRoleSalon.PROPRIETAIRE]: {
        titre: 'Espace Propriétaire',
        badge: 'Gouvernance & Finance',
        description: 'Supervision stratégique, gestion de l’équipe, bilans financiers et configuration du salon.',
        iconName: 'workspace_premium',
        accentColor: '#C8B6A6'
      },
      [TypeRoleSalon.MANAGER]: {
        titre: 'Espace Manager',
        badge: 'Opérations & Services',
        description: 'Pilotage opérationnel au quotidien, plannings des rendez-vous, catalogue des soins et réclamations.',
        iconName: 'auto_awesome',
        accentColor: '#4A3B32'
      },
      [TypeRoleSalon.COIFFEUR]: {
        titre: 'Espace Coiffeur',
        badge: 'Métier & Création',
        description: 'Mon planning de rendez-vous, mes disponibilités, consultation sécurisée des profils capillaires.',
        iconName: 'content_cut',
        accentColor: '#3B82F6'
      },
      [TypeRoleSalon.COMPTABLE]: {
        titre: 'Espace Comptabilité',
        badge: 'Caisse & Rapports',
        description: 'Gestion de caisse (ouvertures/fermetures), enregistrement des dépenses et génération des rapports.',
        iconName: 'payments',
        accentColor: '#10B981'
      },
      [TypeRoleSalon.RECEPTIONNISTE]: {
        titre: 'Espace Réceptionniste',
        badge: 'Accueil & Caisse',
        description: 'Accueil des clients au comptoir, gestion du planning du jour, suivi des retards et encaissement.',
        iconName: 'event_available',
        accentColor: '#0EA5E9'
      },
      [TypeRoleSalon.RESPONSABLE_STOCK]: {
        titre: 'Espace Responsable Stock',
        badge: 'Approvisionnement',
        description: 'Suivi de l’inventaire, alertes de rupture, réapprovisionnement et réceptions de commandes.',
        iconName: 'inventory_2',
        accentColor: '#F59E0B'
      },
      [TypeRolePlateforme.ADMIN_SYSTEME]: {
        titre: 'Administration Plateforme',
        badge: 'Supervision Globale',
        description: 'Gestion du parc des salons, règles transverses, conformité RGPD et journaux d’audit.',
        iconName: 'shield',
        accentColor: '#8B5CF6'
      },
      [TypeRoleSalon.CLIENT]: {
        titre: 'Mon Espace Client',
        badge: 'Réservations & Soins',
        description: 'Gérer mes rendez-vous, mes commandes, mes favoris et mes prestations.',
        iconName: 'person',
        accentColor: '#4A3B32'
      }
    };

    roles.forEach((r) => {
      if (roleDefinitions[r]) {
        list.push({
          role: r,
          ...roleDefinitions[r]
        });
      }
    });

    return list;
  });

  // Track hover for 3D card tilt
  readonly hoveredIndex = signal<number | null>(null);

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Sélection de votre espace de travail | Hair Style',
      description: 'Choisissez l’espace métier auquel vous souhaitez accéder pour cette session.',
      robots: 'noindex, nofollow'
    });
  }

  selectRole(role: string): void {
    const slug = this.salonContext()?.slugSalon;
    const targetRoute = this.roleService.getDefaultRouteForRole(role, slug);
    this.router.navigateByUrl(targetRoute);
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
