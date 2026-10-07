import { Injectable } from '@angular/core';

export interface FlyOptions {
  color?: string;
  size?: number;
  duration?: number;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FlyToTargetService {
  /**
   * Anime une particule ou icône depuis l'élément source jusqu'à l'élément cible (ex: badge panier ou rdv).
   */
  async fly(
    startElementOrCoords: HTMLElement | { x: number; y: number },
    targetElementOrSelector: HTMLElement | string,
    options: FlyOptions = {}
  ): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let targetEl: HTMLElement | null = null;
    if (typeof targetElementOrSelector === 'string') {
      targetEl = document.querySelector(targetElementOrSelector);
    } else {
      targetEl = targetElementOrSelector;
    }

    if (!targetEl) return;

    // Déterminer coordonnées de départ
    let startX = 0;
    let startY = 0;

    if ('getBoundingClientRect' in startElementOrCoords) {
      const rect = startElementOrCoords.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    } else {
      startX = startElementOrCoords.x;
      startY = startElementOrCoords.y;
    }

    // Déterminer coordonnées d'arrivée
    const targetRect = targetEl.getBoundingClientRect();
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    // Si la cible n'est pas affichée (largeur ou hauteur nulle), on s'arrête
    if (targetRect.width === 0 && targetRect.height === 0) return;

    // Créer la particule volante
    const particle = document.createElement('div');
    const size = options.size || 22;
    const color = options.color || '#4A3B32'; // Deep Warm Walnut (pas de gold!)

    particle.style.position = 'fixed';
    particle.style.zIndex = '99999';
    particle.style.left = `${startX - size / 2}px`;
    particle.style.top = `${startY - size / 2}px`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = color;
    particle.style.boxShadow = '0 8px 24px rgba(74, 59, 50, 0.45)';
    particle.style.pointerEvents = 'none';
    particle.style.display = 'flex';
    particle.style.alignItems = 'center';
    particle.style.justifyContent = 'center';
    particle.style.color = '#FFFFFF';
    particle.style.fontSize = '12px';
    particle.style.transition = 'none';

    if (options.icon) {
      particle.innerHTML = `<span class="material-icons" style="font-size: 13px;">${options.icon}</span>`;
    }

    document.body.appendChild(particle);

    const duration = options.duration || 650;
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Animation parabolique via Web Animations API
    const animation = particle.animate(
      [
        {
          transform: 'translate3d(0, 0, 0) scale(1)',
          opacity: 1
        },
        {
          transform: `translate3d(${deltaX * 0.45}px, ${deltaY * 0.2 - 60}px, 0) scale(1.25)`,
          opacity: 0.95,
          offset: 0.45
        },
        {
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.3)`,
          opacity: 0.7
        }
      ],
      {
        duration,
        easing: 'cubic-bezier(0.2, 0.8, 0.25, 1)',
        fill: 'forwards'
      }
    );

    return new Promise((resolve) => {
      animation.onfinish = () => {
        particle.remove();

        // Effet de choc / rebond sur la cible
        targetEl.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.28)', offset: 0.4 },
            { transform: 'scale(0.92)', offset: 0.75 },
            { transform: 'scale(1)' }
          ],
          {
            duration: 350,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
          }
        );

        resolve();
      };
    });
  }
}
