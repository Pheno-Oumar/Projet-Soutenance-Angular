import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject
} from '@angular/core';
import Hls from 'hls.js';

@Directive({
  selector: 'video[appHlsVideo]',
  standalone: true
})
export class HlsVideoDirective implements OnChanges, OnDestroy {
  private readonly elRef = inject<ElementRef<HTMLVideoElement>>(ElementRef);
  private hls: Hls | null = null;
  private nativeErrorListener: (() => void) | null = null;

  @Input('appHlsVideo') videoUrl: string | null | undefined = null;
  @Input() fallbackMp4Url?: string;

  ngOnChanges(changes: SimpleChanges): void {
    if ('videoUrl' in changes) {
      this.initVideoSource();
    }
  }

  ngOnDestroy(): void {
    this.cleanupHls();
  }

  private initVideoSource(): void {
    const video = this.elRef.nativeElement;
    this.cleanupHls();

    if (!this.videoUrl || typeof this.videoUrl !== 'string' || !this.videoUrl.trim()) {
      video.src = '';
      return;
    }

    const trimmedUrl = this.videoUrl.trim();
    const { hlsUrl, mp4Fallback } = this.resolveUrls(trimmedUrl, this.fallbackMp4Url);

    // Si nous disposons d'une source HLS (.m3u8)
    if (hlsUrl) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          startFragPrefetch: true,
          progressive: true,
          autoStartLoad: true
        });

        hls.attachMedia(video);

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(hlsUrl);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // En cas d'échec réseau sur le master playlist (ex: fragmentation Cloudinary en cours)
                if (mp4Fallback && mp4Fallback !== hlsUrl) {
                  this.cleanupHls();
                  video.src = mp4Fallback;
                  video.load();
                } else {
                  hls.startLoad();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                if (mp4Fallback && mp4Fallback !== hlsUrl) {
                  this.cleanupHls();
                  video.src = mp4Fallback;
                  video.load();
                } else {
                  this.cleanupHls();
                }
                break;
            }
          }
        });

        this.hls = hls;
        return;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Support HLS natif (Safari macOS / iOS)
        video.src = hlsUrl;
        if (mp4Fallback && mp4Fallback !== hlsUrl) {
          this.nativeErrorListener = () => {
            if (this.nativeErrorListener) {
              video.removeEventListener('error', this.nativeErrorListener);
              this.nativeErrorListener = null;
            }
            video.src = mp4Fallback;
            video.load();
          };
          video.addEventListener('error', this.nativeErrorListener, { once: true });
        }
        return;
      }
    }

    // Fallback standard direct
    const directUrl = mp4Fallback || trimmedUrl;
    video.src = directUrl;
  }

  private resolveUrls(url: string, customFallback?: string): { hlsUrl: string | null; mp4Fallback: string } {
    let hlsUrl: string | null = null;
    let mp4Fallback = customFallback || url;

    const lower = url.toLowerCase();

    // 1. Déjà une URL HLS explicite (.m3u8)
    if (lower.endsWith('.m3u8') || lower.includes('.m3u8?')) {
      hlsUrl = url;
      if (!customFallback) {
        // Si c'est du Cloudinary avec sp_hd, on dérive l'URL MP4 directe de repli
        if (url.includes('/video/upload/sp_hd/')) {
          mp4Fallback = url.replace('/video/upload/sp_hd/', '/video/upload/').replace(/\.m3u8(\?.*)?$/, '.mp4$1');
        }
      }
    }
    // 2. URL Cloudinary standard (/video/upload/) : on dérive l'URL fragmentée HLS
    else if (url.includes('/video/upload/')) {
      hlsUrl = url.replace('/video/upload/', '/video/upload/sp_hd/').replace(/\.[^.?]+(\?.*)?$/, '.m3u8$1');
      mp4Fallback = url;
    }
    // 3. Fichier vidéo classique non Cloudinary (ex: blob:, asset local)
    else {
      hlsUrl = null;
      mp4Fallback = url;
    }

    return { hlsUrl, mp4Fallback };
  }

  private cleanupHls(): void {
    if (this.hls) {
      try {
        this.hls.destroy();
      } catch {
        // Ignorer les erreurs éventuelles de cleanup
      }
      this.hls = null;
    }

    if (this.nativeErrorListener) {
      try {
        this.elRef.nativeElement.removeEventListener('error', this.nativeErrorListener);
      } catch {
        // Ignorer
      }
      this.nativeErrorListener = null;
    }
  }
}
