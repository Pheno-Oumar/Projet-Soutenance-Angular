import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  KadysRealisation,
  CommentaireRealisation,
  CommentaireCreateDto,
  LikeToggleDto,
  SalonStories
} from '../../shared/models';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class KadysService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly activeStories = signal<SalonStories[]>([]);
  readonly feed = signal<KadysRealisation[]>([]);
  readonly chargement = signal<boolean>(false);

  /**
   * Récupère le flux public Kady's avec pagination (TikTok-style)
   */
  getFeed(page = 0, size = 10): Observable<PageResponse<KadysRealisation>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageResponse<KadysRealisation>>(`${this.baseUrl}/kadys/feed`, { params });
  }

  /**
   * Récupère les détails d'une réalisation spécifique
   */
  getRealisation(id: number): Observable<KadysRealisation> {
    return this.http.get<KadysRealisation>(`${this.baseUrl}/kadys/${id}`);
  }

  /**
   * Récupère les commentaires d'une réalisation
   */
  getCommentaires(id: number): Observable<CommentaireRealisation[]> {
    return this.http.get<CommentaireRealisation[]>(`${this.baseUrl}/kadys/${id}/commentaires`);
  }

  /**
   * Enregistre un visionnage de réalisation (Analytics)
   */
  enregistrerVue(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/kadys/${id}/vue`, {});
  }

  /**
   * Récupère toutes les stories actives (<24h) de tous les salons pour l'en-tête Kady's
   */
  getStoriesPourKadys(): Observable<SalonStories[]> {
    return this.http.get<SalonStories[]>(`${this.baseUrl}/kadys/stories`).pipe(
      tap((stories) => this.activeStories.set(stories))
    );
  }

  /**
   * Like / Unlike d'une réalisation (Nécessite authentification client)
   */
  toggleLike(id: number): Observable<LikeToggleDto> {
    return this.http.post<LikeToggleDto>(`${this.baseUrl}/kadys/${id}/like`, {});
  }

  /**
   * Publier un commentaire (Nécessite authentification client)
   */
  ajouterCommentaire(id: number, dto: CommentaireCreateDto): Observable<CommentaireRealisation> {
    return this.http.post<CommentaireRealisation>(`${this.baseUrl}/kadys/${id}/commentaires`, dto);
  }

  /**
   * Supprimer son commentaire (Nécessite authentification client)
   */
  supprimerCommentaire(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/kadys/commentaires/${id}`);
  }

  /**
   * Récupérer les inspirations (réalisations likées par le client connecté)
   */
  getInspirations(page = 0, size = 10): Observable<PageResponse<KadysRealisation>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageResponse<KadysRealisation>>(`${this.baseUrl}/client/inspirations`, { params });
  }
}
