import { Directive, ElementRef, Input, OnInit, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appRevealOnScroll]',
  standalone: true
})
export class RevealOnScrollDirective implements OnInit, OnDestroy {
  @Input() revealDelay = 0; // ms
  @Input() revealDistance = '28px';
  @Input() revealDuration = '700ms';
  @Input() revealThreshold = 0.12;

  private observer?: IntersectionObserver;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2
  ) {}

  ngOnInit(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const host = this.el.nativeElement;

    // État initial masqué
    this.renderer.setStyle(host, 'opacity', '0');
    this.renderer.setStyle(host, 'transform', `translate3d(0, ${this.revealDistance}, 0)`);
    this.renderer.setStyle(
      host,
      'transition',
      `opacity ${this.revealDuration} cubic-bezier(0.16, 1, 0.3, 1), transform ${this.revealDuration} cubic-bezier(0.16, 1, 0.3, 1)`
    );
    this.renderer.setStyle(host, 'will-change', 'opacity, transform');

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              this.renderer.setStyle(host, 'opacity', '1');
              this.renderer.setStyle(host, 'transform', 'translate3d(0, 0, 0)');
              this.renderer.addClass(host, 'is-revealed');
            }, this.revealDelay);

            // Déconnecter une fois révélé pour libérer la mémoire
            this.observer?.unobserve(host);
          }
        });
      },
      {
        threshold: this.revealThreshold,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    this.observer.observe(host);
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
