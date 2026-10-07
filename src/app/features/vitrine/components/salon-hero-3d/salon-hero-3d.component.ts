import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  NgZone,
  Input,
  HostBinding
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

@Component({
  selector: 'app-salon-hero-3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './salon-hero-3d.component.html',
  styleUrls: ['./salon-hero-3d.component.css']
})
export class SalonHero3dComponent implements OnInit, OnDestroy {
  @ViewChild('canvasRef', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() @HostBinding('style.opacity') opacity = 0.5;
  @Input() primaryColor = '#4A3B32'; // Deep Warm Walnut (pas de gold!)
  @Input() accentColor = '#C8B6A6';  // Sand Dune
  @Input() lightColor = '#FAF8F5';   // Warm Cream

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  private mainGroup!: THREE.Group;
  private silkKnotMesh!: THREE.Mesh;
  private outerRingMesh!: THREE.Mesh;
  private particlesMesh!: THREE.Points;

  private animationFrameId?: number;
  private isVisible = true;
  private intersectionObserver?: IntersectionObserver;

  // Curseur & inertie
  private targetRotationX = 0;
  private targetRotationY = 0;
  private currentRotationX = 0;
  private currentRotationY = 0;

  // Listeners pour nettoyage
  private boundOnMouseMove!: (e: MouseEvent) => void;
  private boundOnOrientation!: (e: DeviceOrientationEvent) => void;
  private boundOnResize!: () => void;

  constructor(
    private readonly hostRef: ElementRef<HTMLElement>,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Initialiser en dehors de la zone Angular pour ne pas déclencher de détection de changement inutile
    this.ngZone.runOutsideAngular(() => {
      this.initThreeScene();
      this.initInteractivity();
      this.initVisibilityObserver();
      this.startAnimationLoop();
    });
  }

  ngOnDestroy(): void {
    this.stopAnimationLoop();
    this.removeEventListeners();
    this.disposeThreeResources();
  }

  private initThreeScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.parentElement?.clientWidth || window.innerWidth;
    const height = canvas.parentElement?.clientHeight || 600;

    const isMobile = width < 768;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera adaptée pour que l'animation ne soit jamais surdimensionnée sur mobile
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, isMobile ? 6.2 : 5.2);

