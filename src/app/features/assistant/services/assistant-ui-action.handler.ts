import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SalonBookingStore } from '../../vitrine/state/salon-booking.store';
import { SalonCartStore } from '../../vitrine/state/salon-cart.store';
import { SalonContextStore } from '../../vitrine/state/salon-context.store';
import { AuthGateService } from '../../vitrine/state/auth-gate.service';
import { AssistantContextService } from './assistant-context.service';
import { AssistantActionUi } from '../models/assistant.models';

@Injectable({ providedIn: 'root' })
export class AssistantUiActionHandler {
  private readonly router = inject(Router);
  private readonly bookingStore = inject(SalonBookingStore);
  private readonly cartStore = inject(SalonCartStore);
  private readonly contextStore = inject(SalonContextStore);
  private readonly authGateService = inject(AuthGateService);
  private readonly assistantContext = inject(AssistantContextService);

  handle(action: AssistantActionUi): void {
    const slug = this.contextStore.currentSlug();
    const p = action.payload || {};

    switch (action.type) {
      case 'ui_ajouter_au_rdv': {
        const ids: number[] = p['varianteIds'] || [];
        for (const id of ids) {
          this.bookingStore.addVariante({
            id,
            serviceNom: 'Prestation sélectionnée',
            varianteNom: 'Formule #' + id,
            dureeMinutes: 45,
            prix: 15000
          });
        }
        if (p['coiffeurId']) {
          this.bookingStore.setCoiffeur(p['coiffeurId']);
        }
        this.bookingStore.openDrawer();
        break;
      }

      case 'ui_retirer_du_rdv': {
        const vid = p['varianteId'];
        if (vid) {
          this.bookingStore.removeVariante(vid);
        }
        break;
      }

      case 'ui_preselectionner_creneau': {
        const date = p['date'];
        const heure = p['heureDebut'];
        if (date && heure) {
          this.bookingStore.setDateAndSlot(date, {
            heureDebut: heure,
            heureFin: p['heureFin'] || '',
            coiffeurId: p['coiffeurId'],
            coiffeurNom: p['coiffeurNom'] || ''
          });
          if (slug) {
            this.router.navigate([`/${slug}/rdv`]);
          }
        }
        break;
      }

      case 'ui_naviguer': {
        const dest = p['destination'];
        const idCible = p['idCible'];
        if (slug) {
          if (dest === 'SERVICES') this.router.navigate([`/${slug}/services`]);
          else if (dest === 'SERVICE_DETAIL' && idCible) this.router.navigate([`/${slug}/services/${idCible}`]);
          else if (dest === 'BOUTIQUE') this.router.navigate([`/${slug}/boutique`]);
          else if (dest === 'PRODUIT_DETAIL' && idCible) this.router.navigate([`/${slug}/boutique/produit/${idCible}`]);
          else if (dest === 'REALISATIONS') this.router.navigate([`/${slug}/realisations`]);
          else if (dest === 'RDV') this.router.navigate([`/${slug}/rdv`]);
          else if (dest === 'PANIER') this.router.navigate([`/${slug}/panier`]);
          else if (dest === 'CONNEXION') this.router.navigate(['/auth/login']);
          else if (dest === 'INSCRIPTION') this.router.navigate([`/${slug}/register`]);
          else this.router.navigate([`/${slug}`]);
        }
        break;
      }

      case 'ui_ouvrir_tiroir': {
        const tiroir = p['tiroir'];
        if (tiroir === 'RDV') {
          this.bookingStore.openDrawer();
        } else if (tiroir === 'PANIER') {
          this.cartStore.openDrawer();
        }
        break;
      }

      case 'ui_contacter_salon': {
        const canal = p['canal'];
        const s = this.contextStore.salon();
        if (canal === 'APPEL' && s?.telephone) {
          window.open(`tel:${s.telephone}`, '_self');
        } else if (canal === 'WHATSAPP' && s?.telephone) {
          window.open(`https://wa.me/${s.telephone.replace(/\s+/g, '')}`, '_blank');
        } else if (canal === 'EMAIL' && s?.email) {
          window.open(`mailto:${s.email}`, '_self');
        } else if (canal === 'ITINERAIRE' && s?.latitude && s?.longitude) {
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`, '_blank');
        }
        break;
      }

      case 'ui_ajouter_au_panier_local': {
        const pid = p['produitId'];
        const qte = p['quantite'] || 1;
        if (slug && pid) {
          this.cartStore.ajouterProduit(slug, {
            id: pid,
            nom: 'Produit cosmétique',
            prixVente: 10000
          }, qte);
          this.cartStore.openDrawer();
        }
        break;
      }

      case 'ui_demander_connexion': {
        const raison = p['raison'] || 'CONFIRMER_RDV';
        this.authGateService.open({
          salonNom: this.contextStore.salon()?.nom || 'Notre Salon',
          actionType: raison === 'COMMANDER' ? 'CART' : 'BOOKING'
        });
        break;
      }

      case 'ui_demander_geolocalisation': {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              this.assistantContext.setGeolocation(pos.coords.latitude, pos.coords.longitude);
            },
            () => {}
          );
        }
        break;
      }

      case 'ui_ouvrir_salon': {
        const targetSlug = p['slugSalon'];
        const section = p['section'];
        if (targetSlug) {
          if (section === 'SERVICES') this.router.navigate([`/${targetSlug}/services`]);
          else if (section === 'BOUTIQUE') this.router.navigate([`/${targetSlug}/boutique`]);
          else if (section === 'REALISATIONS') this.router.navigate([`/${targetSlug}/realisations`]);
          else if (section === 'RDV') this.router.navigate([`/${targetSlug}/rdv`]);
          else this.router.navigate([`/${targetSlug}`]);
        }
        break;
      }

      case 'ui_plateforme_naviguer': {
        const dest = p['destination'];
        if (dest === 'EXPLORER') this.router.navigate(['/explore']);
        else if (dest === 'KADYS') this.router.navigate(['/kadys']);
        else if (dest === 'MES_RDV') this.router.navigate(['/client/rdv']);
        else if (dest === 'MES_COMMANDES') this.router.navigate(['/client/commandes']);
        else if (dest === 'MES_FAVORIS') this.router.navigate(['/client/favoris']);
        else if (dest === 'CONNEXION') this.router.navigate(['/auth/login']);
        else this.router.navigate(['/explore']);
        break;
      }

      case 'ui_preparer_rdv_salon': {
        const targetSlug = p['slugSalon'];
        if (targetSlug) {
          const ids: number[] = p['varianteIds'] || [];
          for (const id of ids) {
            this.bookingStore.addVariante({
              id,
              serviceNom: 'Prestation sélectionnée',
              varianteNom: 'Formule #' + id,
              dureeMinutes: 45,
              prix: 15000
            });
          }
          this.router.navigate([`/${targetSlug}/rdv`]);
        }
        break;
      }
    }
  }
}
