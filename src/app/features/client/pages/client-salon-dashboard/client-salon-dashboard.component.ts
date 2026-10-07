import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClientSalonService } from '../../../../core/services/client-salon.service';
import { ClientPlateformeService } from '../../../../core/services/client-plateforme.service';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { PanierService } from '../../../../core/services/panier.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { GuestStorageService } from '../../../../core/services/guest-storage.service';
import {
  RendezVous,
  RendezVousCreateDto,
  Prestation,
  Paiement,
  Commande,
  FavoriCoiffeur,
  AvisSalon,
  AvisPrestation,
  Reclamation,
  Salon,
  Compte,
  CompteUpdateDto,
  ProfilCapillaire,
  ProfilCapillaireDto
} from '../../../../shared/models';

import { MatIconModule } from '@angular/material/icon';

export type ClientSalonTab =
  | 'RENDEZ_VOUS'
  | 'COMMANDES'
  | 'PRESTATIONS'
  | 'PAIEMENTS'
  | 'FAVORIS'
  | 'AVIS'
  | 'RECLAMATIONS'
  | 'PROFIL_CAPILLAIRE'
  | 'COMPTE';

export type RdvFilter = 'ALL' | 'A_VENIR' | 'TERMINES' | 'ANNULES';
export type CommandeFilter = 'ALL' | 'EN_COURS' | 'PRETES' | 'RECUPEREES';

