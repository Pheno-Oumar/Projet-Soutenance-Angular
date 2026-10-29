import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProprietaireService } from '../../services/proprietaire.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmationService } from '../../../../core/services/confirmation.service';
import { Employe, EmployeCreateDto } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { PhoneInputComponent } from '../../../../shared/components';

const AVAILABLE_ROLES = [
  { key: 'COIFFEUR', label: 'Coiffeur / Styliste' },
  { key: 'MANAGER', label: 'Manager de Salon' },
  { key: 'RECEPTIONNISTE', label: 'Réceptionniste / Caisse' },
  { key: 'COMPTABLE', label: 'Comptable' },
  { key: 'RESPONSABLE_STOCK', label: 'Responsable Stock' }
];

@Component({
  selector: 'app-proprietaire-employes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PhoneInputComponent],
  templateUrl: './proprietaire-employes.component.html',
  styleUrl: './proprietaire-employes.component.css'
})
export class ProprietaireEmployesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly employes = signal<Employe[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly statusFilter = signal<'ALL' | 'ACTIF' | 'INACTIF'>('ALL');

  readonly filteredEmployes = computed(() => {
    const filter = this.statusFilter();
    const all = this.employes();
    if (filter === 'ACTIF') {
      return all.filter(e => e.statut);
    }
    if (filter === 'INACTIF') {
      return all.filter(e => !e.statut);
    }
    return all;
  });

  readonly totalCount = computed(() => this.employes().length);
  readonly activeCount = computed(() => this.employes().filter(e => e.statut).length);
  readonly inactiveCount = computed(() => this.employes().filter(e => !e.statut).length);

  readonly availableRoles = AVAILABLE_ROLES;

  // Modal Create State
  showCreateModal = false;
  isCreating = false;
  createForm: EmployeCreateDto = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    pays: 'Mali',
    roles: ['COIFFEUR']
  };

  // Modal Roles State
  showRolesModal = false;
  isUpdatingRoles = false;
  selectedEmploye: Employe | null = null;
  selectedRoles: string[] = [];

  ngOnInit(): void {
    this.chargerEmployes();
  }

  get slugSalon(): string {
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const slug = r.snapshot.paramMap.get('slugSalon');
      if (slug) return slug;
      r = r.parent;
    }
    return '';
  }

  chargerEmployes(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.proprietaireService.listerEmployes(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.employes.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des collaborateurs.');
      }
    });
  }

  openCreateModal(): void {
    this.createForm = {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      pays: 'Mali',
      roles: ['COIFFEUR']
    };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.isCreating = false;
  }

  toggleRoleInCreate(roleKey: string): void {
    const idx = this.createForm.roles.indexOf(roleKey);
    if (idx > -1) {
      if (this.createForm.roles.length > 1) {
        this.createForm.roles.splice(idx, 1);
      } else {
        this.notificationService.error('L’employé doit posséder au moins un rôle.', 'Attention');
      }
    } else {
      this.createForm.roles.push(roleKey);
    }
  }

  creerEmploye(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.createForm.nom.trim() || !this.createForm.prenom.trim() || !this.createForm.telephone.trim() || !this.createForm.pays.trim()) {
      this.notificationService.error('Veuillez renseigner tous les champs obligatoires (nom, prénom, téléphone, pays).', 'Formulaire incomplet');
      return;
    }

    if (this.createForm.roles.length === 0) {
      this.notificationService.error('Sélectionnez au moins un rôle pour l’employé.', 'Rôle requis');
      return;
    }

    const payload: EmployeCreateDto = {
      nom: this.createForm.nom.trim(),
      prenom: this.createForm.prenom.trim(),
      telephone: this.createForm.telephone.trim(),
      pays: this.createForm.pays.trim(),
      email: this.createForm.email?.trim() || undefined,
      roles: this.createForm.roles
    };

    this.isCreating = true;
    this.proprietaireService.creerEmploye(slug, payload).subscribe({
      next: () => {
        this.isCreating = false;
        this.closeCreateModal();
        this.notificationService.success('Le collaborateur a été recruté / réactivé avec succès.', 'Équipe mise à jour');
        this.chargerEmployes();
      },
      error: (err) => {
        this.isCreating = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la création de l’employé.', 'Erreur');
      }
    });
  }

  openRolesModal(e: Employe): void {
    this.selectedEmploye = e;
    this.selectedRoles = [...(e.roles || [])];
    this.showRolesModal = true;
  }

  closeRolesModal(): void {
    this.showRolesModal = false;
    this.selectedEmploye = null;
    this.selectedRoles = [];
  }

  toggleRoleInUpdate(roleKey: string): void {
    if (roleKey === 'PROPRIETAIRE') {
      this.notificationService.error(
        'Le rôle Propriétaire est permanent et ne peut jamais être retiré sauf transfert de propriété.',
        'Action impossible'
      );
      return;
    }

    const idx = this.selectedRoles.indexOf(roleKey);
    if (idx > -1) {
      if (this.selectedRoles.length > 1) {
        this.selectedRoles.splice(idx, 1);
      } else {
        this.notificationService.error('L’employé doit posséder au moins un rôle.', 'Attention');
      }
    } else {
      this.selectedRoles.push(roleKey);
    }
  }

  sauvegarderRoles(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedEmploye) return;

    if (this.selectedRoles.length === 0) {
      this.notificationService.error('L’employé doit avoir au moins un rôle.', 'Attention');
      return;
    }

    this.isUpdatingRoles = true;
    this.proprietaireService.updateRoles(slug, this.selectedEmploye.affectationId, { roles: this.selectedRoles }).subscribe({
      next: () => {
        this.isUpdatingRoles = false;
        this.closeRolesModal();
        this.notificationService.success('Les rôles de l’employé ont été mis à jour.', 'Rôles enregistrés');
        this.chargerEmployes();
      },
      error: (err) => {
        this.isUpdatingRoles = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la mise à jour des rôles.', 'Erreur');
      }
    });
  }

  async toggleStatut(e: Employe): Promise<void> {
    const slug = this.slugSalon;
    if (!slug) return;

    if (e.statut) {
      const confirmed = await this.confirmationService.confirm({
        title: 'Désactiver l\'employé',
        message: `Désactiver l'accès de ${e.prenom} ${e.nom} au salon ? L'employé ne pourra plus se connecter.`,
        type: 'danger',
        confirmText: 'Désactiver',
        icon: 'person_off'
      });
      if (!confirmed) return;

      this.proprietaireService.desactiverEmploye(slug, e.affectationId).subscribe({
        next: () => {
          this.notificationService.success(`L'employé ${e.prenom} a été désactivé.`, 'Statut mis à jour');
          this.chargerEmployes();
        },
        error: (err) => {
          this.notificationService.error(err?.error?.message || 'Impossible de désactiver l’employé.', 'Erreur');
        }
      });
    } else {
      this.proprietaireService.reactiverEmploye(slug, e.affectationId).subscribe({
        next: () => {
          this.notificationService.success(`L'employé ${e.prenom} a été réactivé.`, 'Statut mis à jour');
          this.chargerEmployes();
        },
        error: (err) => {
          this.notificationService.error(err?.error?.message || 'Impossible de réactiver l’employé.', 'Erreur');
        }
      });
    }
  }
}
