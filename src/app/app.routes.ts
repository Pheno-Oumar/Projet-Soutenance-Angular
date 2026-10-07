import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard, salonExistsGuard } from './core/auth/guards';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { SalonShellComponent } from './features/vitrine/shell/salon-shell.component';

export const routes: Routes = [
  // --- AUTHENTIFICATION GLOBALE (Admin Système) ---
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
    title: 'Connexion Plateforme | AON'
  },
  {
    path: 'auth/login',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // --- SÉLECTION D'ESPACE (Multi-rôles) ---
  {
    path: 'espace-selection',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/espace-selection/pages/role-selection/role-selection.component').then(
        (m) => m.RoleSelectionComponent
      ),
    title: 'Sélection d’espace | Hair Style'
  },

  // --- ADMINISTRATION SYSTÈME (Plateforme) ---
  {
    path: 'admin-plateforme',
    component: MainLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN_SYSTEME'] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import(
            './features/admin-plateforme/pages/dashboard/admin-dashboard.component'
          ).then((m) => m.AdminDashboardComponent),
        title: 'Tableau de Bord | Administration'
      },
      {
        path: 'salons',
        loadComponent: () =>
          import(
            './features/admin-plateforme/pages/salons/salons-list.component'
          ).then((m) => m.SalonsListComponent),
        title: 'Salons de coiffure | Administration'
      },
      {
        path: 'salons/nouveau',
        loadComponent: () =>
          import(
            './features/admin-plateforme/pages/salons/salons-form.component'
          ).then((m) => m.SalonsFormComponent),
        title: 'Nouveau salon | Administration'
      },
      {
        path: 'salons/:slug',
        loadComponent: () =>
          import(
            './features/admin-plateforme/pages/salons/salons-detail.component'
          ).then((m) => m.SalonsDetailComponent),
        title: 'Détails du salon | Administration'
      },
      {
        path: 'regles',
        loadComponent: () =>
          import(
            './features/admin-plateforme/pages/regles/regles-list.component'
          ).then((m) => m.ReglesListComponent),
        title: 'Règles Plateforme | Administration'
      },
      {
        path: 'audit',
        loadComponent: () =>
          import(
            './features/admin-plateforme/pages/audit/audit-list.component'
          ).then((m) => m.AuditListComponent),
        title: 'Journaux d’audit | Administration'
      },
      {
        path: 'rgpd',
        loadComponent: () =>
          import(
            './features/admin-plateforme/pages/rgpd/rgpd-list.component'
          ).then((m) => m.RgpdListComponent),
        title: 'Conformité RGPD | Administration'
      },
      {
        path: 'compte',
        loadComponent: () =>
          import(
            './features/admin-plateforme/pages/compte/admin-compte.component'
          ).then((m) => m.AdminCompteComponent),
        title: 'Paramètres du compte | Administration'
      }
    ]
  },

  // --- EXPLORATION SALONS & DÉCOUVERTE ---
  {
    path: 'explore',
    loadComponent: () =>
      import('./features/explore/pages/explore-home/explore-home.component').then(
        (m) => m.ExploreHomeComponent
      ),
    title: 'Explorer les Salons de Coiffure | Hair Style'
  },

  // --- FLUX KADY'S (REELS / TIKTOK-LIKE) ---
  {
    path: 'kadys',
    loadComponent: () =>
      import('./features/kadys/pages/kadys-feed/kadys-feed.component').then(
        (m) => m.KadysFeedComponent
      ),
    title: "Kady's Reels & Inspirations | Hair Style"
  },

  // --- ESPACE CLIENT GLOBAL (Multi-Salons & RGPD) ---
  {
    path: 'client',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['CLIENT'] },
    loadComponent: () =>
      import(
        './features/client/pages/client-plateforme-dashboard/client-plateforme-dashboard.component'
      ).then((m) => m.ClientPlateformeDashboardComponent),
    title: 'Mon Espace Client | Hair Style'
  },

  // --- ERREUR 404 (Statique, avant :slugSalon pour éviter la capture par le paramètre de route) ---
  {
    path: '404',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: '404 - Page non trouvée'
  },

  // --- ROUTES SPÉCIFIQUES SALON (/:slugSalon/...) ---
  {
    path: ':slugSalon',
    canActivate: [salonExistsGuard],
    children: [
      // --- ESPACE VITRINE & BOUTIQUE DU SALON (SHELL VISITEUR) ---
      {
        path: '',
        component: SalonShellComponent,
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/vitrine/pages/salon-home/salon-home.component').then(
                (m) => m.SalonHomeComponent
              ),
            title: 'Accueil Salon | Hair Style'
          },
          {
            path: 'vitrine',
            redirectTo: '',
            pathMatch: 'full'
          },
          {
            path: 'services',
            loadComponent: () =>
              import('./features/vitrine/pages/services-list/salon-services-list.component').then(
                (m) => m.SalonServicesListComponent
              ),
            title: 'Prestations & Soins | Hair Style'
          },
          {
            path: 'services/:serviceId',
            loadComponent: () =>
              import('./features/vitrine/pages/service-detail/salon-service-detail.component').then(
                (m) => m.SalonServiceDetailComponent
              ),
            title: 'Détail Prestation | Hair Style'
          },
          {
            path: 'boutique',
            loadComponent: () =>
              import('./features/vitrine/pages/boutique/salon-boutique.component').then(
                (m) => m.SalonBoutiqueComponent
              ),
            title: 'Boutique & Produits | Hair Style'
          },
          {
            path: 'boutique/:categorieId',
            loadComponent: () =>
              import('./features/vitrine/pages/categorie-produits/salon-categorie-produits.component').then(
                (m) => m.SalonCategorieProduitsComponent
              ),
            title: 'Soins & Produits | Hair Style'
          },
          {
            path: 'produits/:produitId',
            loadComponent: () =>
              import('./features/vitrine/pages/produit-detail/salon-produit-detail.component').then(
                (m) => m.SalonProduitDetailComponent
              ),
            title: 'Fiche Produit | Hair Style'
          },
          {
            path: 'realisations',
            loadComponent: () =>
              import('./features/vitrine/pages/realisations-grid/salon-realisations-grid.component').then(
                (m) => m.SalonRealisationsGridComponent
              ),
            title: 'Galerie Réalisations 9:16 | Hair Style'
          },
          {
            path: 'realisations/:id',
            loadComponent: () =>
              import('./features/vitrine/pages/realisations-player/salon-realisations-player.component').then(
                (m) => m.SalonRealisationsPlayerComponent
              ),
            title: 'Lecteur Réalisations | Hair Style'
          },
          {
            path: 'equipe',
            loadComponent: () =>
              import('./features/vitrine/pages/equipe/salon-equipe.component').then(
                (m) => m.SalonEquipeComponent
              ),
            title: 'L’Équipe du Salon | Hair Style'
          },
          {
            path: 'avis',
            loadComponent: () =>
              import('./features/vitrine/pages/avis/salon-avis.component').then(
                (m) => m.SalonAvisComponent
              ),
            title: 'Avis Clients Certifiés | Hair Style'
          },
          {
            path: 'rdv',
            loadComponent: () =>
              import('./features/vitrine/pages/booking-checkout/booking-checkout.component').then(
                (m) => m.BookingCheckoutComponent
              ),
            title: 'Finalisation Rendez-vous | Hair Style'
          },
          {
            path: 'panier',
            loadComponent: () =>
              import('./features/vitrine/pages/cart-checkout/cart-checkout.component').then(
                (m) => m.CartCheckoutComponent
              ),
            title: 'Panier Click & Collect | Hair Style'
          },
          // Espace Client Dédié au Salon (Sous-pages dans le Shell Vitrine)
          {
            path: 'client',
            canActivate: [authGuard, roleGuard],
            data: { roles: ['CLIENT'] },
            children: [
              {
                path: '',
                redirectTo: 'rdv',
                pathMatch: 'full'
              },
              {
                path: 'rdv',
                loadComponent: () =>
                  import(
                    './features/client/pages/client-salon-dashboard/client-salon-dashboard.component'
                  ).then((m) => m.ClientSalonDashboardComponent),
                data: { tab: 'RENDEZ_VOUS' },
                title: 'Mes Rendez-vous | Hair Style'
              },
              {
                path: 'commandes',
                loadComponent: () =>
                  import(
                    './features/client/pages/client-salon-dashboard/client-salon-dashboard.component'
                  ).then((m) => m.ClientSalonDashboardComponent),
                data: { tab: 'COMMANDES' },
                title: 'Mes Commandes Click & Collect | Hair Style'
              },
              {
                path: 'prestations',
                loadComponent: () =>
                  import(
                    './features/client/pages/client-salon-dashboard/client-salon-dashboard.component'
                  ).then((m) => m.ClientSalonDashboardComponent),
                data: { tab: 'PRESTATIONS' },
                title: 'Historique Prestations | Hair Style'
              },
              {
                path: 'paiements',
                loadComponent: () =>
                  import(
                    './features/client/pages/client-salon-dashboard/client-salon-dashboard.component'
                  ).then((m) => m.ClientSalonDashboardComponent),
                data: { tab: 'PAIEMENTS' },
                title: 'Mes Règlements & Factures | Hair Style'
              },
              {
                path: 'favoris',
                loadComponent: () =>
                  import(
                    './features/client/pages/client-salon-dashboard/client-salon-dashboard.component'
                  ).then((m) => m.ClientSalonDashboardComponent),
                data: { tab: 'FAVORIS' },
                title: 'Mes Favoris | Hair Style'
              },
              {
                path: 'avis',
                loadComponent: () =>
                  import(
                    './features/client/pages/client-salon-dashboard/client-salon-dashboard.component'
                  ).then((m) => m.ClientSalonDashboardComponent),
                data: { tab: 'AVIS' },
                title: 'Mes Avis & Expériences | Hair Style'
              },
              {
                path: 'reclamations',
                loadComponent: () =>
                  import(
                    './features/client/pages/client-salon-dashboard/client-salon-dashboard.component'
                  ).then((m) => m.ClientSalonDashboardComponent),
                data: { tab: 'RECLAMATIONS' },
                title: 'Réclamations & Assistance | Hair Style'
              },
              {
                path: 'profil-capillaire',
                loadComponent: () =>
                  import(
                    './features/client/pages/client-salon-dashboard/client-salon-dashboard.component'
                  ).then((m) => m.ClientSalonDashboardComponent),
                data: { tab: 'PROFIL_CAPILLAIRE' },
                title: 'Diagnostic Capillaire & Code PIN | Hair Style'
              },
              {
                path: 'compte',
                loadComponent: () =>
                  import(
                    './features/client/pages/client-salon-dashboard/client-salon-dashboard.component'
                  ).then((m) => m.ClientSalonDashboardComponent),
                data: { tab: 'COMPTE' },
                title: 'Mon Compte & Sécurité | Hair Style'
              },
              {
                path: 'profil',
                redirectTo: 'profil-capillaire',
                pathMatch: 'full'
              }
            ]
          }
        ]
      },

      // Salon Login & Register
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent)
      },
      {
        path: 'auth/login',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/register/register.component').then(
            (m) => m.RegisterComponent
          )
      },

      // Propriétaire
      {
        path: 'proprietaire',
        component: MainLayoutComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['PROPRIETAIRE'] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/dashboard/proprietaire-dashboard.component'
              ).then((m) => m.ProprietaireDashboardComponent),
            title: 'Tableau de bord | Propriétaire'
          },
          {
            path: 'performance',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/performance/proprietaire-performance.component'
              ).then((m) => m.ProprietairePerformanceComponent),
            title: 'Performance équipe | Propriétaire'
          },
          {
            path: 'salon',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/salon/proprietaire-salon.component'
              ).then((m) => m.ProprietaireSalonComponent),
            title: 'Configuration Salon | Propriétaire'
          },
          {
            path: 'horaires',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/horaires/proprietaire-horaires.component'
              ).then((m) => m.ProprietaireHorairesComponent),
            title: 'Horaires d’ouverture | Propriétaire'
          },
          {
            path: 'fermetures',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/fermetures/proprietaire-fermetures.component'
              ).then((m) => m.ProprietaireFermeturesComponent),
            title: 'Fermetures exceptionnelles | Propriétaire'
          },
          {
            path: 'regles',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/regles/proprietaire-regles.component'
              ).then((m) => m.ProprietaireReglesComponent),
            title: 'Règles du salon | Propriétaire'
          },
          {
            path: 'employes',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/employes/proprietaire-employes.component'
              ).then((m) => m.ProprietaireEmployesComponent),
            title: 'Gestion de l’équipe | Propriétaire'
          },
          {
            path: 'indisponibilites',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/indisponibilites/proprietaire-indisponibilites.component'
              ).then((m) => m.ProprietaireIndisponibilitesComponent),
            title: 'Indisponibilités | Propriétaire'
          },
          {
            path: 'planning',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/planning/proprietaire-planning.component'
              ).then((m) => m.ProprietairePlanningComponent),
            title: 'Planning du salon | Propriétaire'
          },
          {
            path: 'prestations',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/prestations/proprietaire-prestations.component'
              ).then((m) => m.ProprietairePrestationsComponent),
            title: 'Services & Prestations | Propriétaire'
          },
          {
            path: 'clients',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/clients/proprietaire-clients.component'
              ).then((m) => m.ProprietaireClientsComponent),
            title: 'Fichier Clients | Propriétaire'
          },
          {
            path: 'clients/:id',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/clients/proprietaire-client-detail.component'
              ).then((m) => m.ProprietaireClientDetailComponent),
            title: 'Détail Client | Propriétaire'
          },
          {
            path: 'rapports',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/finances/proprietaire-rapports.component'
              ).then((m) => m.ProprietaireRapportsComponent),
            title: 'Rapports Financiers | Propriétaire'
          },
          {
            path: 'paiements',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/finances/proprietaire-paiements.component'
              ).then((m) => m.ProprietairePaiementsComponent),
            title: 'Paiements clients | Propriétaire'
          },
          {
            path: 'depenses',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/finances/proprietaire-depenses.component'
              ).then((m) => m.ProprietaireDepensesComponent),
            title: 'Dépenses & Frais | Propriétaire'
          },
          {
            path: 'stocks-synthese',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/finances/proprietaire-stocks.component'
              ).then((m) => m.ProprietaireStocksComponent),
            title: 'Synthèse des stocks | Propriétaire'
          },
          {
            path: 'audit',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/audit/proprietaire-audit.component'
              ).then((m) => m.ProprietaireAuditComponent),
            title: 'Audit du salon | Propriétaire'
          },
          {
            path: 'compte',
            loadComponent: () =>
              import(
                './features/proprietaire/pages/compte/proprietaire-compte.component'
              ).then((m) => m.ProprietaireCompteComponent),
            title: 'Mon Profil | Propriétaire'
          }
        ]
      },

      // Manager
      {
        path: 'manager',
        component: MainLayoutComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['MANAGER'] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import(
                './features/manager/pages/dashboard/manager-dashboard.component'
              ).then((m) => m.ManagerDashboardComponent),
            title: 'Tableau de bord | Manager'
          },
          {
            path: 'rendez-vous',
            loadComponent: () =>
              import(
                './features/manager/pages/planning/manager-planning.component'
              ).then((m) => m.ManagerPlanningComponent),
            title: 'Planning & Rendez-vous | Manager'
          },
          {
            path: 'planning',
            redirectTo: 'rendez-vous',
            pathMatch: 'full'
          },
          {
            path: 'services',
            loadComponent: () =>
              import(
                './features/manager/pages/services/manager-services.component'
              ).then((m) => m.ManagerServicesComponent),
            title: 'Catalogue Prestations | Manager'
          },
          {
            path: 'realisations',
            loadComponent: () =>
              import(
                './features/manager/pages/realisations/manager-realisations.component'
              ).then((m) => m.ManagerRealisationsComponent),
            title: 'Portfolio Vidéo | Manager'
          },
          {
            path: 'stories',
            loadComponent: () =>
              import(
                './features/manager/pages/stories/manager-stories.component'
              ).then((m) => m.ManagerStoriesComponent),
            title: 'Stories 24h & Kady\'s | Manager'
          },
          {
            path: 'clients',
            loadComponent: () =>
              import(
                './features/manager/pages/clients/manager-clients.component'
              ).then((m) => m.ManagerClientsComponent),
            title: 'Fichier Clients | Manager'
          },
          {
            path: 'avis',
            loadComponent: () =>
              import(
                './features/manager/pages/avis/manager-avis.component'
              ).then((m) => m.ManagerAvisComponent),
            title: 'Modération des Avis | Manager'
          },
          {
            path: 'reclamations',
            loadComponent: () =>
              import(
                './features/manager/pages/reclamations/manager-reclamations.component'
              ).then((m) => m.ManagerReclamationsComponent),
            title: 'Réclamations Clients | Manager'
          },
          {
            path: 'compte',
            loadComponent: () =>
              import(
                './features/manager/pages/compte/manager-compte.component'
              ).then((m) => m.ManagerCompteComponent),
            title: 'Mon Profil | Manager'
          }
        ]
      },

      // Coiffeur
      {
        path: 'coiffeur',
        component: MainLayoutComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['COIFFEUR'] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import(
                './features/coiffeur/pages/dashboard/coiffeur-dashboard.component'
              ).then((m) => m.CoiffeurDashboardComponent)
          },
          {
            path: 'indisponibilites',
            loadComponent: () =>
              import(
                './features/coiffeur/pages/indisponibilites/coiffeur-indisponibilites.component'
              ).then((m) => m.CoiffeurIndisponibilitesComponent)
          },
          {
            path: 'profil-capillaire',
            loadComponent: () =>
              import(
                './features/coiffeur/pages/profil-capillaire/coiffeur-profil-capillaire.component'
              ).then((m) => m.CoiffeurProfilCapillaireComponent)
          },
          {
            path: 'profil-professionnel',
            loadComponent: () =>
              import(
                './features/coiffeur/pages/profil-pro/coiffeur-profil-pro.component'
              ).then((m) => m.CoiffeurProfilProComponent)
          },
          {
            path: 'avis',
            loadComponent: () =>
              import(
                './features/coiffeur/pages/avis/coiffeur-avis.component'
              ).then((m) => m.CoiffeurAvisComponent)
          },
          {
            path: 'compte',
            loadComponent: () =>
              import(
                './features/coiffeur/pages/compte/coiffeur-compte.component'
              ).then((m) => m.CoiffeurCompteComponent)
          }
        ]
      },

      // Comptabilité
      {
        path: 'comptabilite',
        component: MainLayoutComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['COMPTABLE'] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import(
                './features/comptabilite/pages/dashboard/comptable-dashboard.component'
              ).then((m) => m.ComptableDashboardComponent)
          },
          {
            path: 'caisse/courante',
            loadComponent: () =>
              import(
                './features/comptabilite/pages/caisse/comptable-caisse-courante.component'
              ).then((m) => m.ComptableCaisseCouranteComponent)
          },
          {
            path: 'caisse/historique',
            loadComponent: () =>
              import(
                './features/comptabilite/pages/caisse/comptable-caisse-historique.component'
              ).then((m) => m.ComptableCaisseHistoriqueComponent)
          },
          {
            path: 'depenses',
            loadComponent: () =>
              import(
                './features/comptabilite/pages/depenses/comptable-depenses.component'
              ).then((m) => m.ComptableDepensesComponent)
          },
          {
            path: 'rapports',
            loadComponent: () =>
              import(
                './features/comptabilite/pages/rapports/comptable-rapports.component'
              ).then((m) => m.ComptableRapportsComponent)
          },
          {
            path: 'compte',
            loadComponent: () =>
              import(
                './features/comptabilite/pages/compte/comptable-compte.component'
              ).then((m) => m.ComptableCompteComponent)
          }
        ]
      },

      // Responsable Stock
      {
        path: 'responsable-stock',
        component: MainLayoutComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['RESPONSABLE_STOCK'] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import(
                './features/responsable-stock/pages/dashboard/stock-dashboard.component'
              ).then((m) => m.StockDashboardComponent)
          },
          {
            path: 'produits',
            loadComponent: () =>
              import(
                './features/responsable-stock/pages/produits/stock-produits.component'
              ).then((m) => m.StockProduitsComponent)
          },
          {
            path: 'categories',
            loadComponent: () =>
              import(
                './features/responsable-stock/pages/categories/stock-categories.component'
              ).then((m) => m.StockCategoriesComponent)
          },
          {
            path: 'alertes',
            loadComponent: () =>
              import(
                './features/responsable-stock/pages/alertes/stock-alertes.component'
              ).then((m) => m.StockAlertesComponent)
          },
          {
            path: 'mouvements',
            loadComponent: () =>
              import(
                './features/responsable-stock/pages/mouvements/stock-mouvements.component'
              ).then((m) => m.StockMouvementsComponent)
          },
          {
            path: 'commandes',
            loadComponent: () =>
              import(
                './features/responsable-stock/pages/commandes/stock-commandes.component'
              ).then((m) => m.StockCommandesComponent)
          },
          {
            path: 'compte',
            loadComponent: () =>
              import(
                './features/responsable-stock/pages/compte/stock-compte.component'
              ).then((m) => m.StockCompteComponent)
          }
        ]
      },

      // Réceptionniste
      {
        path: 'receptionniste',
        component: MainLayoutComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['RECEPTIONNISTE'] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import(
                './features/receptionniste/pages/dashboard/receptionniste-dashboard.component'
              ).then((m) => m.ReceptionnisteDashboardComponent),
            title: 'Tableau de bord | Réception'
          },
          {
            path: 'file-attente',
            loadComponent: () =>
              import(
                './features/receptionniste/pages/file-attente/receptionniste-file-attente.component'
              ).then((m) => m.ReceptionnisteFileAttenteComponent),
            title: 'File d’Attente & Salon en Direct | Réception'
          },
          {
            path: 'planning',
            loadComponent: () =>
              import(
                './features/receptionniste/pages/planning/receptionniste-planning.component'
              ).then((m) => m.ReceptionnistePlanningComponent),
            title: 'Planning & RDV | Réception'
          },
          {
            path: 'retards',
            loadComponent: () =>
              import(
                './features/receptionniste/pages/retards/receptionniste-retards.component'
              ).then((m) => m.ReceptionnisteRetardsComponent),
            title: 'Retards & No-shows | Réception'
          },
          {
            path: 'clients',
            loadComponent: () =>
              import(
                './features/receptionniste/pages/clients/receptionniste-clients.component'
              ).then((m) => m.ReceptionnisteClientsComponent),
            title: 'Clients & Accueil | Réception'
          },
          {
            path: 'caisse',
            loadComponent: () =>
              import(
                './features/receptionniste/pages/caisse/receptionniste-caisse.component'
              ).then((m) => m.ReceptionnisteCaisseComponent),
            title: 'Caisse & Prestations | Réception'
          },
          {
            path: 'compte',
            loadComponent: () =>
              import(
                './features/receptionniste/pages/compte/receptionniste-compte.component'
              ).then((m) => m.ReceptionnisteCompteComponent),
            title: 'Mon Compte | Réception'
          }
        ]
      },

      // Fallback sous-routes invalides dans un salon
      {
        path: '**',
        redirectTo: '/404'
      }
    ]
  },

  // --- PAGE D'ACCUEIL PAR DÉFAUT ---
  {
    path: '',
    redirectTo: 'explore',
    pathMatch: 'full'
  },

  // --- WILDCARD RACINE ---
  {
    path: '**',
    redirectTo: '404'
  }
];
