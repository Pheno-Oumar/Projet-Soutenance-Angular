import { Directive, ElementRef, HostListener, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appTilt3d]',
  standalone: true
})
export class Tilt3dDirective implements OnInit {
  @Input() maxTilt = 8; // Degrés max de rotation
  @Input() perspective = 900; // Profondeur en px
  @Input() scale = 1.02; // Légère mise à l'échelle au survol
  @Input() transitionSpeed = 300; // ms pour le retour au repos
  @Input() glare = true; // Reflet lumineux dynamique

  private glareElement?: HTMLElement;
  private isHovered = false;
  private rafId?: number;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const host = this.el.nativeElement;
    this.renderer.setStyle(host, 'transform-style', 'preserve-3d');
    this.renderer.setStyle(host, 'transition', `transform ${this.transitionSpeed}ms cubic-bezier(0.2, 0.8, 0.2, 1)`);

    if (this.glare) {
      this.glareElement = document.createElement('div');
      this.renderer.setStyle(this.glareElement, 'position', 'absolute');
      this.renderer.setStyle(this.glareElement, 'top', '0');
      this.renderer.setStyle(this.glareElement, 'left', '0');
      this.renderer.setStyle(this.glareElement, 'width', '100%');
      this.renderer.setStyle(this.glareElement, 'height', '100%');
      this.renderer.setStyle(this.glareElement, 'border-radius', 'inherit');
      this.renderer.setStyle(this.glareElement, 'pointer-events', 'none');
      this.renderer.setStyle(this.glareElement, 'opacity', '0');
      this.renderer.setStyle(this.glareElement, 'transition', 'opacity 300ms ease');
      this.renderer.setStyle(this.glareElement, 'z-index', '10');

      if (getComputedStyle(host).position === 'static') {
        this.renderer.setStyle(host, 'position', 'relative');
      }
      this.renderer.appendChild(host, this.glareElement);
    }
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.isHovered = true;
    if (this.glareElement) {
      this.renderer.setStyle(this.glareElement, 'opacity', '1');
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isHovered) return;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      const host = this.el.nativeElement;
      const rect = host.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calcul des angles de rotation proportionnels
      const rotateX = ((centerY - y) / centerY) * this.maxTilt;
      const rotateY = ((x - centerX) / centerX) * this.maxTilt;

      this.renderer.setStyle(
        host,
        'transform',
        `perspective(${this.perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${this.scale}, ${this.scale}, ${this.scale})`
      );

      // Calcul de la position de la lueur spéculaire
      if (this.glareElement) {
        const percentX = (x / rect.width) * 100;
        const percentY = (y / rect.height) * 100;
        this.renderer.setStyle(
          this.glareElement,
          'background',
          `radial-gradient(circle at ${percentX.toFixed(1)}% ${percentY.toFixed(1)}%, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 70%)`
        );
      }
    });
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isHovered = false;
    const host = this.el.nativeElement;

    this.renderer.setStyle(
      host,
      'transform',
      `perspective(${this.perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`
    );

    if (this.glareElement) {
      this.renderer.setStyle(this.glareElement, 'opacity', '0');
    }

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}