    // 3. WebGL Renderer optimisé (updateStyle=false pour préserver le sizing CSS 100%)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 4. Éclairages harmonieux et chaleureux
    const ambientLight = new THREE.AmbientLight(new THREE.Color(this.lightColor), 0.9);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.35);
    dirLight1.position.set(4, 5, 4);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(new THREE.Color(this.primaryColor), 0.75);
    dirLight2.position.set(-4, -3, 2);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(new THREE.Color(this.accentColor), 1.2, 10);
    pointLight.position.set(0, 1.5, 3);
    this.scene.add(pointLight);

    // 5. Groupe principal (réduit à ~52% sur mobile pour une élégance discrète)
    this.mainGroup = new THREE.Group();
    const initScale = isMobile ? 0.52 : 1.0;
    this.mainGroup.scale.set(initScale, initScale, initScale);
    this.scene.add(this.mainGroup);

    // 6. Ruban hélicoïdal principal (forme de mèche soyeuse / knot noble)
    const knotGeom = new THREE.TorusKnotGeometry(1.15, 0.32, 160, 28, 2, 3);
    const knotMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(this.primaryColor),
      emissive: new THREE.Color(this.primaryColor).multiplyScalar(0.08),
      roughness: 0.22,
      metalness: 0.14,
      clearcoat: 0.9,
      clearcoatRoughness: 0.18,
      reflectivity: 0.85
    });
    this.silkKnotMesh = new THREE.Mesh(knotGeom, knotMat);
    this.mainGroup.add(this.silkKnotMesh);

    // 7. Anneau orbital délicat Sand Dune
    const ringGeom = new THREE.TorusGeometry(1.85, 0.05, 24, 120);
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(this.accentColor),
      roughness: 0.3,
      metalness: 0.2,
      clearcoat: 0.6,
      transparent: true,
      opacity: 0.82
    });
    this.outerRingMesh = new THREE.Mesh(ringGeom, ringMat);
    this.outerRingMesh.rotation.x = Math.PI / 3;
    this.mainGroup.add(this.outerRingMesh);

    // 8. Nuée de particules lumineuses (Poussière de lumière dorée/dune)
    const particleCount = 220;
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 7.5;
      particlePositions[i + 1] = (Math.random() - 0.5) * 7.5;
      particlePositions[i + 2] = (Math.random() - 0.5) * 5.0;
    }

    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: new THREE.Color(this.accentColor),
      size: 0.038,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.particlesMesh = new THREE.Points(particleGeom, particleMat);
    this.scene.add(this.particlesMesh);
  }

  private initInteractivity(): void {
    this.boundOnMouseMove = (event: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (event.clientX / innerWidth) * 2 - 1;
      const y = -(event.clientY / innerHeight) * 2 + 1;

      this.targetRotationY = x * 0.45;
      this.targetRotationX = -y * 0.35;
    };

    this.boundOnOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma !== null && event.beta !== null) {
        // gamma: gauche/droite [-90, 90], beta: avant/arrière [-180, 180]
        this.targetRotationY = (event.gamma / 45) * 0.4;
        this.targetRotationX = ((event.beta - 45) / 45) * 0.3;
      }
    };

    this.boundOnResize = () => {
      if (!this.renderer || !this.camera) return;
      const canvas = this.canvasRef.nativeElement;
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || 600;
      const isMobile = width < 768;

      this.camera.aspect = width / height;
      this.camera.position.z = isMobile ? 6.2 : 5.2;
      this.camera.updateProjectionMatrix();

      // updateStyle=false pour que le canvas reste à 100% de son wrapper CSS
      this.renderer.setSize(width, height, false);

      const scale = isMobile ? 0.52 : 1.0;
      if (this.mainGroup) {
        this.mainGroup.scale.set(scale, scale, scale);
      }
    };

    window.addEventListener('mousemove', this.boundOnMouseMove, { passive: true });
    window.addEventListener('resize', this.boundOnResize, { passive: true });

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', this.boundOnOrientation, { passive: true });
    }
  }

  private initVisibilityObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        this.isVisible = entry.isIntersecting;

        if (this.isVisible && !this.animationFrameId) {
          this.startAnimationLoop();
        } else if (!this.isVisible && this.animationFrameId) {
          this.stopAnimationLoop();
        }
      },
      { threshold: 0.05 }
    );

    this.intersectionObserver.observe(this.hostRef.nativeElement);
  }

  private startAnimationLoop(): void {
    let clock = new THREE.Clock();

    const animate = () => {
      if (!this.isVisible) {
        this.animationFrameId = undefined;
        return;
      }

      this.animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Inertie douce vers la position cible de la souris
      this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.04;
      this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.04;

      if (this.mainGroup) {
        this.mainGroup.rotation.x = this.currentRotationX;
        this.mainGroup.rotation.y = this.currentRotationY + elapsedTime * 0.12;

        // Légère lévitation ondulatoire
        this.mainGroup.position.y = Math.sin(elapsedTime * 0.9) * 0.08;
      }

      if (this.silkKnotMesh) {
        this.silkKnotMesh.rotation.z = Math.sin(elapsedTime * 0.4) * 0.2;
      }

      if (this.outerRingMesh) {
        this.outerRingMesh.rotation.z -= 0.005;
        this.outerRingMesh.rotation.y += 0.003;
      }

      if (this.particlesMesh) {
        this.particlesMesh.rotation.y = -elapsedTime * 0.035;
        this.particlesMesh.rotation.x = Math.sin(elapsedTime * 0.15) * 0.05;
      }

      this.renderer.render(this.scene, this.camera);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private stopAnimationLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  private removeEventListeners(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.boundOnMouseMove);
      window.removeEventListener('resize', this.boundOnResize);
      window.removeEventListener('deviceorientation', this.boundOnOrientation);
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  private disposeThreeResources(): void {
    if (this.scene) {
      this.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return;

        if (object.geometry) {
          object.geometry.dispose();
        }

        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }
}
