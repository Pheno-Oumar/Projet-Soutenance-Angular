import { Component, OnInit, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AssistantService } from '../../services/assistant.service';
import { AssistantUiActionHandler } from '../../services/assistant-ui-action.handler';
import { SalonContextStore } from '../../../vitrine/state/salon-context.store';
import { SalonBookingStore } from '../../../vitrine/state/salon-booking.store';
import { SalonCartStore } from '../../../vitrine/state/salon-cart.store';
import { AssistantMessage, AssistantCarte, PendingActionDTO } from '../../models/assistant.models';

@Component({
  selector: 'app-assistant-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './assistant-widget.component.html',
  styleUrl: './assistant-widget.component.css'
})
export class AssistantWidgetComponent implements OnInit, AfterViewChecked {
  private readonly assistantService = inject(AssistantService);
  private readonly uiActionHandler = inject(AssistantUiActionHandler);
  readonly contextStore = inject(SalonContextStore);
  readonly bookingStore = inject(SalonBookingStore);
  readonly cartStore = inject(SalonCartStore);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  readonly isOpen = signal<boolean>(false);
  readonly isTyping = signal<boolean>(false);
  readonly unreadCount = signal<number>(0);
  readonly messages = signal<AssistantMessage[]>([]);
  readonly suggestions = signal<string[]>([]);
  userInput = '';

  private shouldScrollToBottom = false;

  ngOnInit(): void {
    const salon = this.contextStore.salon();
    const salonNom = salon?.nom || 'notre salon';
    const welcomeText = `Bonjour et bienvenue chez ${salonNom}. Je suis votre concierge virtuel dédié à vos soins et créations capillaires. Comment puis-je vous accompagner aujourd'hui ?`;

    this.messages.set([
      {
        id: 'msg_welcome',
        sender: 'assistant',
        text: welcomeText,
        timestamp: new Date()
      }
    ]);

    this.suggestions.set([
      'Horaires & Accès',
      'Nos tarifs et prestations',
      'Créneaux disponibles',
      'Soins et boutique',
      'Avis des clients'
    ]);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  toggleOpen(): void {
    const nextState = !this.isOpen();
    this.isOpen.set(nextState);
    if (nextState) {
      this.unreadCount.set(0);
      this.shouldScrollToBottom = true;
    }
  }

  sendMessage(text?: string): void {
    const messageToSend = text || this.userInput;
    if (!messageToSend || !messageToSend.trim()) return;

    const trimmed = messageToSend.trim();
    this.userInput = '';

    const userMsg: AssistantMessage = {
      id: 'msg_user_' + Date.now(),
      sender: 'user',
      text: trimmed,
      timestamp: new Date()
    };

    this.messages.update(list => [...list, userMsg]);
    this.isTyping.set(true);
    this.shouldScrollToBottom = true;

    this.assistantService.chat(trimmed).subscribe({
      next: (response) => {
        this.isTyping.set(false);

        const assistantMsg: AssistantMessage = {
          id: 'msg_asst_' + Date.now(),
          sender: 'assistant',
          text: response.texte,
          timestamp: new Date(),
          cartes: response.cartes,
          actionEnAttente: response.actionEnAttente
        };

        this.messages.update(list => [...list, assistantMsg]);
        if (response.suggestions && response.suggestions.length > 0) {
          this.suggestions.set(response.suggestions);
        }

        if (!this.isOpen()) {
          this.unreadCount.update(c => c + 1);
        }

        // Exécution des actions UI (navigation, sélection, stores)
        if (response.actionsUi) {
          for (const action of response.actionsUi) {
            this.uiActionHandler.handle(action);
          }
        }

        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.isTyping.set(false);
        const errMsg: AssistantMessage = {
          id: 'msg_err_' + Date.now(),
          sender: 'assistant',
          text: 'Je rencontre une difficulté temporaire de connexion. Comment puis-je vous renseigner autrement ?',
          timestamp: new Date()
        };
        this.messages.update(list => [...list, errMsg]);
        this.shouldScrollToBottom = true;
      }
    });
  }

  confirmerAction(msg: AssistantMessage): void {
    if (!msg.actionEnAttente) return;
    const actionId = msg.actionEnAttente.actionId;

    this.assistantService.confirmerAction(actionId).subscribe({
      next: (resultatCarte) => {
        msg.isActionConfirmed = true;
        msg.confirmedResult = resultatCarte;
        msg.actionEnAttente = null;

        // Feedback positif de l'assistant
        const confirmedMsg: AssistantMessage = {
          id: 'msg_confirmed_' + Date.now(),
          sender: 'assistant',
          text: 'Votre action a été validée et enregistrée avec succès.',
          timestamp: new Date(),
          cartes: [resultatCarte]
        };
        this.messages.update(list => [...list, confirmedMsg]);
        this.shouldScrollToBottom = true;
      },
      error: (err) => {
        const errMsg: AssistantMessage = {
          id: 'msg_err_conf_' + Date.now(),
          sender: 'assistant',
          text: 'Cette action n\'a pas pu être validée ou a expiré. Veuillez reformuler votre demande.',
          timestamp: new Date()
        };
        this.messages.update(list => [...list, errMsg]);
        this.shouldScrollToBottom = true;
      }
    });
  }

  annulerAction(msg: AssistantMessage): void {
    if (!msg.actionEnAttente) return;
    const actionId = msg.actionEnAttente.actionId;
    this.assistantService.annulerAction(actionId).subscribe({
      next: () => {
        msg.actionEnAttente = null;
        const cancelMsg: AssistantMessage = {
          id: 'msg_cancel_' + Date.now(),
          sender: 'assistant',
          text: 'L\'action a été annulée.',
          timestamp: new Date()
        };
        this.messages.update(list => [...list, cancelMsg]);
        this.shouldScrollToBottom = true;
      }
    });
  }

  ajouterVarianteAuRdv(variante: any): void {
    this.bookingStore.addVariante({
      id: variante.varianteId || variante.id,
      serviceNom: variante.serviceNom || 'Prestation',
      varianteNom: variante.varianteNom || variante.nom || 'Formule',
      dureeMinutes: variante.dureeMinutes || 45,
      prix: variante.prix || 15000
    });
    this.bookingStore.openDrawer();
  }

  ajouterProduitAuPanier(produit: any): void {
    const slug = this.contextStore.currentSlug();
    if (slug) {
      this.cartStore.ajouterProduit(slug, {
        id: produit.produitId || produit.id,
        nom: produit.nom || 'Produit',
        prixVente: produit.prixVente || produit.prix || 10000
      }, 1);
      this.cartStore.openDrawer();
    }
  }

  onSelectCreneau(creneau: any): void {
    this.uiActionHandler.handle({
      type: 'ui_preselectionner_creneau',
      payload: {
        date: creneau.date,
        heureDebut: creneau.heureDebut,
        heureFin: creneau.heureFin,
        coiffeurId: creneau.coiffeurId,
        coiffeurNom: creneau.coiffeurNom
      }
    });
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (e) {
      // Ignoré
    }
  }
}
