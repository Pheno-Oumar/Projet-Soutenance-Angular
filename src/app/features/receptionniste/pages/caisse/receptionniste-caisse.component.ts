import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ReceptionnisteService } from '../../services/receptionniste.service';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  Prestation,
  Facture,
  SessionCaisse,
  PrestationCreateDto,
  PaiementRecepteurDto,
  RemboursementRecepteurDto,
  SessionCaisseOuvertureRecepteurDto,
  SessionCaisseClotureRecepteurDto,
  Paiement,
  ProfilCoiffeur,
  PrestationCatalogue,
  ClientRapide,
  RemiseFactureDto
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
  selector: 'app-receptionniste-caisse',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './receptionniste-caisse.component.html',
  styleUrl: './receptionniste-caisse.component.css'
})
export class ReceptionnisteCaisseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly receptionnisteService = inject(ReceptionnisteService);
  private readonly vitrineService = inject(VitrineService);
  private readonly notificationService = inject(NotificationService);

  readonly prestations = signal<Prestation[]>([]);
  readonly sessionCourante = signal<SessionCaisse | null>(null);
  readonly coiffeurs = signal<ProfilCoiffeur[]>([]);
  readonly catalogueServices = signal<PrestationCatalogue[]>([]);
  readonly allVariantes = signal<VarianteOption[]>([]);

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Onglet actif : 'factures' | 'journal' | 'prestations'
  activeTab: 'factures' | 'journal' | 'prestations' = 'factures';

  // Filtre statut prestations
  selectedStatut: string = 'TOUTES';

  // Liste et filtre factures
  readonly factures = signal<Facture[]>([]);
  readonly isLoadingFactures = signal<boolean>(false);
  selectedFactureFiltre: string = 'TOUTES';

  // Modal Session Caisse - Ouverture
  readonly isOuvertureModalOpen = signal<boolean>(false);
  ouvertureDto: SessionCaisseOuvertureRecepteurDto = {
    soldeOuverture: 0,
    notes: ''
  };
  readonly isSubmittingOuverture = signal<boolean>(false);

  // Modal Session Caisse - Clôture
  readonly isClotureModalOpen = signal<boolean>(false);
  clotureDto: SessionCaisseClotureRecepteurDto = {
    soldeFermeture: 0,
    notes: ''
  };
  readonly isSubmittingCloture = signal<boolean>(false);

  // Modal Nouvelle Prestation Walk-in
  readonly isNewPrestationModalOpen = signal<boolean>(false);
  walkInStatutChoisi: 'EN_COURS' | 'EN_ATTENTE' = 'EN_COURS';
  newPrestation: PrestationCreateDto = {
    coiffeurAffectationId: 0,
    nomClient: '',
    prenomClient: '',
    telephoneClient: '',
    lignes: []
  };
  selectedVarianteToAdd: number | null = null;
  readonly selectedVariantesWalkIn = signal<VarianteOption[]>([]);
  readonly isSubmittingPrestation = signal<boolean>(false);

  // Recherche rapide client dans modal walk-in
  clientSearchQuery = '';
  readonly clientSearchResults = signal<ClientRapide[]>([]);
  readonly isSearchingClients = signal<boolean>(false);
  selectedClientExistant: ClientRapide | null = null;

  // Totaux calculés pour Walk-in
  readonly totalWalkInPrix = computed(() =>
    this.selectedVariantesWalkIn().reduce((acc, v) => acc + (v.prix || 0), 0)
  );
  readonly totalWalkInDuree = computed(() =>
    this.selectedVariantesWalkIn().reduce((acc, v) => acc + (v.dureeMinutes || 0), 0)
  );

  // Modal Encaissement
  readonly isEncaissementModalOpen = signal<boolean>(false);
  selectedFactureId: number | null = null;
  selectedFacture: Facture | null = null;
  selectedPrestationPourEncaissement: Prestation | null = null;
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

  // Modal Encaissement Express
  readonly isEncaissementRapideModalOpen = signal<boolean>(false);
  factureNumeroOuIdRecherche: string = '';
  readonly facturesImpayees = computed(() =>
    this.factures().filter((f) => (f.resteAPayer === undefined || f.resteAPayer > 0) && f.statut !== 'PAYEE')
  );

  // Modal Ticket / Reçu de caisse imprimable
  readonly isTicketModalOpen = signal<boolean>(false);
  ticketFacture: Facture | null = null;
  ticketPrestation: Prestation | null = null;

  // Modal Remboursement
  readonly isRemboursementModalOpen = signal<boolean>(false);
  selectedPaiement: Paiement | null = null;
  selectedPaiementId: number | null = null;
  remboursementDto: RemboursementRecepteurDto = {
    montant: 0,
    motif: '',
    annulerPrestation: false
  };
  readonly isSubmittingRemboursement = signal<boolean>(false);

  // Modal Détail Facture
  readonly isFactureModalOpen = signal<boolean>(false);
  detailFacture: Facture | null = null;
  readonly isLoadingFacture = signal<boolean>(false);

  // Modal Remise Commerciale
  readonly isRemiseModalOpen = signal<boolean>(false);
  selectedFacturePourRemise: Facture | null = null;
  remiseDto: RemiseFactureDto = {
    montant: 0,
    motif: ''
  };
  readonly isSubmittingRemise = signal<boolean>(false);

  ngOnInit(): void {
    this.chargerCoiffeurs();
    this.chargerCatalogue();
    this.verifierQueryParams();
    this.chargerDonnees();
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
          if (data.length > 0 && (!this.newPrestation.coiffeurAffectationId || this.newPrestation.coiffeurAffectationId === 0)) {
            this.newPrestation.coiffeurAffectationId = data[0].affectationId;
          }
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

  private verifierQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('action') === 'nouvelle-prestation') {
      const clientCompteId = params.get('clientCompteId');
      const coiffeurIdDefaut = this.coiffeurs().length > 0 ? this.coiffeurs()[0].affectationId : 0;
      this.newPrestation = {
        clientCompteId: clientCompteId ? Number(clientCompteId) : undefined,
        nomClient: params.get('nom') || '',
        prenomClient: params.get('prenom') || '',
        telephoneClient: params.get('tel') || '',
        coiffeurAffectationId: coiffeurIdDefaut,
        lignes: []
      };
      this.isNewPrestationModalOpen.set(true);
    }
  }

  chargerDonnees(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // 1. Session de caisse courante
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

    // 2. Factures (vue principale de la caisse)
    this.chargerFactures();

    // 3. Prestations (secondaire)
    this.chargerPrestations();
  }

  chargerPrestations(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    const statutParam = this.selectedStatut === 'TOUTES' ? undefined : this.selectedStatut;
    this.receptionnisteService.listerPrestations(slug, statutParam).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.prestations.set(res.data);
        } else {
          this.prestations.set([]);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Erreur lors du chargement des prestations';
        this.errorMessage.set(msg);
        this.notificationService.error(msg, 'Caisse');
      }
    });
  }

  changerStatutFiltre(statut: string): void {
    this.selectedStatut = statut;
    this.chargerPrestations();
  }

  // --- Session Caisse : Ouverture ---

  ouvrirModalOuverture(): void {
    this.ouvertureDto = { soldeOuverture: 0, notes: '' };
    this.isOuvertureModalOpen.set(true);
  }

  fermerModalOuverture(): void {
    this.isOuvertureModalOpen.set(false);
  }

  validerOuvertureCaisse(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (this.ouvertureDto.soldeOuverture < 0) {
      this.notificationService.warning('Le fond de caisse initial ne peut pas être négatif.', 'Caisse');
      return;
    }

    this.isSubmittingOuverture.set(true);
    this.receptionnisteService.ouvrirSessionCaisse(slug, this.ouvertureDto).subscribe({
      next: (res) => {
        this.isSubmittingOuverture.set(false);
        this.fermerModalOuverture();
        this.sessionCourante.set(res.data);
        this.afficherSucces('Caisse du salon ouverte avec succès.');
      },
      error: (err) => {
        this.isSubmittingOuverture.set(false);
        const errMsg = err.error?.message || 'Impossible d\'ouvrir la caisse';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur Caisse');
      }
    });
  }

  // --- Session Caisse : Clôture ---

  ouvrirModalCloture(): void {
    this.clotureDto = {
      soldeFermeture: (this.sessionCourante()?.soldeOuverture || 0) + (this.sessionCourante()?.totalEntrees || 0),
      notes: ''
    };
    this.isClotureModalOpen.set(true);
  }

  fermerModalCloture(): void {
    this.isClotureModalOpen.set(false);
  }

  validerClotureCaisse(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (this.clotureDto.soldeFermeture < 0) {
      this.notificationService.warning('Le montant physique de clôture ne peut pas être négatif.', 'Caisse');
      return;
    }

    this.isSubmittingCloture.set(true);
    this.receptionnisteService.cloturerSessionCaisse(slug, this.clotureDto).subscribe({
      next: () => {
        this.isSubmittingCloture.set(false);
        this.fermerModalCloture();
        this.sessionCourante.set(null);
        this.afficherSucces('Caisse du salon clôturée avec succès.');
      },
      error: (err) => {
        this.isSubmittingCloture.set(false);
        const errMsg = err.error?.message || 'Erreur lors de la clôture de la caisse';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur Caisse');
      }
    });
  }

  // --- Nouvelle Prestation Walk-in ---

  ouvrirModalNouvellePrestation(): void {
    const coiffeurIdDefaut = this.coiffeurs().length > 0 ? this.coiffeurs()[0].affectationId : 0;
    this.newPrestation = {
      coiffeurAffectationId: coiffeurIdDefaut,
      nomClient: '',
      prenomClient: '',
      telephoneClient: '',
      lignes: []
    };
    this.selectedVariantesWalkIn.set([]);
    this.selectedVarianteToAdd = null;
    this.clientSearchQuery = '';
    this.clientSearchResults.set([]);
    this.selectedClientExistant = null;
    this.isNewPrestationModalOpen.set(true);
  }

  fermerModalNouvellePrestation(): void {
    this.isNewPrestationModalOpen.set(false);
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
    this.newPrestation.clientCompteId = client.id;
    this.newPrestation.nomClient = client.nom;
    this.newPrestation.prenomClient = client.prenom;
    this.newPrestation.telephoneClient = client.telephone;
    this.clientSearchResults.set([]);
    this.notificationService.info(`Client ${client.prenom} ${client.nom} sélectionné`, 'Client');
  }

  reinitialiserClientSelectionne(): void {
    this.selectedClientExistant = null;
    this.newPrestation.clientCompteId = undefined;
    this.newPrestation.nomClient = '';
    this.newPrestation.prenomClient = '';
    this.newPrestation.telephoneClient = '';
    this.clientSearchQuery = '';
    this.clientSearchResults.set([]);
  }

  ajouterVarianteWalkIn(): void {
    if (!this.selectedVarianteToAdd) return;
    const vId = Number(this.selectedVarianteToAdd);
    const variante = this.allVariantes().find((v) => v.id === vId);
    if (!variante) return;

    this.selectedVariantesWalkIn.update((list) => [...list, variante]);
    this.selectedVarianteToAdd = null;
  }

  retirerVarianteWalkIn(index: number): void {
    this.selectedVariantesWalkIn.update((list) => {
      const copy = [...list];
      copy.splice(index, 1);
      return copy;
    });
  }

  validerNouvellePrestation(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.newPrestation.coiffeurAffectationId || this.newPrestation.coiffeurAffectationId <= 0) {
      this.notificationService.warning('Veuillez sélectionner un coiffeur pour effectuer la prestation.', 'Validation');
      return;
    }

    if (!this.newPrestation.nomClient?.trim() || !this.newPrestation.prenomClient?.trim()) {
      this.notificationService.warning('Veuillez renseigner le nom et le prénom du client.', 'Validation');
      return;
    }

    if (!this.newPrestation.telephoneClient?.trim()) {
      this.notificationService.warning('Le numéro de téléphone du client est obligatoire pour créer une prestation.', 'Validation');
      return;
    }

    if (this.selectedVariantesWalkIn().length === 0) {
      this.notificationService.warning('Veuillez ajouter au moins une prestation au ticket.', 'Validation');
      return;
    }

    this.newPrestation.statut = this.walkInStatutChoisi;
    this.newPrestation.lignes = this.selectedVariantesWalkIn().map((v, idx) => ({
      varianteServiceId: v.id,
      prixReel: v.prix && v.prix > 0 ? Number(v.prix) : 1000,
      varianteId: v.id,
      ordre: idx + 1
    }));

    this.isSubmittingPrestation.set(true);
    this.receptionnisteService.creerPrestation(slug, this.newPrestation).subscribe({
      next: (res) => {
        this.isSubmittingPrestation.set(false);
        this.fermerModalNouvellePrestation();
        const statutLabel = this.walkInStatutChoisi === 'EN_ATTENTE' ? 'placée en salle d\'attente' : 'lancée en cabine';
        this.afficherSucces(`Prestation #${res.data?.id} créée avec succès (${statutLabel}) pour ${this.newPrestation.prenomClient}`);
        this.chargerPrestations();
      },
      error: (err) => {
        this.isSubmittingPrestation.set(false);
        let errMsg = err.error?.message || 'Erreur lors de la création de la prestation';
        if (err.error?.erreurs && typeof err.error.erreurs === 'object') {
          const details = Object.values(err.error.erreurs).join('\n• ');
          errMsg = `${errMsg} :\n• ${details}`;
        }
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur Prestation');
      }
    });
  }

  // --- Démarrer Prestation en Attente ---

  demarrerPrestation(prestation: Prestation): void {
    const slug = this.slugSalon;
    if (!slug) return;

    const nom = prestation.prenomClient ? `${prestation.prenomClient} ${prestation.nomClient || ''}` : (prestation.clientNom || 'le client');
    if (!confirm(`Confirmez-vous l'installation de ${nom} au fauteuil de coiffure ?`)) {
      return;
    }

    this.receptionnisteService.demarrerPrestation(slug, prestation.id).subscribe({
      next: () => {
        this.afficherSucces(`Prestation #${prestation.id} démarrée. ${nom} est installé(e) en cabine.`);
        this.chargerPrestations();
      },
      error: (err) => {
        const errMsg = err.error?.message || 'Erreur lors du démarrage de la prestation';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur');
      }
    });
  }

  // --- Annuler Prestation ---

  annulerPrestation(prestation: Prestation): void {
    const slug = this.slugSalon;
    if (!slug) return;

    const nom = prestation.prenomClient ? `${prestation.prenomClient} ${prestation.nomClient || ''}` : (prestation.clientNom || 'le client');
    const motif = prompt(`Motif de l'annulation de la prestation #${prestation.id} pour ${nom} ?`, 'Client parti / Annulation réception');
    if (motif === null) return;

    this.receptionnisteService.annulerPrestation(slug, prestation.id, motif).subscribe({
      next: () => {
        this.afficherSucces(`Prestation #${prestation.id} annulée.`);
        this.chargerPrestations();
      },
      error: (err) => {
        const errMsg = err.error?.message || 'Erreur lors de l\'annulation de la prestation';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur');
      }
    });
  }

  // --- Terminer Prestation ---

  terminerPrestation(prestation: Prestation): void {
    const slug = this.slugSalon;
    if (!slug) return;

    const nom = prestation.prenomClient ? `${prestation.prenomClient} ${prestation.nomClient || ''}` : (prestation.clientNom || 'le client');
    if (!confirm(`Confirmez-vous la finalisation de la coiffure pour ${nom} ? Sa facture sera prête pour l'encaissement.`)) {
      return;
    }

    this.receptionnisteService.terminerPrestation(slug, prestation.id).subscribe({
      next: (res) => {
        this.afficherSucces(`Prestation #${prestation.id} terminée. Prête pour encaissement.`);
        this.chargerPrestations();
        // Suggérer l'encaissement immédiat
        if (res.data?.facture?.id) {
          this.ouvrirModalEncaissement(res.data.facture.id, res.data.facture.resteAPayer || res.data.montantTotal, res.data);
        }
      },
      error: (err) => {
        const errMsg = err.error?.message || 'Erreur lors de la clôture de la prestation';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur');
      }
    });
  }

  // --- Encaissement ---

  ouvrirModalEncaissement(factureId?: number, montantSuggere?: number, prestation?: Prestation): void {
    if (!factureId) {
      const msg = 'Aucune facture associée';
      this.errorMessage.set(msg);
      this.notificationService.error(msg, 'Facturation');
      return;
    }

    const slug = this.slugSalon;
    if (!slug) return;

    this.selectedFactureId = factureId;
    this.encaissementDto = {
      montant: montantSuggere || 0,
      type: 'SOLDE',
      modePaiement: 'ESPECES',
      referencePaiement: ''
    };

    // Charger les détails de la facture pour obtenir le reste à payer exact
    this.receptionnisteService.getFacture(slug, factureId).subscribe({
      next: (res) => {
        if (res.data) {
          this.selectedFacture = res.data;
          this.encaissementDto.montant = res.data.resteAPayer > 0 ? res.data.resteAPayer : res.data.montantTotal;
        }
        this.isEncaissementModalOpen.set(true);
      },
      error: () => {
        this.isEncaissementModalOpen.set(true);
      }
    });
  }

  fermerModalEncaissement(): void {
    this.isEncaissementModalOpen.set(false);
    this.selectedFactureId = null;
    this.selectedFacture = null;
  }

  validerEncaissement(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedFactureId) return;

    const session = this.sessionCourante();
    if (!session || (session.statut !== 'EN_COURS' && (session.statut as any) !== 'OUVERTE')) {
      this.notificationService.warning("Veuillez ouvrir la session de caisse avant d'encaisser des paiements.", 'Caisse fermée');
      this.ouvrirModalOuverture();
      return;
    }

    if (this.encaissementDto.montant <= 0) {
      this.notificationService.warning('Le montant à encaisser doit être supérieur à zéro.', 'Encaissement');
      return;
    }

    // Déterminer automatiquement SOLDE ou ACOMPTE si non spécifié
    const resteDu = this.selectedFacture?.resteAPayer !== undefined ? this.selectedFacture.resteAPayer : this.encaissementDto.montant;
    if (!this.encaissementDto.type) {
      this.encaissementDto.type = (this.encaissementDto.montant < resteDu) ? 'ACOMPTE' : 'SOLDE';
    }

    this.isSubmittingEncaissement.set(true);
    const encaisseFactureId = this.selectedFactureId;
    const encaisseMontant = this.encaissementDto.montant;
    const encaisseMode = this.encaissementDto.modePaiement;

    this.receptionnisteService.encaisserPaiement(slug, this.selectedFactureId, this.encaissementDto).subscribe({
      next: () => {
        this.isSubmittingEncaissement.set(false);
        this.fermerModalEncaissement();
        this.afficherSucces(`Paiement de ${encaisseMontant} FCFA (${encaisseMode}) encaissé avec succès.`);
        this.chargerDonnees();
        if (this.activeTab === 'factures') {
          this.chargerFactures();
        }
        if (encaisseFactureId) {
          this.ouvrirTicket(encaisseFactureId);
        }
      },
      error: (err) => {
        this.isSubmittingEncaissement.set(false);
        const errMsg = err.error?.message || 'Erreur lors de l\'encaissement du paiement';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur Paiement');
      }
    });
  }

  // --- Gestion des Onglets ---

  changerOnglet(tab: 'factures' | 'journal' | 'prestations'): void {
    this.activeTab = tab;
    if (tab === 'factures') {
      this.chargerFactures();
    } else if (tab === 'prestations') {
      this.chargerPrestations();
    }
  }

  // --- Factures du Salon ---

  chargerFactures(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoadingFactures.set(true);
    let statutParam: string | undefined = undefined;
    if (this.selectedFactureFiltre === 'IMPAYEES') {
      statutParam = 'IMPAYEES';
    } else if (this.selectedFactureFiltre === 'REGLEES') {
      statutParam = 'PAYEE';
    }

    this.receptionnisteService.listerFactures(slug, statutParam).subscribe({
      next: (res) => {
        this.isLoadingFactures.set(false);
        if (res.data) {
          this.factures.set(res.data);
        } else {
          this.factures.set([]);
        }
      },
      error: () => {
        this.isLoadingFactures.set(false);
      }
    });
  }

  changerFactureFiltre(filtre: string): void {
    this.selectedFactureFiltre = filtre;
    this.chargerFactures();
  }

  // --- Monnaie et Espèces ---

  definirMontantRemis(valeur: number): void {
    this.montantRemisParClient = valeur;
  }

  // --- Reçu / Ticket de caisse imprimable ---

  ouvrirTicket(factureId: number, prestation?: Prestation): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.ticketPrestation = prestation || null;
    this.receptionnisteService.getFacture(slug, factureId).subscribe({
      next: (res) => {
        if (res.data) {
          this.ticketFacture = res.data;
          this.isTicketModalOpen.set(true);
        }
      },
      error: () => {
        this.notificationService.error('Impossible de charger le reçu de caisse', 'Reçu');
      }
    });
  }

  fermerTicket(): void {
    this.isTicketModalOpen.set(false);
    this.ticketFacture = null;
    this.ticketPrestation = null;
  }

  imprimerTicket(): void {
    window.print();
  }

  // --- Encaissement Express / Rapide ---

  ouvrirModalEncaissementRapide(): void {
    this.factureNumeroOuIdRecherche = '';
    this.isEncaissementRapideModalOpen.set(true);
  }

  fermerModalEncaissementRapide(): void {
    this.isEncaissementRapideModalOpen.set(false);
  }

  validerRechercheEncaissementRapide(): void {
    const val = this.factureNumeroOuIdRecherche.trim();
    if (!val) {
      this.notificationService.warning('Veuillez saisir un numéro ou ID de facture', 'Encaissement Rapide');
      return;
    }

    // 1. Chercher dans les factures déjà chargées localement par numéro ou ID
    const foundLocal = this.factures().find(
      (f) => (f.numeroFacture && f.numeroFacture.toLowerCase() === val.toLowerCase()) || String(f.id) === val
    );
    if (foundLocal) {
      this.fermerModalEncaissementRapide();
      this.ouvrirModalEncaissement(foundLocal.id);
      return;
    }

    // 2. Chercher dans les prestations chargées localement
    const foundPrestation = this.prestations().find(
      (p) => (p.facture?.numeroFacture && p.facture.numeroFacture.toLowerCase() === val.toLowerCase()) ||
             (p.facture?.id && String(p.facture.id) === val) ||
             (p.factureId && String(p.factureId) === val)
    );
    if (foundPrestation && (foundPrestation.facture?.id || foundPrestation.factureId)) {
      this.fermerModalEncaissementRapide();
      this.ouvrirModalEncaissement(foundPrestation.facture?.id || foundPrestation.factureId!);
      return;
    }

    // 3. Si c'est un ID numérique direct
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      this.fermerModalEncaissementRapide();
      this.ouvrirModalEncaissement(num);
      return;
    }

    // 4. Rechercher via l'API backend par numéro officiel (ex: FAC-BEAUTY-IN-BLACK-202610-40D4)
    const slug = this.slugSalon;
    if (!slug) return;

    this.receptionnisteService.rechercherFactureParNumero(slug, val).subscribe({
      next: (res) => {
        if (res.data && res.data.id) {
          this.fermerModalEncaissementRapide();
          this.ouvrirModalEncaissement(res.data.id);
        } else {
          this.notificationService.warning(`Facture « ${val} » introuvable`, 'Encaissement Rapide');
        }
      },
      error: () => {
        this.notificationService.warning(`Facture « ${val} » introuvable dans ce salon`, 'Encaissement Rapide');
      }
    });
  }

  // --- Détail Facture ---

  ouvrirDetailFacture(factureId?: number): void {
    if (!factureId) return;
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoadingFacture.set(true);
    this.isFactureModalOpen.set(true);
    this.receptionnisteService.getFacture(slug, factureId).subscribe({
      next: (res) => {
        this.isLoadingFacture.set(false);
        this.detailFacture = res.data || null;
      },
      error: (err) => {
        this.isLoadingFacture.set(false);
        const errMsg = err.error?.message || 'Impossible de charger la facture';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Facture');
      }
    });
  }

  fermerDetailFacture(): void {
    this.isFactureModalOpen.set(false);
    this.detailFacture = null;
  }

  // --- Remboursement ---

  calculerMaxRemboursable(paiement: Paiement | null): number {
    if (!paiement) return 0;
    if (paiement.montantRemboursable !== undefined && paiement.montantRemboursable !== null) {
      return paiement.montantRemboursable;
    }
    const deja = paiement.montantRembourse || 0;
    const reste = paiement.montant - deja;
    return reste > 0 ? reste : 0;
  }

  ouvrirModalRemboursement(paiement: Paiement): void {
    this.selectedPaiement = paiement;
    this.selectedPaiementId = paiement.id;
    const maxRemb = this.calculerMaxRemboursable(paiement);
    this.remboursementDto = {
      montant: maxRemb,
      motif: '',
      annulerPrestation: false
    };
    this.isRemboursementModalOpen.set(true);
  }

  fermerModalRemboursement(): void {
    this.isRemboursementModalOpen.set(false);
    this.selectedPaiement = null;
    this.selectedPaiementId = null;
  }

  validerRemboursement(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedPaiementId) return;

    if (this.remboursementDto.montant <= 0 || !this.remboursementDto.motif.trim()) {
      this.notificationService.warning('Veuillez préciser le montant et le motif du remboursement.', 'Remboursement');
      return;
    }

    const maxRemb = this.calculerMaxRemboursable(this.selectedPaiement);
    if (this.selectedPaiement && this.remboursementDto.montant > maxRemb) {
      this.notificationService.warning(
        `Le montant remboursé ne peut excéder le plafond remboursable de ${maxRemb.toLocaleString('fr-FR')} FCFA.`,
        'Plafond de Remboursement'
      );
      return;
    }

    this.isSubmittingRemboursement.set(true);
    this.receptionnisteService.effectuerRemboursement(slug, this.selectedPaiementId, this.remboursementDto).subscribe({
      next: () => {
        this.isSubmittingRemboursement.set(false);
        this.fermerModalRemboursement();
        this.afficherSucces('Remboursement effectué avec succès.');
        if (this.detailFacture) {
          this.ouvrirDetailFacture(this.detailFacture.id);
        }
        this.chargerDonnees();
        this.chargerFactures();
      },
      error: (err) => {
        this.isSubmittingRemboursement.set(false);
        const errMsg = err.error?.message || 'Erreur lors du remboursement';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur');
      }
    });
  }

  // --- Remise Commerciale ---

  ouvrirModalRemise(facture: Facture): void {
    this.selectedFacturePourRemise = facture;
    this.remiseDto = {
      montant: facture.remise || 0,
      motif: facture.motifRemise || ''
    };
    this.isRemiseModalOpen.set(true);
  }

  fermerModalRemise(): void {
    this.isRemiseModalOpen.set(false);
    this.selectedFacturePourRemise = null;
  }

  validerRemise(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedFacturePourRemise) return;

    if (this.remiseDto.montant < 0) {
      this.notificationService.warning('Le montant de la remise doit être positif ou nul.', 'Remise');
      return;
    }

    if (this.remiseDto.montant > this.selectedFacturePourRemise.montantTotal) {
      this.notificationService.warning(
        `La remise ne peut pas dépasser le montant total de la facture (${this.selectedFacturePourRemise.montantTotal.toLocaleString('fr-FR')} FCFA).`,
        'Plafond Remise'
      );
      return;
    }

    if (this.remiseDto.montant > 0 && !this.remiseDto.motif.trim()) {
      this.notificationService.warning('Veuillez renseigner le motif de la remise.', 'Remise');
      return;
    }

    this.isSubmittingRemise.set(true);
    this.receptionnisteService.appliquerRemise(slug, this.selectedFacturePourRemise.id, this.remiseDto).subscribe({
      next: (res) => {
        this.isSubmittingRemise.set(false);
        this.fermerModalRemise();
        this.afficherSucces('Remise appliquée avec succès sur la facture.');
        if (this.detailFacture && this.detailFacture.id === res.data?.id) {
          this.detailFacture = res.data;
        }
        this.chargerDonnees();
        this.chargerFactures();
      },
      error: (err) => {
        this.isSubmittingRemise.set(false);
        const errMsg = err.error?.message || "Erreur lors de l'application de la remise";
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur');
      }
    });
  }

  private afficherSucces(message: string): void {
    this.successMessage.set(message);
    this.notificationService.success(message, 'Caisse Salon');
    setTimeout(() => this.successMessage.set(null), 5000);
  }
}
