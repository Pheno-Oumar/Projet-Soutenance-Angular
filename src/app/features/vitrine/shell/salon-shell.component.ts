import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { SalonNavbarComponent } from '../components/salon-navbar/salon-navbar.component';
import { SalonFooterComponent } from '../components/salon-footer/salon-footer.component';
import { BookingDrawerComponent } from '../components/booking-drawer/booking-drawer.component';
import { CartDrawerComponent } from '../components/cart-drawer/cart-drawer.component';
import { AuthGateModalComponent } from '../components/auth-gate-modal/auth-gate-modal.component';
import { AssistantWidgetComponent } from '../../assistant/components/assistant-widget/assistant-widget.component';
import { SalonContextStore } from '../state/salon-context.store';
import { SalonCartStore } from '../state/salon-cart.store';
import { SalonBookingStore } from '../state/salon-booking.store';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-salon-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SalonNavbarComponent,
    SalonFooterComponent,
    BookingDrawerComponent,
    CartDrawerComponent,
    AuthGateModalComponent,
    AssistantWidgetComponent,
    MatIconModule
  ],
  templateUrl: './salon-shell.component.html',
  styleUrl: './salon-shell.component.css'
})
export class SalonShellComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly contextStore = inject(SalonContextStore);
  readonly cartStore = inject(SalonCartStore);
  readonly bookingStore = inject(SalonBookingStore);

  readonly salon = this.contextStore.salon;
  readonly horaires = this.contextStore.horaires;
  readonly isLoading = this.contextStore.isLoading;

  get slugSalon(): string {
    return this.contextStore.currentSlug();
  }

  ngOnInit(): void {
    // Récupérer le paramètre :slugSalon depuis la route parente ou active
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slugSalon') || this.route.snapshot.parent?.paramMap.get('slugSalon') || '';
      if (slug) {
        this.contextStore.loadSalon(slug);
        this.cartStore.init(slug);
      }
    });
  }
}
