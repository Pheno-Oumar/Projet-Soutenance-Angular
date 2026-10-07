export interface SidebarSubItem {
  id: string;
  label: string;
  path: string; // Relative path
}

export interface SidebarItem {
  id: string;
  label: string;
  path?: string; // Relative path or direct link
  icon: string;
  badge?: string;
  subItems?: SidebarSubItem[];
}

export interface SidebarSection {
  id: string;
  title: string;
  items: SidebarItem[];
}

export interface RoleSidebarConfig {
  role: string;
  title: string;
  isPlatform: boolean;
  sections: SidebarSection[];
}

export const SIDEBAR_CONFIGS: Record<string, RoleSidebarConfig> = {
  ADMIN_SYSTEME: {
    role: 'ADMIN_SYSTEME',
    title: 'Administration Plateforme',
    isPlatform: true,
    sections: [
      {
        id: 'supervision',
        title: 'Supervision',
        items: [
          { id: 'dashboard', label: 'Tableau de bord', path: '', icon: 'chart-bar' }
        ]
      },
      {
        id: 'reseau',
        title: 'Gestion du Réseau',
        items: [
          {
            id: 'salons',
            label: 'Salons de coiffure',
            icon: 'building-storefront',
            subItems: [
              { id: 'salons-list', label: 'Liste des salons', path: 'salons' },
              { id: 'salons-create', label: 'Nouveau salon', path: 'salons/nouveau' }
            ]
          }
        ]
      },
      {
        id: 'gouvernance',
        title: 'Gouvernance & Sécurité',
        items: [
          { id: 'regles', label: 'Règles Plateforme', path: 'regles', icon: 'scale' },
          { id: 'rgpd', label: 'Conformité RGPD', path: 'rgpd', icon: 'shield-check' },
          { id: 'audit', label: 'Journaux d’audit', path: 'audit', icon: 'document-text' }
        ]
      },
      {
        id: 'compte',
        title: 'Mon Compte',
        items: [
          { id: 'profil', label: 'Paramètres du compte', path: 'compte', icon: 'user' }
        ]
      }
    ]
  },

  PROPRIETAIRE: {
    role: 'PROPRIETAIRE',
    title: 'Espace Propriétaire',
    isPlatform: false,
    sections: [
      {
        id: 'pilotage',
        title: 'Pilotage & Stratégie',
        items: [
          { id: 'dashboard', label: 'Vue d’ensemble', path: '', icon: 'chart-bar' },
          { id: 'performance', label: 'Performance équipe', path: 'performance', icon: 'presentation-chart-line' }
        ]
      },
      {
        id: 'salon',
        title: 'Mon Établissement',
        items: [
          {
            id: 'config-salon',
            label: 'Configuration Salon',
            icon: 'building-storefront',
            subItems: [
              { id: 'salon-profil', label: 'Fiche & Logo', path: 'salon' },
              { id: 'salon-horaires', label: 'Horaires d’ouverture', path: 'horaires' },
              { id: 'salon-fermetures', label: 'Fermetures exceptionnelles', path: 'fermetures' },
              { id: 'salon-regles', label: 'Règles du salon', path: 'regles' }
            ]
          }
        ]
      },
      {
        id: 'rh',
        title: 'Ressources Humaines',
        items: [
          {
            id: 'equipe',
            label: 'Gestion de l’équipe',
            icon: 'user-group',
            subItems: [
              { id: 'employes-list', label: 'Membres & Rôles', path: 'employes' },
              { id: 'indisponibilites', label: 'Indisponibilités', path: 'indisponibilites' },
              { id: 'planning', label: 'Planning salon', path: 'planning' }
            ]
          }
        ]
      },
      {
        id: 'offre',
        title: 'Offre & Clients',
        items: [
          { id: 'catalogue', label: 'Services & Prestations', path: 'prestations', icon: 'scissors' },
          { id: 'clients', label: 'Fichier Clients', path: 'clients', icon: 'users' }
        ]
      },
      {
        id: 'finances',
        title: 'Finances & Supervision',
        items: [
          { id: 'rapports', label: 'Rapports Financiers', path: 'rapports', icon: 'document-currency-dollar' },
          { id: 'paiements', label: 'Paiements clients', path: 'paiements', icon: 'banknotes' },
          { id: 'depenses', label: 'Dépenses & Frais', path: 'depenses', icon: 'credit-card' },
          { id: 'synthese-stock', label: 'Synthèse des stocks', path: 'stocks-synthese', icon: 'archive-box' }
        ]
      },
      {
        id: 'securite',
        title: 'Gouvernance & Sécurité',
        items: [
          { id: 'audit', label: 'Audit du salon', path: 'audit', icon: 'document-text' },
          { id: 'compte', label: 'Mon Profil', path: 'compte', icon: 'user' }
        ]
      }
    ]
  },

  MANAGER: {
    role: 'MANAGER',
    title: 'Espace Manager',
    isPlatform: false,
    sections: [
      {
        id: 'activite',
        title: 'Activité Quotidienne',
        items: [
          { id: 'dashboard', label: 'Tableau de bord', path: '', icon: 'chart-bar' },
          { id: 'planning', label: 'Planning & Rendez-vous', path: 'rendez-vous', icon: 'calendar-days' }
        ]
      },
      {
        id: 'services',
        title: 'Prestations & Portfolio',
        items: [
          {
            id: 'services-menu',
            label: 'Catalogue Prestations',
            icon: 'scissors',
            subItems: [
              { id: 'services-list', label: 'Liste des soins', path: 'services' },
              { id: 'services-create', label: 'Ajouter un service', path: 'services/nouveau' }
            ]
          },
          { id: 'realisations', label: 'Portfolio Réalisations', path: 'realisations', icon: 'camera' },
          { id: 'stories', label: 'Stories 24h & Kady\'s', path: 'stories', icon: 'sparkles' }
        ]
      },
      {
        id: 'relation-client',
        title: 'Relation Client',
        items: [
          { id: 'clients', label: 'Fiches Clients', path: 'clients', icon: 'users' },
          { id: 'avis', label: 'Avis & Évaluations', path: 'avis', icon: 'star' },
          { id: 'reclamations', label: 'Réclamations', path: 'reclamations', icon: 'exclamation-circle' }
        ]
      },
      {
        id: 'compte',
        title: 'Mon Compte',
        items: [
          { id: 'profil', label: 'Profil & Sécurité', path: 'compte', icon: 'user' }
        ]
      }
    ]
  },

  COIFFEUR: {
    role: 'COIFFEUR',
    title: 'Espace Coiffeur',
    isPlatform: false,
    sections: [
      {
        id: 'planning-coiffeur',
        title: 'Mon Activité',
        items: [
          { id: 'planning', label: 'Mon Planning Rendez-vous', path: '', icon: 'calendar-days' },
          { id: 'indispos', label: 'Mes Congés & Absences', path: 'indisponibilites', icon: 'clock' }
        ]
      },
      {
        id: 'metier',
        title: 'Pratique & Soins',
        items: [
          { id: 'profil-capillaire', label: 'Profils Capillaires Client', path: 'profil-capillaire', icon: 'sparkles' },
          { id: 'profil-pro', label: 'Mon Profil Professionnel', path: 'profil-professionnel', icon: 'identification' },
          { id: 'avis-coiffeur', label: 'Mes Avis Clients', path: 'avis', icon: 'star' }
        ]
      },
      {
        id: 'compte',
        title: 'Mon Compte',
        items: [
          { id: 'profil', label: 'Informations personnelles', path: 'compte', icon: 'user' }
        ]
      }
    ]
  },

  COMPTABLE: {
    role: 'COMPTABLE',
    title: 'Espace Comptabilité',
    isPlatform: false,
    sections: [
      {
        id: 'caisse',
        title: 'Gestion de Caisse',
        items: [
          { id: 'dashboard', label: 'Tableau de bord financier', path: '', icon: 'chart-bar' },
          {
            id: 'caisse-menu',
            label: 'Caisse Quotidienne',
            icon: 'banknotes',
            subItems: [
              { id: 'session-courante', label: 'Session en cours', path: 'caisse/courante' },
              { id: 'sessions-historique', label: 'Historique des sessions', path: 'caisse/historique' }
            ]
          }
        ]
      },
      {
        id: 'depenses',
        title: 'Dépenses & Achats',
        items: [
          { id: 'depenses-list', label: 'Registre des dépenses', path: 'depenses', icon: 'credit-card' }
        ]
      },
      {
        id: 'rapports',
        title: 'Clôtures & Rapports',
        items: [
          { id: 'rapports-bilan', label: 'Rapports Financiers', path: 'rapports', icon: 'document-chart-bar' }
        ]
      },
      {
        id: 'compte',
        title: 'Mon Compte',
        items: [
          { id: 'profil', label: 'Profil & Sécurité', path: 'compte', icon: 'user' }
        ]
      }
    ]
  },

  RECEPTIONNISTE: {
    role: 'RECEPTIONNISTE',
    title: 'Espace Réception',
    isPlatform: false,
    sections: [
      {
        id: 'accueil',
        title: 'Accueil & Planning',
        items: [
          { id: 'dashboard', label: 'Tableau de bord', path: '', icon: 'chart-bar' },
          { id: 'file-attente', label: 'File d’attente & Salon', path: 'file-attente', icon: 'clock' },
          { id: 'planning', label: 'Planning & Créneaux', path: 'planning', icon: 'calendar-days' },
          { id: 'retards', label: 'Retards & No-Show', path: 'retards', icon: 'bell-alert' }
        ]
      },
      {
        id: 'comptoir',
        title: 'Comptoir & Encaissement',
        items: [
          { id: 'clients', label: 'Fichier & Accueil Clients', path: 'clients', icon: 'users' },
          { id: 'caisse', label: 'Prestations & Caisse', path: 'caisse', icon: 'banknotes' }
        ]
      },
      {
        id: 'compte',
        title: 'Mon Compte',
        items: [
          { id: 'profil', label: 'Profil & Sécurité', path: 'compte', icon: 'user' }
        ]
      }
    ]
  },

  RESPONSABLE_STOCK: {
    role: 'RESPONSABLE_STOCK',
    title: 'Espace Responsable Stock',
    isPlatform: false,
    sections: [
      {
        id: 'inventaire',
        title: 'Inventaire & Produits',
        items: [
          { id: 'dashboard', label: 'Tableau de bord stock', path: '', icon: 'chart-bar' },
          {
            id: 'produits-menu',
            label: 'Catalogue Produits',
            icon: 'archive-box',
            subItems: [
              { id: 'produits-list', label: 'Tous les produits', path: 'produits' },
              { id: 'categories-list', label: 'Catégories', path: 'categories' }
            ]
          },
          { id: 'alertes', label: 'Alertes stock critique', path: 'alertes', icon: 'bell-alert' }
        ]
      },
      {
        id: 'mouvements',
        title: 'Mouvements & Flux',
        items: [
          { id: 'mouvements-list', label: 'Historique des flux', path: 'mouvements', icon: 'arrows-right-left' }
        ]
      },
      {
        id: 'commandes',
        title: 'Commandes & Ventes',
        items: [
          { id: 'commandes-list', label: 'Commandes & Retraits', path: 'commandes', icon: 'truck' }
        ]
      },
      {
        id: 'compte',
        title: 'Mon Compte',
        items: [
          { id: 'profil', label: 'Profil & Sécurité', path: 'compte', icon: 'user' }
        ]
      }
    ]
  }
};
