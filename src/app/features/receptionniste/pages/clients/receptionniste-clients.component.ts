import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReceptionnisteService } from '../../services/receptionniste.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ClientRapide, ClientRapideCreateDto } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-receptionniste-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './receptionniste-clients.component.html',
  styleUrl: './receptionniste-clients.component.css'
})
export class ReceptionnisteClientsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly receptionnisteService = inject(ReceptionnisteService);
  private readonly notificationService = inject(NotificationService);

  readonly clients = signal<ClientRapide[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  searchQuery = '';
  hasSearched = signal<boolean>(false);

  // Modal création rapide
  readonly isCreateModalOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  newClient: ClientRapideCreateDto = {
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    dateNaissance: ''
  };

  ngOnInit(): void {
    // Recherche par défaut si paramètre de requête ou recherche initiale
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) {
      this.searchQuery = q;
      this.lancerRecherche();
    }
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

  lancerRecherche(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.searchQuery.trim()) {
      this.clients.set([]);
      this.hasSearched.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.hasSearched.set(true);

    this.receptionnisteService.rechercherClients(slug, this.searchQuery.trim()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.data) {
          this.clients.set(res.data);
          if (res.data.length === 0) {
            this.notificationService.info('Aucun client trouvé pour cette recherche.', 'Recherche');
          } else {
            this.notificationService.success(`${res.data.length} client(s) trouvé(s)`, 'Recherche');
          }
        } else {
          this.clients.set([]);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || 'Erreur lors de la recherche des clients.';
        this.errorMessage.set(msg);
        this.notificationService.error(msg, 'Recherche Client');
      }
    });
  }

  reinitialiserRecherche(): void {
    this.searchQuery = '';
    this.clients.set([]);
    this.hasSearched.set(false);
    this.errorMessage.set(null);
  }

  // --- Modal Création Client ---

  ouvrirModalCreation(): void {
    this.newClient = {
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      dateNaissance: ''
    };
    this.errorMessage.set(null);
    this.isCreateModalOpen.set(true);
  }

  fermerModalCreation(): void {
    this.isCreateModalOpen.set(false);
  }

  creerClient(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.newClient.nom.trim() || !this.newClient.prenom.trim() || !this.newClient.telephone.trim() || !this.newClient.email.trim()) {
      const msg = 'Veuillez remplir tous les champs obligatoires (Nom, Prénom, Téléphone, Email).';
      this.errorMessage.set(msg);
      this.notificationService.warning(msg, 'Formulaire Incomplet');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: ClientRapideCreateDto = {
      nom: this.newClient.nom.trim(),
      prenom: this.newClient.prenom.trim(),
      telephone: this.newClient.telephone.trim(),
      email: this.newClient.email.trim(),
      dateNaissance: this.newClient.dateNaissance ? this.newClient.dateNaissance : undefined
    };

    this.receptionnisteService.creerClientRapide(slug, payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.fermerModalCreation();
        const msg = `Client ${res.data?.prenom} ${res.data?.nom} enregistré avec succès !`;
        this.successMessage.set(msg);
        this.notificationService.success(msg, 'Nouveau Client');
        setTimeout(() => this.successMessage.set(null), 5000);

        // Ajouter directement au résultat ou relancer la recherche
        if (res.data) {
          this.searchQuery = res.data.telephone;
          this.clients.set([res.data]);
          this.hasSearched.set(true);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errMsg = err?.error?.message || 'Erreur lors de l\'enregistrement du client.';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur Enregistrement');
      }
    });
  }

  // Navigation vers Planning ou Caisse avec ce client
  planifierRdv(client: ClientRapide): void {
    this.router.navigate(['/', this.slugSalon, 'receptionniste', 'planning'], {
      queryParams: {
        nom: client.nom,
        prenom: client.prenom,
        tel: client.telephone,
        email: client.email
      }
    });
  }

  creerPrestationImmediat(client: ClientRapide): void {
    this.router.navigate(['/', this.slugSalon, 'receptionniste', 'file-attente'], {
      queryParams: {
        action: 'nouveau-client',
        clientCompteId: client.id,
        nom: client.nom,
        prenom: client.prenom,
        tel: client.telephone
      }
    });
  }
}
