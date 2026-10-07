import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ReceptionnisteService } from '../../services/receptionniste.service';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  PlanningRendezVousDto,
  CreneauDisponible,
  DisponibiliteSearchDto,
  PrestationCreateDto,
  ProfilCoiffeur,
  PrestationCatalogue,
  ReceptionnisteRDVCreateDto
} from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

export interface VarianteOption {
  id: number;
  serviceId: number;
  serviceNom: string;
  nom: string;
  prix: number;
  dureeMinutes: number;
}

@Component({
  selector: 'app-receptionniste-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './receptionniste-planning.component.html',
  styleUrl: './receptionniste-planning.component.css'
})
export class ReceptionnistePlanningComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly receptionnisteService = inject(ReceptionnisteService);
  private readonly vitrineService = inject(VitrineService);
  private readonly notificationService = inject(NotificationService);

  readonly planning = signal<PlanningRendezVousDto[]>([]);
  readonly coiffeurs = signal<ProfilCoiffeur[]>([]);
  readonly catalogueServices = signal<PrestationCatalogue[]>([]);
  readonly allVariantes = signal<VarianteOption[]>([]);

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filtres
  selectedDate: string = new Date().toISOString().split('T')[0];
  selectedCoiffeurId: number | null = null;

  // Modal Nouveau Rendez-vous (Comptoir / Téléphone)
  readonly isNouveauRdvModalOpen = signal<boolean>(false);
  nouveauRdvCoiffeurId: number | null = null;
  nouveauRdvDate: string = new Date().toISOString().split('T')[0];
  nouveauRdvHeure: string = '10:00';
  nouveauRdvNom: string = '';
  nouveauRdvPrenom: string = '';
  nouveauRdvTel: string = '';
  nouveauRdvClientCompteId: number | null = null;
  readonly selectedVariantesNouveauRdv = signal<VarianteOption[]>([]);
  selectedVarianteToAddNouveauRdv: number | null = null;
  nouveauRdvCommentaire: string = '';
  readonly isSubmittingNouveauRdv = signal<boolean>(false);

  // Modal Annulation RDV
  readonly isCancelModalOpen = signal<boolean>(false);
  selectedRdvToCancel: PlanningRendezVousDto | null = null;
  cancelMotif: string = '';
  readonly isSubmittingCancel = signal<boolean>(false);

  // Modal Recherche Disponibilités
  readonly isDispoModalOpen = signal<boolean>(false);
  dispoDate: string = new Date().toISOString().split('T')[0];
  dispoCoiffeurId: number | null = null;
  selectedVarianteToAdd: number | null = null;
  readonly selectedVariantesDispo = signal<VarianteOption[]>([]);
  readonly creneauxTrouves = signal<CreneauDisponible[]>([]);
  readonly isSearchingDispos = signal<boolean>(false);

  // Modal Démarrage Prestation depuis RDV
  readonly isDemarrerModalOpen = signal<boolean>(false);
  selectedRdvToStart: PlanningRendezVousDto | null = null;
  readonly isStartingPrestation = signal<boolean>(false);

  ngOnInit(): void {
    this.chargerCoiffeurs();
    this.chargerCatalogue();
    this.verifierQueryParams();
    this.chargerPlanning();
  }

  private verifierQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const nom = params.get('nom');
    const prenom = params.get('prenom');
    const tel = params.get('tel');
    if (nom || prenom || tel) {
      this.ouvrirModalNouveauRdv({
        nom: nom || '',
        prenom: prenom || '',
        tel: tel || ''
      });
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

  chargerCoiffeurs(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.vitrineService.getCoiffeurs(slug).subscribe({
      next: (data) => {
        if (data) {
          this.coiffeurs.set(data);
        }
      },
      error: () => {
        // Fallback silencieux, les coiffeurs sont optionnels
      }
    });
  }

  chargerCatalogue(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.vitrineService.getServices(slug).subscribe({
      next: (services) => {
        if (services) {
          this.catalogueServices.set(services);
          const flatList: VarianteOption[] = [];
          for (const s of services) {
            if (s.statut && s.variantes && s.variantes.length > 0) {
              for (const v of s.variantes) {
                if (v.statut !== false) {
                  flatList.push({
                    id: v.id,
                    serviceId: s.id,
                    serviceNom: s.nom,
                    nom: v.nom,
                    prix: v.prix,
                    dureeMinutes: v.dureeMinutes
                  });
                }
              }
            }
          }
          this.allVariantes.set(flatList);
        }
      },
      error: () => {
        // Erreur chargement catalogue
      }
    });
  }

  chargerPlanning(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const coiffeurId = this.selectedCoiffeurId ? this.selectedCoiffeurId : undefined;
    this.receptionnisteService.consulterPlanning(slug, this.selectedDate, coiffeurId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.planning.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Erreur lors du chargement du planning';
        this.errorMessage.set(msg);
        this.notificationService.error(msg, 'Planning');
      }
    });
  }

  changerDate(deltaJours: number): void {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() + deltaJours);
    this.selectedDate = d.toISOString().split('T')[0];
    this.chargerPlanning();
  }

  allerAujourdhui(): void {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.chargerPlanning();
  }

  filtrerParCoiffeur(): void {
    this.chargerPlanning();
  }

  // --- Annulation de Rendez-vous ---

  ouvrirModalAnnulation(rdv: PlanningRendezVousDto): void {
    this.selectedRdvToCancel = rdv;
    this.cancelMotif = '';
    this.isCancelModalOpen.set(true);
  }

  fermerModalAnnulation(): void {
    this.selectedRdvToCancel = null;
    this.isCancelModalOpen.set(false);
  }

  validerAnnulation(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedRdvToCancel || !this.cancelMotif.trim()) return;

    this.isSubmittingCancel.set(true);
    this.receptionnisteService.annulerRendezVous(slug, this.selectedRdvToCancel.rdvId, {
      motif: this.cancelMotif.trim()
    }).subscribe({
      next: () => {
        this.isSubmittingCancel.set(false);
        this.fermerModalAnnulation();
        const successMsg = 'Le rendez-vous a été annulé et le créneau libéré avec succès.';
        this.successMessage.set(successMsg);
        this.notificationService.success(successMsg, 'Rendez-vous');
        setTimeout(() => this.successMessage.set(null), 4000);
        this.chargerPlanning();
      },
      error: (err) => {
        this.isSubmittingCancel.set(false);
        const errVal = err.error?.message || 'Erreur lors de l’annulation du rendez-vous';
        this.errorMessage.set(errVal);
        this.notificationService.error(errVal, 'Erreur Annulation');
      }
    });
  }

  // --- Disponibilités ---

  ouvrirModalDisponibilites(): void {
    this.dispoDate = this.selectedDate;
    this.dispoCoiffeurId = this.selectedCoiffeurId || null;
    this.selectedVariantesDispo.set([]);
    this.selectedVarianteToAdd = null;
    this.creneauxTrouves.set([]);
    this.isDispoModalOpen.set(true);
  }

  fermerModalDisponibilites(): void {
    this.isDispoModalOpen.set(false);
  }

  ajouterVarianteDispo(): void {
    if (!this.selectedVarianteToAdd) return;
    const vId = Number(this.selectedVarianteToAdd);
    const variante = this.allVariantes().find((v) => v.id === vId);
    if (!variante) return;

    if (!this.selectedVariantesDispo().some((v) => v.id === vId)) {
      this.selectedVariantesDispo.update((list) => [...list, variante]);
    }
    this.selectedVarianteToAdd = null;
  }

  retirerVarianteDispo(varianteId: number): void {
    this.selectedVariantesDispo.update((list) => list.filter((v) => v.id !== varianteId));
  }

  rechercherCreneaux(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (this.selectedVariantesDispo().length === 0) {
      const msg = 'Veuillez sélectionner au moins une prestation / variante.';
      this.errorMessage.set(msg);
      this.notificationService.warning(msg, 'Disponibilités');
      return;
    }

    this.isSearchingDispos.set(true);
    this.errorMessage.set(null);

    const payload: DisponibiliteSearchDto = {
      date: this.dispoDate,
      varianteIds: this.selectedVariantesDispo().map((v) => v.id),
      serviceIds: this.selectedVariantesDispo().map((v) => v.id),
      coiffeurId: this.dispoCoiffeurId ? Number(this.dispoCoiffeurId) : undefined
    };

    this.receptionnisteService.consulterDisponibilites(slug, payload).subscribe({
      next: (res) => {
        this.isSearchingDispos.set(false);
        if (res.success && res.data) {
          this.creneauxTrouves.set(res.data);
          if (res.data.length === 0) {
            this.notificationService.info('Aucun créneau libre disponible pour ces critères.', 'Disponibilités');
          } else {
            this.notificationService.success(`${res.data.length} créneau(x) libre(s) disponible(s).`, 'Disponibilités');
          }
        }
      },
      error: (err) => {
        this.isSearchingDispos.set(false);
        const errMsg = err.error?.message || 'Erreur lors du calcul des créneaux';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Disponibilités');
      }
    });
  }

  // --- Nouveau Rendez-vous (Comptoir / Téléphone) ---

  ouvrirModalNouveauRdv(prefill?: {
    nom?: string;
    prenom?: string;
    tel?: string;
    coiffeurId?: number;
    date?: string;
    heure?: string;
    variantes?: VarianteOption[];
  }): void {
    this.nouveauRdvDate = prefill?.date || this.selectedDate;
    this.nouveauRdvHeure = prefill?.heure || '10:00';
    this.nouveauRdvCoiffeurId = prefill?.coiffeurId || (this.coiffeurs().length > 0 ? this.coiffeurs()[0].affectationId : null);
    this.nouveauRdvNom = prefill?.nom || '';
    this.nouveauRdvPrenom = prefill?.prenom || '';
    this.nouveauRdvTel = prefill?.tel || '';
    this.nouveauRdvCommentaire = '';
    this.selectedVarianteToAddNouveauRdv = null;

    if (prefill?.variantes && prefill.variantes.length > 0) {
      this.selectedVariantesNouveauRdv.set([...prefill.variantes]);
    } else {
      this.selectedVariantesNouveauRdv.set([]);
    }

    this.errorMessage.set(null);
    this.isNouveauRdvModalOpen.set(true);
  }

  fermerModalNouveauRdv(): void {
    this.isNouveauRdvModalOpen.set(false);
  }

  ajouterVarianteNouveauRdv(): void {
    if (!this.selectedVarianteToAddNouveauRdv) return;
    const vId = Number(this.selectedVarianteToAddNouveauRdv);
    const variante = this.allVariantes().find((v) => v.id === vId);
    if (!variante) return;

    if (!this.selectedVariantesNouveauRdv().some((v) => v.id === vId)) {
      this.selectedVariantesNouveauRdv.update((list) => [...list, variante]);
    }
    this.selectedVarianteToAddNouveauRdv = null;
  }

  retirerVarianteNouveauRdv(varianteId: number): void {
    this.selectedVariantesNouveauRdv.update((list) => list.filter((v) => v.id !== varianteId));
  }

  reserverCreneau(creneau: CreneauDisponible): void {
    this.isDispoModalOpen.set(false);
    this.ouvrirModalNouveauRdv({
      coiffeurId: creneau.coiffeurId,
      date: this.dispoDate,
      heure: creneau.heureDebut,
      variantes: this.selectedVariantesDispo()
    });
  }

  validerCreationRdv(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.nouveauRdvCoiffeurId) {
      this.notificationService.warning('Veuillez sélectionner un coiffeur.', 'Nouveau RDV');
      return;
    }

    if (!this.nouveauRdvNom.trim() || !this.nouveauRdvPrenom.trim() || !this.nouveauRdvTel.trim()) {
      this.notificationService.warning('Nom, prénom et téléphone du client sont obligatoires.', 'Nouveau RDV');
      return;
    }

    if (this.selectedVariantesNouveauRdv().length === 0) {
      this.notificationService.warning('Veuillez ajouter au moins une prestation / variante.', 'Nouveau RDV');
      return;
    }

    const heureFormatted = this.nouveauRdvHeure.length === 5 ? `${this.nouveauRdvHeure}:00` : this.nouveauRdvHeure;
    const dateHeureIso = `${this.nouveauRdvDate}T${heureFormatted}`;

    const dto: ReceptionnisteRDVCreateDto = {
      coiffeurAffectationId: Number(this.nouveauRdvCoiffeurId),
      coiffeurId: Number(this.nouveauRdvCoiffeurId),
      nomClient: this.nouveauRdvNom.trim(),
      prenomClient: this.nouveauRdvPrenom.trim(),
      telephoneClient: this.nouveauRdvTel.trim(),
      dateHeureDebut: dateHeureIso,
      dateHeurePrevue: dateHeureIso,
      varianteIds: this.selectedVariantesNouveauRdv().map((v) => v.id),
      commentaire: this.nouveauRdvCommentaire.trim() || undefined
    };

    this.isSubmittingNouveauRdv.set(true);
    this.errorMessage.set(null);

    this.receptionnisteService.creerRendezVous(slug, dto).subscribe({
      next: (res) => {
        this.isSubmittingNouveauRdv.set(false);
        this.fermerModalNouveauRdv();
        const msg = `Rendez-vous réservé avec succès pour ${this.nouveauRdvPrenom} ${this.nouveauRdvNom} !`;
        this.successMessage.set(msg);
        this.notificationService.success(msg, 'Rendez-vous Confirmé');
        setTimeout(() => this.successMessage.set(null), 5000);
        this.selectedDate = this.nouveauRdvDate;
        this.chargerPlanning();
      },
      error: (err) => {
        this.isSubmittingNouveauRdv.set(false);
        let errMsg = err.error?.message || 'Erreur lors de la réservation du rendez-vous';
        if (err.error?.erreurs && typeof err.error.erreurs === 'object') {
          const details = Object.values(err.error.erreurs).join('\n• ');
          errMsg = `${errMsg} :\n• ${details}`;
        }
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur Réservation');
      }
    });
  }

  // --- Démarrer Prestation ---

  ouvrirModalDemarrer(rdv: PlanningRendezVousDto): void {
    this.selectedRdvToStart = rdv;
    this.isDemarrerModalOpen.set(true);
  }

  fermerModalDemarrer(): void {
    this.selectedRdvToStart = null;
    this.isDemarrerModalOpen.set(false);
  }

  validerDemarragePrestation(statutChoisi: 'EN_COURS' | 'EN_ATTENTE' = 'EN_COURS'): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedRdvToStart) return;

    this.isStartingPrestation.set(true);

    const lignes = (this.selectedRdvToStart.prestations || []).map((p, idx) => ({
      varianteServiceId: p.varianteId,
      prixReel: p.prix && p.prix > 0 ? Number(p.prix) : 1000,
      varianteId: p.varianteId,
      ordre: idx + 1
    }));

    // S'il n'y a pas de variantes dans le RDV, prendre la première variante du catalogue ou fallback
    const fallbackVariante = this.allVariantes().length > 0 ? this.allVariantes()[0] : null;
    const fallbackVarianteId = fallbackVariante ? fallbackVariante.id : 1;
    const fallbackPrix = fallbackVariante && fallbackVariante.prix > 0 ? fallbackVariante.prix : 5000;

    const req: PrestationCreateDto = {
      rendezVousId: this.selectedRdvToStart.rdvId,
      coiffeurAffectationId: this.selectedRdvToStart.coiffeurAffectationId,
      clientCompteId: this.selectedRdvToStart.clientCompteId,
      nomClient: this.selectedRdvToStart.nomClient,
      prenomClient: this.selectedRdvToStart.prenomClient,
      telephoneClient: this.selectedRdvToStart.telephoneClient || '770000000',
      statut: statutChoisi,
      lignes: lignes.length > 0 ? lignes : [{
        varianteServiceId: fallbackVarianteId,
        prixReel: fallbackPrix,
        varianteId: fallbackVarianteId,
        ordre: 1
      }]
    };

    this.receptionnisteService.creerPrestation(slug, req).subscribe({
      next: (res) => {
        this.isStartingPrestation.set(false);
        this.fermerModalDemarrer();
        const actionText = statutChoisi === 'EN_ATTENTE' 
          ? 'Le client a été accueilli et placé en salle d’attente.'
          : 'La prestation a démarré au fauteuil et sa facture a été ouverte.';
        this.successMessage.set(actionText);
        this.notificationService.success(actionText, 'Accueil Client');
        setTimeout(() => this.successMessage.set(null), 4000);
        this.chargerPlanning();
      },
      error: (err) => {
        this.isStartingPrestation.set(false);
        let errMsg = err.error?.message || 'Erreur lors du démarrage de la prestation';
        if (err.error?.erreurs && typeof err.error.erreurs === 'object') {
          const details = Object.values(err.error.erreurs).join('\n• ');
          errMsg = `${errMsg} :\n• ${details}`;
        }
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur');
      }
    });
  }

  getStatutBadgeClass(statut: string): string {
    switch (statut) {
      case 'CONFIRME':
        return 'badge-success';
      case 'EN_COURS':
        return 'badge-info';
      case 'TERMINE':
        return 'badge-primary';
      case 'ANNULE':
      case 'NO_SHOW':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }
}