@Component({
  selector: 'app-client-salon-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule
  ],
  templateUrl: './client-salon-dashboard.component.html',
  styleUrls: ['./client-salon-dashboard.component.css']
})
export class ClientSalonDashboardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientSalonService = inject(ClientSalonService);
  private readonly clientPlateformeService = inject(ClientPlateformeService);
  private readonly vitrineService = inject(VitrineService);
  readonly panierService = inject(PanierService);
  readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly guestStorage = inject(GuestStorageService);

  readonly salon = signal<Salon | null>(null);
  readonly activeTab = signal<ClientSalonTab>('RENDEZ_VOUS');

  // Filters
  readonly rdvFilter = signal<RdvFilter>('ALL');
  readonly commandeFilter = signal<CommandeFilter>('ALL');

  // Salon-specific datasets
  readonly rendezVous = signal<RendezVous[]>([]);
  readonly prestations = signal<Prestation[]>([]);
  readonly paiements = signal<Paiement[]>([]);
  readonly commandes = signal<Commande[]>([]);
  readonly coiffeursFavoris = signal<FavoriCoiffeur[]>([]);
  readonly avisPrestations = signal<AvisPrestation[]>([]);
  readonly monAvis = signal<AvisSalon | null>(null);
  readonly reclamations = signal<Reclamation[]>([]);

  // Platform client datasets
  readonly compte = signal<Compte | null>(null);
  readonly profilCapillaire = signal<ProfilCapillaire | null>(null);
  readonly chargement = signal<boolean>(true);
  readonly compteDesactiveParSalon = signal<boolean>(false);

  // Forms
  compteForm: CompteUpdateDto = {
    prenom: '',
    nom: '',
    dateNaissance: '',
    telephone: ''
  };
  savingCompte = false;

  profilForm: ProfilCapillaireDto = {
    typeCheveux: '',
    texture: '',
    longueur: '',
    cuirChevelu: '',
    sensibilites: '',
    allergiesProduits: '',
    observations: ''
  };
  savingProfil = false;

  // PIN Code 6 Chiffres (Coffre-fort Coiffeur Pass)
  pinDigits: string[] = ['', '', '', '', '', ''];
  showPin = false;
  savingPin = false;

  get pinCode(): string {
    return this.pinDigits.join('');
  }

  motDePasseForm = {
    ancienMotDePasse: '',
    nouveauMotDePasse: '',
    confirmMotDePasse: ''
  };
  savingPassword = false;

  // Annulation modal
  cancelModalOpen = false;
  selectedRdvToCancel: RendezVous | null = null;
  cancelMotif = '';
  submittingCancel = false;

  // Avis Prestation modal
  avisPrestationModalOpen = false;
  selectedPrestationForAvis: Prestation | null = null;
  selectedLigneId: number | null = null;
  selectedPrestationNom = '';
  avisNote = 5;
  avisCommentaire = '';
  submittingAvisPrestation = false;

  // Avis Salon inline
  salonAvisNote = 5;
  salonAvisCommentaire = '';
  submittingAvisSalon = false;

  // Réclamation modal
  reclamationModalOpen = false;
  reclamationObjet = '';
  reclamationDescription = '';
  submittingReclamation = false;

  // Types de cheveux africains & texturés
  readonly hairTypes = [
    { code: '4C', label: '4C • Crépus Z', desc: 'Frisures serrées en Z, volume naturel dense' },
    { code: '4B', label: '4B • Crépus serrés', desc: 'Boucles serrées en accordéon' },
    { code: '4A', label: '4A • Crépus souples', desc: 'Spirales définies en S très serré' },
    { code: '3C', label: '3C • Frisés serrés', desc: 'Boucles spirales de la taille d’un crayon' },
    { code: '3B', label: '3B • Frisés volumineux', desc: 'Boucles rebondies et élastiques' },
    { code: '3A', label: '3A • Bouclés amples', desc: 'Larges boucles en spirales souples' },
    { code: '2C', label: '2C • Ondulés épais', desc: 'Ondulations marquées' },
    { code: '2B', label: '2B • Ondulés moyens', desc: 'Ondulations en S' },
    { code: '1A', label: '1A-2A • Lisses / Souples', desc: 'Cheveux soyeux ou légèrement ondulés' }
  ];

  readonly textures = ['Fins', 'Moyens', 'Épais', 'Très denses / volumineux'];
  readonly longueurs = ['Courts', 'Mi-longs', 'Longs', 'Très longs (Locks/Tresses)'];
  readonly etatsCuirChevelu = ['Sain / Normal', 'Sec / Sensible', 'Gras', 'Avec pellicules / Prurit'];

  // Computed KPIs & Helpers
  readonly rdvsAVenir = computed(() => {
    return this.rendezVous().filter((r) => r.statut !== 'ANNULE' && r.statut !== 'TERMINE');
  });

  readonly rdvsFiltres = computed(() => {
    const f = this.rdvFilter();
    const list = this.rendezVous();
    if (f === 'A_VENIR') return list.filter((r) => r.statut !== 'ANNULE' && r.statut !== 'TERMINE');
    if (f === 'TERMINES') return list.filter((r) => r.statut === 'TERMINE');
    if (f === 'ANNULES') return list.filter((r) => r.statut === 'ANNULE');
    return list;
  });

  readonly commandesEnCours = computed(() => {
    return this.commandes().filter(
      (c) => c.statut !== 'RECUPEREE' && c.statut !== 'ANNULEE' && c.statut !== 'REJETEE'
    );
  });

  readonly commandesPretes = computed(() => {
    return this.commandes().filter((c) => c.statut === 'VALIDEE');
  });

  readonly commandesFiltrees = computed(() => {
    const f = this.commandeFilter();
    const list = this.commandes();
    if (f === 'EN_COURS') return this.commandesEnCours();
    if (f === 'PRETES') return this.commandesPretes();
    if (f === 'RECUPEREES') return list.filter((c) => c.statut === 'RECUPEREE');
    return list;
  });

  readonly rdvImminent = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.rdvsAVenir().find((r) => r.dateHeure && r.dateHeure.startsWith(today));
  });

  readonly totalDepenses = computed(() => {
    const prestTotal = this.prestations().reduce((acc, p) => acc + (p.montantTotal || 0), 0);
    const cmdTotal = this.commandes().reduce((acc, c) => acc + (c.montantTotal || 0), 0);
    return prestTotal + cmdTotal;
  });

  get slugSalon(): string {
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const s = r.snapshot.paramMap.get('slugSalon');
      if (s) return s;
      r = r.parent;
    }
    return '';
  }

  get userName(): string {
    const user = this.authService.currentUser();
    return user ? `${user.prenom} ${user.nom}` : 'Cher client';
  }

  get userInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'C';
    const first = user.prenom ? user.prenom.charAt(0) : '';
    const last = user.nom ? user.nom.charAt(0) : '';
    return (first + last).toUpperCase() || 'C';
  }

  ngOnInit(): void {
    const slug = this.slugSalon;
    if (slug) {
      this.panierService.chargerPanier(slug);
      this.chargerInfosSalon();
      this.verifierEtFinaliserReservationEnAttente();
      this.chargerToutesDonnees();
    }

    this.route.data.subscribe((data) => {
      if (data['tab']) {
        this.activeTab.set(data['tab'] as ClientSalonTab);
      }
    });
  }

  setTab(tab: ClientSalonTab): void {
    this.activeTab.set(tab);
    const tabRoutes: Record<ClientSalonTab, string> = {
      RENDEZ_VOUS: 'rdv',
      COMMANDES: 'commandes',
      PRESTATIONS: 'prestations',
      PAIEMENTS: 'paiements',
      FAVORIS: 'favoris',
      AVIS: 'avis',
      RECLAMATIONS: 'reclamations',
      PROFIL_CAPILLAIRE: 'profil-capillaire',
      COMPTE: 'compte'
    };
    const sub = tabRoutes[tab] || 'rdv';
    this.router.navigate(['/' + this.slugSalon + '/client/' + sub]);
  }

  private chargerInfosSalon(): void {
    this.vitrineService.getInfosSalon(this.slugSalon).subscribe({
      next: (s) => this.salon.set(s),
      error: () => console.warn('Impossible de charger les métadonnées du salon')
    });
  }

  chargerToutesDonnees(): void {
    this.chargement.set(true);

    // 1. Rendez-vous dans ce salon
    this.clientSalonService.listerMesRendezVous(this.slugSalon).subscribe({
      next: (rdvs) => this.rendezVous.set(rdvs || []),
      error: (err) => {
        if (err.status === 403) {
          this.compteDesactiveParSalon.set(true);
        }
      }
    });

    // 2. Commandes Click & Collect dans ce salon
    this.clientSalonService.listerCommandes(this.slugSalon).subscribe({
      next: (cmds) => this.commandes.set(cmds || []),
      error: () => {}
    });

    // 3. Historique prestations dans ce salon
    this.clientSalonService.listerMesPrestations(this.slugSalon).subscribe({
      next: (prest) => this.prestations.set(prest || []),
      error: () => {}
    });

    // 4. Paiements dans ce salon
    this.clientSalonService.listerMesPaiements(this.slugSalon).subscribe({
      next: (p) => this.paiements.set(p || []),
      error: () => {}
    });

    // 5. Coiffeurs favoris dans ce salon
    this.clientSalonService.listerMesCoiffeursFavoris(this.slugSalon).subscribe({
      next: (favs) => this.coiffeursFavoris.set(favs || []),
      error: () => {}
    });

    // 6. Avis prestations dans ce salon
    this.clientSalonService.listerMesAvisPrestations(this.slugSalon).subscribe({
      next: (avis) => this.avisPrestations.set(avis || []),
      error: () => {}
    });

    // 7. Mon avis sur ce salon
    this.clientSalonService.getMonAvisSalon(this.slugSalon).subscribe({
      next: (avis) => {
        this.monAvis.set(avis);
        if (avis) {
          this.salonAvisNote = avis.note || 5;
          this.salonAvisCommentaire = avis.commentaire || '';
        }
      },
      error: () => {}
    });

    // 8. Réclamations dans ce salon
    this.clientSalonService.listerMesReclamations(this.slugSalon).subscribe({
      next: (recs) => this.reclamations.set(recs || []),
      error: () => {}
    });

    // 9. Compte client global
    this.clientPlateformeService.getCompte().subscribe({
      next: (c) => {
        this.compte.set(c);
        if (c) {
          this.compteForm = {
            prenom: c.prenom || '',
            nom: c.nom || '',
            dateNaissance: c.dateNaissance || '',
            telephone: c.telephone || ''
          };
        }
      },
      error: () => {}
    });

    // 10. Profil capillaire
    this.clientPlateformeService.getProfilCapillaire().subscribe({
      next: (p) => {
        this.profilCapillaire.set(p);
        if (p) {
          this.profilForm = {
            typeCheveux: p.typeCheveux || '',
            texture: p.texture || '',
            longueur: p.longueur || '',
            cuirChevelu: p.cuirChevelu || '',
            sensibilites: p.sensibilites || '',
            allergiesProduits: p.allergiesProduits || '',
            observations: p.observations || ''
          };
        }
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false)
    });
  }

  // --- Actions Compte Personnel ---
  enregistrerCompte(): void {
    if (!this.compteForm.prenom || !this.compteForm.nom || !this.compteForm.telephone) {
      this.notificationService.error('Veuillez renseigner votre nom, prénom et numéro de téléphone.');
      return;
    }
    this.savingCompte = true;
    this.clientPlateformeService.updateCompte(this.compteForm).subscribe({
      next: (updated) => {
        this.compte.set(updated);
        this.notificationService.success('Vos informations personnelles ont été mises à jour avec succès.');
        this.savingCompte = false;
      },
      error: (err) => {
        this.savingCompte = false;
        this.notificationService.error(err.error?.message || 'Erreur lors de la mise à jour.');
      }
    });
  }

  // --- Actions Profil Capillaire ---
  selectHairType(code: string): void {
    this.profilForm.typeCheveux = code;
  }

  selectTexture(t: string): void {
    this.profilForm.texture = t;
  }

  selectLongueur(l: string): void {
    this.profilForm.longueur = l;
  }

  selectCuirChevelu(c: string): void {
    this.profilForm.cuirChevelu = c;
  }

  enregistrerProfilCapillaire(): void {
    this.savingProfil = true;
    this.clientPlateformeService.updateProfilCapillaire(this.profilForm).subscribe({
      next: (p) => {
        this.profilCapillaire.set(p);
        this.notificationService.success('Votre diagnostic capillaire a été enregistré.');
        this.savingProfil = false;
      },
      error: (err) => {
        this.savingProfil = false;
        this.notificationService.error(err.error?.message || 'Erreur lors de l’enregistrement.');
      }
    });
  }

  // --- Gestion du Code PIN 6 Chiffres (Coiffeur Pass) ---
  onPinDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 0) {
      this.pinDigits[index] = value.charAt(value.length - 1);
      input.value = this.pinDigits[index];
      if (index < 5) {
        const nextInput = document.getElementById(`pin-digit-${index + 1}`) as HTMLInputElement;
        if (nextInput) nextInput.focus();
      }
    } else {
      this.pinDigits[index] = '';
    }
  }

  onPinKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.pinDigits[index] && index > 0) {
      const prevInput = document.getElementById(`pin-digit-${index - 1}`) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        this.pinDigits[index - 1] = '';
      }
    }
  }

  onPinPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    const digits = pasted.replace(/[^0-9]/g, '').slice(0, 6).split('');
    for (let i = 0; i < 6; i++) {
      this.pinDigits[i] = digits[i] || '';
      const input = document.getElementById(`pin-digit-${i}`) as HTMLInputElement;
      if (input) input.value = this.pinDigits[i];
    }
    const lastFilled = Math.min(digits.length, 5);
    const targetInput = document.getElementById(`pin-digit-${lastFilled}`) as HTMLInputElement;
    if (targetInput) targetInput.focus();
  }

  changerCodePin(): void {
    const pin = this.pinCode;
    if (!pin || pin.length !== 6 || !/^[0-9]{6}$/.test(pin)) {
      this.notificationService.error('Le code PIN de consultation coiffeur doit comporter exactement 6 chiffres numériques.');
      return;
    }
    this.savingPin = true;
    this.clientPlateformeService.changerCodeProfil(pin).subscribe({
      next: () => {
        this.notificationService.success('Votre code PIN secret à 6 chiffres a été configuré avec succès !');
        this.savingPin = false;
        this.pinDigits = ['', '', '', '', '', ''];
        this.profilCapillaire.update((p) => (p ? { ...p, hasCodeProfil: true } : null));
      },
      error: (err) => {
        this.savingPin = false;
        this.notificationService.error(err.error?.message || 'Erreur lors de la mise à jour du code PIN.');
      }
    });
  }

  // --- Actions Sécurité & Mot de Passe ---
  changerMotDePasse(): void {
    if (!this.motDePasseForm.ancienMotDePasse || !this.motDePasseForm.nouveauMotDePasse) {
      this.notificationService.error('Veuillez renseigner votre mot de passe actuel et le nouveau.');
      return;
    }
    if (this.motDePasseForm.nouveauMotDePasse !== this.motDePasseForm.confirmMotDePasse) {
      this.notificationService.error('Les mots de passe ne correspondent pas.');
      return;
    }
    if (this.motDePasseForm.nouveauMotDePasse.length < 6) {
      this.notificationService.error('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    this.savingPassword = true;
    this.clientPlateformeService
      .changerMotDePasse(
        this.motDePasseForm.ancienMotDePasse,
        this.motDePasseForm.nouveauMotDePasse
      )
      .subscribe({
        next: () => {
          this.savingPassword = false;
          this.motDePasseForm = {
            ancienMotDePasse: '',
            nouveauMotDePasse: '',
            confirmMotDePasse: ''
          };
          this.notificationService.success('Votre mot de passe a été modifié avec succès.');
        },
        error: (err) => {
          this.savingPassword = false;
          this.notificationService.error(err.error?.message || 'Échec de la modification du mot de passe.');
        }
      });
  }

  // --- Actions Rendez-vous ---
  ouvrirModalAnnulation(rdv: RendezVous): void {
    this.selectedRdvToCancel = rdv;
    this.cancelMotif = '';
    this.cancelModalOpen = true;
  }

  fermerModalAnnulation(): void {
    this.selectedRdvToCancel = null;
    this.cancelMotif = '';
    this.cancelModalOpen = false;
  }

  confirmerAnnulation(): void {
    if (!this.selectedRdvToCancel) return;
    this.submittingCancel = true;

    this.clientSalonService
      .annulerRendezVous(this.slugSalon, this.selectedRdvToCancel.id, {
        motif: this.cancelMotif || 'Annulé par le client'
      })
      .subscribe({
        next: () => {
          this.submittingCancel = false;
          this.notificationService.success('Rendez-vous annulé avec succès.');
          this.fermerModalAnnulation();
          this.chargerToutesDonnees();
        },
        error: (err) => {
          this.submittingCancel = false;
          this.notificationService.error(err.error?.message || 'Impossible d’annuler ce rendez-vous.');
        }
      });
  }

  reprendreRdv(rdv: RendezVous): void {
    const serviceNom = rdv.services && rdv.services[0] ? rdv.services[0] : '';
    this.router.navigate(['/' + this.slugSalon], {
      queryParams: { rdv: true, service: serviceNom }
    });
  }

  reprendrePrestation(p: Prestation): void {
    const serviceNom = p.lignes && p.lignes[0] ? p.lignes[0].serviceNom : '';
    this.router.navigate(['/' + this.slugSalon], {
      queryParams: { rdv: true, service: serviceNom }
    });
  }

  // --- Actions Avis Prestation (Modal) ---
  ouvrirModalAvisPrestation(prestation: Prestation, ligneId?: number): void {
    this.selectedPrestationForAvis = prestation;
    this.selectedLigneId = ligneId || (prestation.lignes && prestation.lignes[0] ? prestation.lignes[0].id : null);
    this.selectedPrestationNom = prestation.lignes && prestation.lignes[0] ? (prestation.lignes[0].serviceNom || 'Prestation') : 'Prestation';
    this.avisNote = 5;
    this.avisCommentaire = '';
    this.avisPrestationModalOpen = true;
  }

  fermerModalAvisPrestation(): void {
    this.avisPrestationModalOpen = false;
    this.selectedPrestationForAvis = null;
    this.selectedLigneId = null;
    this.avisCommentaire = '';
  }

  soumettreAvisPrestation(): void {
    if (!this.selectedLigneId) {
      this.notificationService.error('Prestation non identifiable.');
      return;
    }
    this.submittingAvisPrestation = true;
    this.clientSalonService
      .creerAvisPrestation(this.slugSalon, {
        lignePrestationId: this.selectedLigneId,
        note: this.avisNote,
        commentaire: this.avisCommentaire
      })
      .subscribe({
        next: (nouvelAvis) => {
          this.submittingAvisPrestation = false;
          this.avisPrestations.update((list) => [nouvelAvis, ...list]);
          this.fermerModalAvisPrestation();
          this.notificationService.success('Merci pour votre avis ! Il a bien été enregistré.');
        },
        error: (err) => {
          this.submittingAvisPrestation = false;
          this.notificationService.error(err.error?.message || 'Erreur lors de l’envoi de votre avis.');
        }
      });
  }

  // --- Actions Avis Salon ---
  soumettreAvisSalon(): void {
    if (!this.salonAvisCommentaire.trim()) {
      this.notificationService.error('Veuillez ajouter un commentaire sur votre expérience.');
      return;
    }
    this.submittingAvisSalon = true;
    const req = { note: this.salonAvisNote, commentaire: this.salonAvisCommentaire.trim() };
    const call$ = this.monAvis()
      ? this.clientSalonService.modifierAvisSalon(this.slugSalon, req)
      : this.clientSalonService.creerAvisSalon(this.slugSalon, req);

    call$.subscribe({
      next: (avis) => {
        this.submittingAvisSalon = false;
        this.monAvis.set(avis);
        this.notificationService.success('Votre avis sur le salon a été enregistré avec succès !');
      },
      error: (err) => {
        this.submittingAvisSalon = false;
        this.notificationService.error(err.error?.message || 'Impossible d’enregistrer l’avis sur le salon.');
      }
    });
  }

  // --- Actions Réclamations (Modal) ---
  ouvrirModalReclamation(): void {
    this.reclamationObjet = '';
    this.reclamationDescription = '';
    this.reclamationModalOpen = true;
  }

  fermerModalReclamation(): void {
    this.reclamationModalOpen = false;
    this.reclamationObjet = '';
    this.reclamationDescription = '';
  }

  soumettreReclamation(): void {
    if (!this.reclamationObjet.trim() || !this.reclamationDescription.trim()) {
      this.notificationService.error('Veuillez renseigner le motif et le détail de votre réclamation.');
      return;
    }
    this.submittingReclamation = true;
    this.clientSalonService
      .deposerReclamation(this.slugSalon, {
        objet: this.reclamationObjet.trim(),
        description: this.reclamationDescription.trim()
      })
      .subscribe({
        next: (rec) => {
          this.submittingReclamation = false;
          this.reclamations.update((list) => [rec, ...list]);
          this.fermerModalReclamation();
          this.notificationService.success('Votre réclamation a été transmise à la direction du salon.');
        },
        error: (err) => {
          this.submittingReclamation = false;
          this.notificationService.error(err.error?.message || 'Erreur lors de l’envoi de votre réclamation.');
        }
      });
  }

  // --- Actions Coiffeurs Favoris ---
  retirerCoiffeurFavori(coiffeurId: number): void {
    this.clientSalonService.retirerCoiffeurFavori(this.slugSalon, coiffeurId).subscribe({
      next: () => {
        this.notificationService.success('Coiffeur retiré de vos favoris.');
        this.coiffeursFavoris.update((list) => list.filter((f) => f.coiffeurId !== coiffeurId));
      },
      error: () => this.notificationService.error('Erreur lors du retrait du favori.')
    });
  }

  copierCodeRetrait(code: string): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.notificationService.success(`Code ${code} copié dans le presse-papier !`);
      });
    } else {
      this.notificationService.success(`Code de retrait : ${code}`);
    }
  }

  imprimerRecu(paiement: Paiement): void {
    window.print();
  }

  getCommandeStatutLabel(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE':
        return 'En attente';
      case 'CONFIRMEE':
      case 'VALIDEE':
        return 'Validée & Prête au salon';
      case 'PRETE':
        return 'Prête au salon';
      case 'RECUPEREE':
      case 'LIVREE':
        return 'Retirée';
      case 'ANNULEE':
        return 'Annulée';
      case 'REJETEE':
        return 'Non acceptée';
      default:
        return statut;
    }
  }

  getCommandeStep(statut: string): number {
    switch (statut) {
      case 'EN_ATTENTE':
        return 1;
      case 'CONFIRMEE':
        return 2;
      case 'PRETE':
      case 'VALIDEE':
        return 3;
      case 'RECUPEREE':
      case 'LIVREE':
        return 4;
      default:
        return 1;
    }
  }

  getRdvStatutLabel(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE':
        return 'En attente de confirmation';
      case 'CONFIRME':
        return 'Confirmé';
      case 'TERMINE':
        return 'Réalisé';
      case 'ANNULE':
        return 'Annulé';
      case 'NO_SHOW':
        return 'Non honoré';
      default:
        return statut;
    }
  }

  private verifierEtFinaliserReservationEnAttente(): void {
    const pending = this.guestStorage.recupererReservationEnCours();
    if (pending && pending.slugSalon === this.slugSalon && pending.varianteIds?.length > 0) {
      let dateHeureClean = pending.dateHeure;
      if (dateHeureClean && dateHeureClean.includes('T')) {
        const [d, t] = dateHeureClean.split('T');
        const parts = t.split(':');
        const hh = (parts[0] || '00').padStart(2, '0');
        const mm = (parts[1] || '00').padStart(2, '0');
        const ss = (parts[2] || '00').padStart(2, '0');
        dateHeureClean = `${d}T${hh}:${mm}:${ss}`;
      }

      const req: RendezVousCreateDto = {
        dateHeurePrevue: dateHeureClean,
        dateHeure: dateHeureClean,
        varianteIds: pending.varianteIds,
        serviceIds: pending.varianteIds,
        coiffeurId: pending.coiffeurId,
        notes: pending.notes
      };

      this.clientSalonService.reserverRendezVous(this.slugSalon, req).subscribe({
        next: () => {
          this.guestStorage.viderReservationEnCours();
          this.notificationService.success('Votre réservation a été confirmée avec succès !');
          this.chargerToutesDonnees();
        },
        error: () => {
          this.guestStorage.viderReservationEnCours();
        }
      });
    }
  }
}
