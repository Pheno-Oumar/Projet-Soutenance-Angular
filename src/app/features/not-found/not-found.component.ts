import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { RoleService } from '../../core/auth/services/role.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css'
})
export class NotFoundComponent implements OnInit {
  private readonly seoService = inject(SeoService);
  private readonly authService = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // 3D Tilt rotation state for interactive card
  protected readonly tiltRotateX = signal(0);
  protected readonly tiltRotateY = signal(0);
  protected readonly isHovered = signal(false);

  readonly isAuthenticated = this.authService.isAuthenticated;

  ngOnInit(): void {
    this.seoService.updateTags({
      title: '404 - Page Introuvable | Hair Style',
      description: "Oups ! La page ou l'espace que vous recherchez semble introuvable ou a été déplacé.",
      robots: 'noindex, follow'
    });
  }

  onMouseMove(event: MouseEvent, cardElement: HTMLElement): void {
    const rect = cardElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12; // Max 12deg tilt
    const rotateY = ((x - centerX) / centerX) * 12;

    this.tiltRotateX.set(Math.round(rotateX * 10) / 10);
    this.tiltRotateY.set(Math.round(rotateY * 10) / 10);
    this.isHovered.set(true);
  }

  onMouseLeave(): void {
    this.tiltRotateX.set(0);
    this.tiltRotateY.set(0);
    this.isHovered.set(false);
  }

  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
    } else {
      this.goToHome();
    }
  }

  goToHome(): void {
    if (this.isAuthenticated()) {
      this.roleService.navigateToDefaultSpace();
    } else {
      this.router.navigate(['/']);
    }
  }
}
