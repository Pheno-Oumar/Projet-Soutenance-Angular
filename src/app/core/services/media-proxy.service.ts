import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MediaProxyService {
  private readonly baseUrl = environment.apiUrl;

  /**
   * Retourne l'URL sécurisée et proxifiée pour toute image externe (Cloudinary, Unsplash)
   * afin de contourner à 100% le blocage de pistage (Tracking Prevention) des navigateurs
   * modernes (Edge, Brave, Safari, Firefox).
   */
  getSafeMediaUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim().length < 5) {
      return '';
    }

    const clean = url.trim();

    // Les images data URI ou chemins relatifs locaux ne nécessitent pas de proxy
    if (clean.startsWith('data:') || clean.startsWith('/assets/') || clean.startsWith('assets/')) {
      return clean;
    }

    // Protection anti-double-proxy : si l'URL est déjà proxifiée par notre backend, on la retourne directement
    if (clean.includes('/explore/media/proxy') || clean.includes('/media/proxy')) {
      return clean;
    }

    // Les fichiers vidéos (mp4, webm, ogg, mov, m4v ou Cloudinary /video/) ne doivent pas passer par le proxy
    // d'images car les balises HTML5 <video> exigent des requêtes Range (HTTP 206 Partial Content)
    // pour le streaming et le buffering que le proxy d'images ne supporte pas.
    const isVideo = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(clean) || clean.includes('/video/upload/') || clean.includes('/video/');
    if (isVideo) {
      return clean;
    }

    // Tout média Cloudinary ou Unsplash d'images est proxifié via notre backend same-origin
    if (clean.includes('cloudinary.com') || clean.includes('unsplash.com')) {
      return `${this.baseUrl}/explore/media/proxy?url=${encodeURIComponent(clean)}`;
    }

    return clean;
  }
}
