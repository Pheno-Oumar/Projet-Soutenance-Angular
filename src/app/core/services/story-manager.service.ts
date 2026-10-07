import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Story } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class StoryManagerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Publier une nouvelle story temporaire de 24h pour le salon (Manager)
   */
  publierStory(slugSalon: string, file: File): Observable<Story> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Story>(`${this.baseUrl}/${slugSalon}/manager/stories`, formData);
  }

  /**
   * Lister toutes les stories actives du salon (Manager)
   */
  listerStoriesSalon(slugSalon: string): Observable<Story[]> {
    return this.http.get<Story[]>(`${this.baseUrl}/${slugSalon}/manager/stories`);
  }

  /**
   * Supprimer manuellement une story avant ses 24h (Manager)
   */
  supprimerStory(slugSalon: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${slugSalon}/manager/stories/${id}`);
  }

  /**
   * Masquer un commentaire inapproprié sous une réalisation de son salon (Manager)
   */
  masquerCommentaire(slugSalon: string, commentaireId: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${slugSalon}/manager/kadys/commentaires/${commentaireId}/masquer`, {});
  }
}
