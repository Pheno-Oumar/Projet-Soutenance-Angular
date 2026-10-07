import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ReceptionnisteService } from '../../services/receptionniste.service';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  Prestation,
  Facture,
  SessionCaisse,
  ProfilCoiffeur,
  PrestationCatalogue,
  PaiementRecepteurDto,
  PrestationCreateDto,
  PlanningRendezVousDto
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

export interface ClientRapide {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
}

export interface FauteuilStation {
  coiffeur: ProfilCoiffeur;
  isOccupe: boolean;
  prestationEnCours?: Prestation;
  nomClient?: string;
  telephoneClient?: string;
  serviceNom?: string;
  debutHeure?: string;
  minutesEcoulees: number;
  dureeEstimeeMinutes: number;
  pourcentageProgression: number;
}

@Component({
  selector: 'app-receptionniste-file-attente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './receptionniste-file-attente.component.html',
  styleUrl: './receptionniste-file-attente.component.css'
})
export class ReceptionnisteFileAttenteComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly receptionnisteService = inject(ReceptionnisteService);
  private readonly vitrineService = inject(VitrineService);
  private readonly notificationService = inject(NotificationService);

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Données des colonnes
  readonly prestationsEnAttente = signal<Prestation[]>([]);
  readonly prestationsEnCours = signal<Prestation[]>([]);
  readonly facturesAEncaisser = signal<Facture[]>([]);
  readonly sessionCourante = signal<SessionCaisse | null>(null);

  readonly coiffeurs = signal<ProfilCoiffeur[]>([]);
  readonly catalogueServices = signal<PrestationCatalogue[]>([]);
  readonly allVariantes = signal<VarianteOption[]>([]);

  // Rendez-vous programmés pour aujourd'hui
  readonly rendezVousDuJour = signal<PlanningRendezVousDto[]>([]);
  readonly isRdvPanelExpanded = signal<boolean>(true);

  // Vue 3D Fauteuils & Postes de coiffure en direct
  readonly isStationsPanelExpanded = signal<boolean>(true);
  readonly currentTime = signal<number>(Date.now());
  private timerInterval: any = null;

  // Modal d'attribution rapide d'un client au fauteuil d'un coiffeur
  readonly isStationAssignModalOpen = signal<boolean>(false);
  targetStationForAssign: FauteuilStation | null = null;
  readonly isSubmittingStationAssign = signal<boolean>(false);

  // Postes / Fauteuils calculés en direct avec timers et progression
  readonly fauteuilsStations = computed<FauteuilStation[]>(() => {
    const coiffList = this.coiffeurs();
    const enCoursList = this.prestationsEnCours();
    const now = this.currentTime();

    return coiffList.map(c => {
      const p = enCoursList.find(x => x.coiffeurAffectationId === c.affectationId);
      let minutes = 0;
      let debutHeure = '';
      let serviceNom = '';
      let nomClient = '';
      let telephoneClient = '';
      const dureeEstimee = 45; // Durée standard en minutes pour la jauge de progression

      if (p) {
        const debutDateStr = p.dateHeureDebut || p.datePrestation;
        if (debutDateStr) {
          const d = new Date(debutDateStr).getTime();
          minutes = Math.max(0, Math.floor((now - d) / 60000));
          debutHeure = new Date(debutDateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        serviceNom = (p.lignes && p.lignes[0]?.varianteNom) || 'Prestation au fauteuil';
        nomClient = (p.prenomClient && p.nomClient) ? `${p.prenomClient} ${p.nomClient}` : (p.clientNom || 'Client Salon');
        telephoneClient = p.telephoneClient || '';
      }

      const pct = Math.min(100, Math.round((minutes / dureeEstimee) * 100));

      return {
        coiffeur: c,
        isOccupe: !!p,
        prestationEnCours: p,
        nomClient,
        telephoneClient,
        serviceNom,
        debutHeure,
        minutesEcoulees: minutes,
        dureeEstimeeMinutes: dureeEstimee,
        pourcentageProgression: pct
      };
    });
  });

  // Modal Passage au fauteuil (Choix du coiffeur)
  readonly isInstallChairModalOpen = signal<boolean>(false);
  prestationToInstall: Prestation | null = null;
  selectedChairCoiffeurId: number | null = null;
  readonly isSubmittingInstallChair = signal<boolean>(false);

  // Modal Permuter Coiffeur RDV
  readonly isPermuterModalOpen = signal<boolean>(false);
  rdvToPermute: PlanningRendezVousDto | null = null;
  nouveauCoiffeurPermutationId: number | null = null;
  readonly isSubmittingPermuter = signal<boolean>(false);

  // Modal Notifier Retard RDV (message personnalisable par la réceptionniste)
  readonly isNotifierRetardModalOpen = signal<boolean>(false);
  rdvToNotify: PlanningRendezVousDto | null = null;
  customMessageNotification: string = '';
  readonly isSubmittingNotification = signal<boolean>(false);

  // Filtre recherche rapide
  searchQuery: string = '';

  // Modal Encaissement rapide
  readonly isEncaissementModalOpen = signal<boolean>(false);
  selectedFacture: Facture | null = null;
  encaissementDto: PaiementRecepteurDto = {
    montant: 0,
    type: 'SOLDE',
    modePaiement: 'ESPECES',
    referencePaiement: ''
  };
  montantRemisParClient: number = 0;
  readonly monnaieRendue = computed(() => {
    if (this.encaissementDto.modePaiement !== 'ESPECES') return 0;
    const diff = (this.montantRemisParClient || 0) - (this.encaissementDto.montant || 0);
    return diff > 0 ? diff : 0;
  });
  readonly isSubmittingEncaissement = signal<boolean>(false);

  // Modal Reçu imprimable
  readonly isTicketModalOpen = signal<boolean>(false);
  ticketFacture: Facture | null = null;

  // Modal Walk-in express
  readonly isWalkInModalOpen = signal<boolean>(false);
  walkInStatutChoisi: 'EN_ATTENTE' | 'EN_COURS' = 'EN_ATTENTE';
  walkInNom = '';
  walkInPrenom = '';
  walkInTel = '';
  walkInCoiffeurId: number | null = null;
  walkInClientCompteId?: number;
  readonly selectedVariantesWalkIn = signal<VarianteOption[]>([]);
  selectedVarianteToAdd: number | null = null;
  readonly isSubmittingWalkIn = signal<boolean>(false);

  // Recherche Client Rapide dans Walk-in
  readonly clientSearchResults = signal<ClientRapide[]>([]);
  readonly isSearchingClients = signal<boolean>(false);
  clientSearchQuery: string = '';
  selectedClientExistant: ClientRapide | null = null;

  ngOnInit(): void {
    this.chargerCoiffeurs();
    this.chargerCatalogue();
    this.verifierQueryParams();
    this.chargerDonnees();

    // Actualisation temps réel des timers de file d'attente et fauteuils (toutes les 15s)
    this.timerInterval = setInterval(() => {
      this.currentTime.set(Date.now());
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private verifierQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('action') === 'nouveau-client' || params.get('nom')) {
      const clientCompteId = params.get('clientCompteId');
      this.walkInClientCompteId = clientCompteId ? Number(clientCompteId) : undefined;
      this.walkInNom = params.get('nom') || '';
      this.walkInPrenom = params.get('prenom') || '';
      this.walkInTel = params.get('tel') || '';
      this.walkInStatutChoisi = 'EN_ATTENTE';
      this.walkInCoiffeurId = null;
      this.isWalkInModalOpen.set(true);
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
      error: () => {}
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
      error: () => {}
    });
  }

  chargerDonnees(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // 1. Session de caisse
    this.receptionnisteService.getSessionCourante(slug).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.sessionCourante.set(res.data);
        } else {
          this.sessionCourante.set(null);
        }
      },
      error: () => {
        this.sessionCourante.set(null);
      }
    });

    // 2. Prestations EN_ATTENTE
    this.receptionnisteService.listerPrestations(slug, 'EN_ATTENTE').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.prestationsEnAttente.set(res.data);
        } else {
          this.prestationsEnAttente.set([]);
        }
      },
      error: () => {
        this.prestationsEnAttente.set([]);
      }
    });

    // 3. Prestations EN_COURS
    this.receptionnisteService.listerPrestations(slug, 'EN_COURS').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.prestationsEnCours.set(res.data);
        } else {
          this.prestationsEnCours.set([]);
        }
      },
      error: () => {
        this.prestationsEnCours.set([]);
      }
    });

    // 4. Factures à encaisser (IMPAYEE)
    this.receptionnisteService.listerFactures(slug, 'IMPAYEE').subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          const impayees = res.data.filter(
            (f: Facture) => (f.resteAPayer === undefined || f.resteAPayer === null || Number(f.resteAPayer) > 0) &&
                 f.statut !== 'PAYEE' && f.statut !== 'ANNULEE'
          );
          this.facturesAEncaisser.set(impayees);
        } else {
          this.facturesAEncaisser.set([]);
        }
      },
      error: () => {
        // Fallback sécurisé : charger sans filtre et filtrer localement les impayées
        this.receptionnisteService.listerFactures(slug).subscribe({
          next: (res) => {
            this.isLoading.set(false);
            if (res.data) {
              const impayees = res.data.filter(
                (f: Facture) => (f.resteAPayer === undefined || f.resteAPayer === null || Number(f.resteAPayer) > 0) &&
                     f.statut !== 'PAYEE' && f.statut !== 'ANNULEE'
              );
              this.facturesAEncaisser.set(impayees);
            } else {
              this.facturesAEncaisser.set([]);
            }
          },
          error: () => {
            this.isLoading.set(false);
            this.facturesAEncaisser.set([]);
          }
        });
      }
    });

    // 5. Rendez-vous programmés aujourd'hui
    const todayStr = new Date().toISOString().split('T')[0];
    this.receptionnisteService.consulterPlanning(slug, todayStr).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.rendezVousDuJour.set(res.data);
        } else {
          this.rendezVousDuJour.set([]);
        }
      },
      error: () => {
        this.rendezVousDuJour.set([]);
      }
    });
  }

  // --- Disponibilité et occupation des coiffeurs ---

  isCoiffeurOccupe(coiffeurAffectationId: number | null | undefined): boolean {
    if (!coiffeurAffectationId) return false;
    return this.prestationsEnCours().some(p => p.coiffeurAffectationId === coiffeurAffectationId);
  }

  getNomClientOccupe(coiffeurAffectationId: number | null | undefined): string {
    if (!coiffeurAffectationId) return '';
    const p = this.prestationsEnCours().find(x => x.coiffeurAffectationId === coiffeurAffectationId);
    if (!p) return '';
    return p.prenomClient && p.nomClient ? `${p.prenomClient} ${p.nomClient}` : (p.clientNom || 'un client');
  }

  // --- Gestion du Deck 3D des Fauteuils & Timers Vivants ---

  toggleStationsPanel(): void {
    this.isStationsPanelExpanded.update(v => !v);
  }

  getTempsAttenteInfo(p: Prestation): { minutes: number; label: string; level: 'normal' | 'warning' | 'critical' } {
    const debutStr = p.dateHeureDebut || p.datePrestation;
    if (!debutStr) {
      return { minutes: 0, label: '< 1 min', level: 'normal' };
    }
    const diffMs = this.currentTime() - new Date(debutStr).getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60000));

    if (minutes < 10) {
      return { minutes, label: `${minutes} min`, level: 'normal' };
    } else if (minutes < 20) {
      return { minutes, label: `${minutes} min`, level: 'warning' };
    } else {
      return { minutes, label: `${minutes} min • Retard`, level: 'critical' };
    }
  }

  getTempsEcouleFauteuil(p: Prestation): string {
    const debutStr = p.dateHeureDebut || p.datePrestation;
    if (!debutStr) return '< 1 min';
    const diffMs = this.currentTime() - new Date(debutStr).getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60000));
    return `${minutes} min`;
  }

  // Interaction directe au clic sur une Station 3D
  clicSurFauteuilStation(station: FauteuilStation): void {
    if (station.isOccupe) {
      if (station.prestationEnCours) {
        this.terminerPrestation(station.prestationEnCours);
      }
      return;
    }

    // Le fauteuil est libre :
    const waiting = this.prestationsEnAttente();
    if (waiting.length === 0) {
      // Aucun client en attente -> Proposer Walk-in direct au fauteuil
      this.walkInCoiffeurId = station.coiffeur.affectationId;
      this.ouvrirModalWalkIn('EN_COURS');
      return;
    }

    if (waiting.length === 1) {
      // 1 seul client en attente -> Assigner directement sur ce fauteuil
      const clientPrestation = waiting[0];
      this.installerClientDirectSurCoiffeur(clientPrestation, station.coiffeur.affectationId);
      return;
    }

    // Plusieurs clients en attente -> Ouvrir le sélecteur rapide de client
    this.targetStationForAssign = station;
    this.isStationAssignModalOpen.set(true);
  }

  ouvrirModalSelectionClientPourFauteuil(station: FauteuilStation): void {
    this.targetStationForAssign = station;
    this.isStationAssignModalOpen.set(true);
  }

  fermerModalSelectionClientPourFauteuil(): void {
    this.targetStationForAssign = null;
    this.isStationAssignModalOpen.set(false);
  }

  assignerClientSurStation(p: Prestation): void {
    if (!this.targetStationForAssign) return;
    const coiffeurId = this.targetStationForAssign.coiffeur.affectationId;
    this.isSubmittingStationAssign.set(true);
    this.installerClientDirectSurCoiffeur(p, coiffeurId, () => {
      this.isSubmittingStationAssign.set(false);
      this.fermerModalSelectionClientPourFauteuil();
    });
  }

  private installerClientDirectSurCoiffeur(p: Prestation, coiffeurAffectationId: number, callback?: () => void): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (this.isCoiffeurOccupe(coiffeurAffectationId)) {
      this.notificationService.error('Ce coiffeur est déjà occupé au fauteuil.', 'Coiffeur Occupé');
      if (callback) callback();
      return;
    }

    this.receptionnisteService.demarrerPrestation(slug, p.id, coiffeurAffectationId).subscribe({
      next: () => {
        if (callback) callback();
        const clientNom = p.prenomClient ? `${p.prenomClient} ${p.nomClient || ''}` : (p.clientNom || 'Le client');
        this.notificationService.success(`${clientNom} a été installé au fauteuil avec succès.`, 'Prestation Démarrée');
        this.chargerDonnees();
      },
      error: (err) => {
        if (callback) callback();
        const msg = err.error?.message || 'Erreur lors de l’installation au fauteuil';
        this.notificationService.error(msg, 'Erreur');
      }
    });
  }

  getCoiffeursLibres(): ProfilCoiffeur[] {
    return this.coiffeurs().filter(c => !this.isCoiffeurOccupe(c.affectationId));
  }

  // --- Actions sur Prestations ---

  installerAuFauteuil(p: Prestation): void {
    const slug = this.slugSalon;
    if (!slug) return;

    // Si la personne a DÉJÀ un coiffeur associé : PAS DE MODAL ! Démarrage direct
    if (p.coiffeurAffectationId) {
      if (this.isCoiffeurOccupe(p.coiffeurAffectationId)) {
        this.notificationService.error(
          'Le coiffeur assigné est actuellement occupé au fauteuil. Veuillez choisir un autre coiffeur ou patienter.',
          'Coiffeur Occupé'
        );
        // Ouvrir le modal dans ce cas pour permettre de choisir un autre coiffeur
        this.prestationToInstall = p;
        this.selectedChairCoiffeurId = null;
        this.isInstallChairModalOpen.set(true);
        return;
      }

      this.receptionnisteService.demarrerPrestation(slug, p.id, p.coiffeurAffectationId).subscribe({
        next: () => {
          this.notificationService.success('Le client a été installé au fauteuil avec succès.', 'Prestation Démarrée');
          this.chargerDonnees();
        },
        error: (err) => {
          const msg = err.error?.message || 'Erreur lors du passage au fauteuil';
          this.notificationService.error(msg, 'Erreur');
        }
      });
      return;
    }

    // Dans le cas contraire (aucun coiffeur) : le réceptionniste doit choisir un coiffeur (pas de premier coiffeur par défaut)
    this.prestationToInstall = p;
    this.selectedChairCoiffeurId = null;
    this.isInstallChairModalOpen.set(true);
  }

  fermerModalInstallChair(): void {
    this.isInstallChairModalOpen.set(false);
    this.prestationToInstall = null;
    this.selectedChairCoiffeurId = null;
  }

  confirmerInstallationFauteuil(): void {
    const slug = this.slugSalon;
    if (!slug || !this.prestationToInstall) return;

    if (!this.selectedChairCoiffeurId) {
      this.notificationService.warning('Veuillez sélectionner un coiffeur disponible pour ce fauteuil.', 'Coiffeur requis');
      return;
    }

    if (this.isCoiffeurOccupe(this.selectedChairCoiffeurId)) {
      this.notificationService.error('Ce coiffeur est déjà occupé au fauteuil avec un autre client.', 'Coiffeur occupé');
      return;
    }

    this.isSubmittingInstallChair.set(true);
    this.receptionnisteService.demarrerPrestation(slug, this.prestationToInstall.id, this.selectedChairCoiffeurId).subscribe({
      next: () => {
        this.isSubmittingInstallChair.set(false);
        this.fermerModalInstallChair();
        this.notificationService.success('Le client a été installé au fauteuil avec succès.', 'Prestation Démarrée');
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingInstallChair.set(false);
        const msg = err.error?.message || 'Erreur lors du passage au fauteuil';
        this.notificationService.error(msg, 'Erreur');
      }
    });
  }

  // --- Gestion et synchronisation des Rendez-vous du jour ---

  toggleRdvPanel(): void {
    this.isRdvPanelExpanded.update(v => !v);
  }

  isRdvAlreadyInQueue(rdvId: number): boolean {
    return this.prestationsEnAttente().some(p => p.rendezVousId === rdvId)
        || this.prestationsEnCours().some(p => p.rendezVousId === rdvId);
  }

  pointerArriveeRDV(rdv: PlanningRendezVousDto): void {
    const slug = this.slugSalon;
    if (!slug) return;

    const rdvId = rdv.rdvId || rdv.id;
    if (!rdvId) return;

    this.receptionnisteService.pointerArriveeRendezVous(slug, rdvId).subscribe({
      next: () => {
        const pNom = rdv.prenomClient || rdv.clientPrenom || '';
        const nNom = rdv.nomClient || rdv.clientNom || '';
        this.notificationService.success(`${pNom} ${nNom} a été placé en salle d'attente.`, 'Arrivée Enregistrée');
        this.chargerDonnees();
      },
      error: (err) => {
        const msg = err.error?.message || 'Erreur lors de l’enregistrement de l’arrivée';
        this.notificationService.error(msg, 'Erreur');
      }
    });
  }

  ouvrirModalPermuter(rdv: PlanningRendezVousDto): void {
    this.rdvToPermute = rdv;
    const autreLibre = this.coiffeurs().find(c => c.affectationId !== rdv.coiffeurAffectationId && !this.isCoiffeurOccupe(c.affectationId));
    this.nouveauCoiffeurPermutationId = autreLibre ? autreLibre.affectationId : null;
    this.isPermuterModalOpen.set(true);
  }

  fermerModalPermuter(): void {
    this.isPermuterModalOpen.set(false);
    this.rdvToPermute = null;
    this.nouveauCoiffeurPermutationId = null;
  }

  confirmerPermutation(): void {
    const slug = this.slugSalon;
    const targetRdvId = this.rdvToPermute?.rdvId || this.rdvToPermute?.id;
    if (!slug || !targetRdvId || !this.nouveauCoiffeurPermutationId) {
      this.notificationService.warning('Veuillez sélectionner le nouveau coiffeur.', 'Coiffeur requis');
      return;
    }

    this.isSubmittingPermuter.set(true);
    this.receptionnisteService.permuterCoiffeurRendezVous(slug, targetRdvId, this.nouveauCoiffeurPermutationId).subscribe({
      next: () => {
        this.isSubmittingPermuter.set(false);
        this.fermerModalPermuter();
        this.notificationService.success('Le coiffeur du rendez-vous a été permuté avec succès.', 'Permutation Réussie');
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingPermuter.set(false);
        const msg = err.error?.message || 'Erreur lors de la permutation du coiffeur';
        this.notificationService.error(msg, 'Erreur');
      }
    });
  }

  ouvrirModalNotifierRetard(rdv: PlanningRendezVousDto): void {
    this.rdvToNotify = rdv;
    const clientPrenom = rdv.prenomClient || rdv.clientPrenom || 'Cher client';
    const coiffeurNom = rdv.coiffeurPrenom ? `${rdv.coiffeurPrenom} ${rdv.coiffeurNom || ''}` : 'votre coiffeur';
    const rawDate = rdv.dateHeureDebut || rdv.dateHeurePrevue;
    const heure = rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'prévue';

    this.customMessageNotification = `Bonjour ${clientPrenom},\nEn raison d'une forte affluence au salon, votre prise en charge par ${coiffeurNom} prévue à ${heure} aura un léger retard d'environ 15 minutes.\nNous mettons tout en œuvre pour vous installer au plus vite. Merci de votre compréhension et à tout de suite !`;
    this.isNotifierRetardModalOpen.set(true);
  }

  fermerModalNotifierRetard(): void {
    this.isNotifierRetardModalOpen.set(false);
    this.rdvToNotify = null;
    this.customMessageNotification = '';
  }

  confirmerEnvoiNotificationRetard(): void {
    const slug = this.slugSalon;
    const targetRdvId = this.rdvToNotify?.rdvId || this.rdvToNotify?.id;
    if (!slug || !targetRdvId) return;

    if (!this.customMessageNotification.trim()) {
      this.notificationService.warning('Le message de notification ne peut pas être vide.', 'Message requis');
      return;
    }

    this.isSubmittingNotification.set(true);
    this.receptionnisteService.notifierRetardClient(slug, targetRdvId, this.customMessageNotification.trim()).subscribe({
      next: () => {
        this.isSubmittingNotification.set(false);
        this.fermerModalNotifierRetard();
        this.notificationService.success(`Notification de retard envoyée avec succès au client.`, 'Notification Envoyée');
      },
      error: (err) => {
        this.isSubmittingNotification.set(false);
        const msg = err.error?.message || 'Erreur lors de l’envoi de la notification';
        this.notificationService.error(msg, 'Erreur');
      }
    });
  }

  terminerPrestation(p: Prestation): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!confirm('Confirmez-vous que la coiffure est terminée et prête pour l’encaissement ?')) return;

    this.receptionnisteService.terminerPrestation(slug, p.id).subscribe({
      next: () => {
        this.notificationService.success('Prestation terminée. La facture est maintenant prête au comptoir.', 'Prestation Terminée');
        this.chargerDonnees();
      },
      error: (err) => {
        const msg = err.error?.message || 'Erreur lors de la clôture de la prestation';
        this.notificationService.error(msg, 'Erreur');
      }
    });
  }

  annulerPrestation(p: Prestation): void {
    const slug = this.slugSalon;
    if (!slug) return;

    const motif = prompt('Veuillez indiquer le motif d’annulation :');
    if (!motif || !motif.trim()) return;

    this.receptionnisteService.annulerPrestation(slug, p.id, motif.trim()).subscribe({
      next: () => {
        this.notificationService.success('La prestation a été annulée avec succès.', 'Prestation Annulée');
        this.chargerDonnees();
      },
      error: (err) => {
        const msg = err.error?.message || 'Erreur lors de l’annulation de la prestation';
        this.notificationService.error(msg, 'Erreur');
      }
    });
  }

  // --- Modal Encaissement ---

  ouvrirModalEncaissement(facture: Facture): void {
    this.selectedFacture = facture;
    const resteAPayer = facture.resteAPayer !== undefined ? Number(facture.resteAPayer) : Number(facture.montantTotal);
    this.encaissementDto = {
      montant: resteAPayer > 0 ? resteAPayer : Number(facture.montantTotal),
      type: 'SOLDE',
      modePaiement: 'ESPECES',
      referencePaiement: ''
    };
    this.montantRemisParClient = this.encaissementDto.montant;
    this.isEncaissementModalOpen.set(true);
  }

  fermerModalEncaissement(): void {
    this.selectedFacture = null;
    this.isEncaissementModalOpen.set(false);
  }

  definirMontantRemis(montant: number): void {
    this.montantRemisParClient = montant;
  }

  validerEncaissement(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedFacture) return;

    const s = this.sessionCourante();
    const isCaisseActive = !!s && (s.statut === 'EN_COURS' || s.statut === 'OUVERTE');
    if (!isCaisseActive) {
      this.notificationService.warning('La caisse du salon doit être ouverte pour encaisser.', 'Caisse Fermée');
      return;
    }

    if (this.encaissementDto.montant <= 0) {
      this.notificationService.warning('Le montant à encaisser doit être supérieur à zéro.', 'Encaissement');
      return;
    }

    this.isSubmittingEncaissement.set(true);
    this.errorMessage.set(null);

    const factureAEncaisser = this.selectedFacture;
    const resteAPayer = Number(factureAEncaisser.resteAPayer !== undefined ? factureAEncaisser.resteAPayer : factureAEncaisser.montantTotal);
    const typePaiement = (this.encaissementDto.montant < resteAPayer) ? 'ACOMPTE' : (this.encaissementDto.type || 'SOLDE');

    const payload: PaiementRecepteurDto = {
      ...this.encaissementDto,
      type: typePaiement,
      moyenPaiement: this.encaissementDto.modePaiement,
      modePaiement: this.encaissementDto.modePaiement
    };

    this.receptionnisteService.encaisserPaiement(slug, factureAEncaisser.id, payload).subscribe({
      next: (res) => {
        this.isSubmittingEncaissement.set(false);
        this.fermerModalEncaissement();
        this.notificationService.success(`Paiement de ${this.encaissementDto.montant.toLocaleString('fr-FR')} FCFA validé avec succès !`, 'Encaissement Réussi');
        
        // Ouvrir le reçu
        this.ticketFacture = factureAEncaisser;
        this.isTicketModalOpen.set(true);

        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingEncaissement.set(false);
        const errMsg = err.error?.message || 'Erreur lors de l’encaissement du paiement';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur Encaissement');
      }
    });
  }

  // --- Modal Walk-in Express ---

  ouvrirModalWalkIn(statut: 'EN_ATTENTE' | 'EN_COURS' = 'EN_ATTENTE'): void {
    this.walkInStatutChoisi = statut;
    this.walkInNom = '';
    this.walkInPrenom = '';
    this.walkInTel = '';
    this.walkInClientCompteId = undefined;
    this.selectedClientExistant = null;
    this.clientSearchQuery = '';
    this.clientSearchResults.set([]);
    this.walkInCoiffeurId = null; // Aucun premier coiffeur par défaut : le réceptionniste doit le choisir
    this.selectedVariantesWalkIn.set([]);
    this.selectedVarianteToAdd = null;
    this.isWalkInModalOpen.set(true);
  }

  fermerModalWalkIn(): void {
    this.isWalkInModalOpen.set(false);
  }

  rechercherClientsRapides(): void {
    const q = this.clientSearchQuery.trim();
    if (!q || q.length < 2) {
      this.clientSearchResults.set([]);
      return;
    }

    const slug = this.slugSalon;
    if (!slug) return;

    this.isSearchingClients.set(true);
    this.receptionnisteService.rechercherClients(slug, q).subscribe({
      next: (res) => {
        this.isSearchingClients.set(false);
        if (res.data) {
          this.clientSearchResults.set(res.data);
        }
      },
      error: () => {
        this.isSearchingClients.set(false);
      }
    });
  }

  selectionnerClientRapide(client: ClientRapide): void {
    this.selectedClientExistant = client;
    this.walkInClientCompteId = client.id;
    this.walkInNom = client.nom;
    this.walkInPrenom = client.prenom;
    this.walkInTel = client.telephone;
    this.clientSearchResults.set([]);
    this.notificationService.info(`Client ${client.prenom} ${client.nom} sélectionné`, 'Client Identifié');
  }

  reinitialiserClientSelectionne(): void {
    this.selectedClientExistant = null;
    this.walkInClientCompteId = undefined;
    this.walkInNom = '';
    this.walkInPrenom = '';
    this.walkInTel = '';
    this.clientSearchQuery = '';
    this.clientSearchResults.set([]);
  }

  ajouterVarianteWalkIn(): void {
    if (!this.selectedVarianteToAdd) return;
    const vId = Number(this.selectedVarianteToAdd);
    const variante = this.allVariantes().find((v) => v.id === vId);
    if (!variante) return;

    if (!this.selectedVariantesWalkIn().some((v) => v.id === vId)) {
      this.selectedVariantesWalkIn.update((list) => [...list, variante]);
    }
    this.selectedVarianteToAdd = null;
  }

  retirerVarianteWalkIn(varianteId: number): void {
    this.selectedVariantesWalkIn.update((list) => list.filter((v) => v.id !== varianteId));
  }

  validerWalkIn(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (this.walkInStatutChoisi === 'EN_COURS') {
      if (!this.walkInCoiffeurId) {
        this.notificationService.warning('Veuillez sélectionner un coiffeur pour démarrer directement au fauteuil.', 'Coiffeur requis');
        return;
      }
      if (this.isCoiffeurOccupe(this.walkInCoiffeurId)) {
        this.notificationService.error('Ce coiffeur est déjà occupé au fauteuil avec un client. Veuillez choisir un coiffeur libre ou placer le client en salle d’attente.', 'Coiffeur occupé');
        return;
      }
    }

    if (!this.walkInNom.trim() || !this.walkInPrenom.trim()) {
      this.notificationService.warning('Le prénom et le nom du client sont obligatoires.', 'Client Walk-in');
      return;
    }

    if (this.selectedVariantesWalkIn().length === 0) {
      this.notificationService.warning('Veuillez sélectionner au moins une prestation dans le catalogue.', 'Client Walk-in');
      return;
    }

    this.isSubmittingWalkIn.set(true);

    const lignes = this.selectedVariantesWalkIn().map((v, idx) => ({
      varianteServiceId: v.id,
      prixReel: v.prix,
      varianteId: v.id,
      ordre: idx + 1
    }));

    const req: PrestationCreateDto = {
      coiffeurAffectationId: this.walkInCoiffeurId ? Number(this.walkInCoiffeurId) : undefined,
      clientCompteId: this.walkInClientCompteId,
      nomClient: this.walkInNom.trim(),
      prenomClient: this.walkInPrenom.trim(),
      telephoneClient: this.walkInTel.trim() || '770000000',
      statut: this.walkInStatutChoisi,
      lignes: lignes
    };

    this.receptionnisteService.creerPrestation(slug, req).subscribe({
      next: () => {
        this.isSubmittingWalkIn.set(false);
        this.fermerModalWalkIn();
        const actionLabel = this.walkInStatutChoisi === 'EN_ATTENTE' ? 'placé en salle d’attente' : 'installé au fauteuil';
        this.notificationService.success(`Client ${this.walkInPrenom} ${this.walkInNom} ${actionLabel} avec succès !`, 'Walk-in Enregistré');
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingWalkIn.set(false);
        const errMsg = err.error?.message || 'Erreur lors de l’enregistrement du client Walk-in';
        this.notificationService.error(errMsg, 'Erreur');
      }
    });
  }

  // --- Ticket & Impression ---

  fermerModalTicket(): void {
    this.ticketFacture = null;
    this.isTicketModalOpen.set(false);
  }

  imprimerTicket(): void {
    window.print();
  }

  // Helper filtrage
  getPrestationLabel = (p: Prestation): string => {
    const nom = (p.prenomClient && p.nomClient) ? `${p.prenomClient} ${p.nomClient}` : (p.clientNom || '');
    const service = (p.lignes && p.lignes[0]?.varianteNom) || '';
    const coiffeur = p.coiffeurPrenom || '';
    return `${nom} ${service} ${coiffeur}`;
  };

  getFactureLabel = (f: Facture): string => {
    return `${f.clientNom || ''} ${f.numeroFacture || ''}`;
  };

  filtrerListe<T>(items: T[], getLabel: (item: T) => string): T[] {
    if (!this.searchQuery.trim()) return items;
    const q = this.searchQuery.toLowerCase().trim();
    return items.filter((item) => getLabel(item).toLowerCase().includes(q));
  }
}

