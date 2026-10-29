import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AssistantChatRequest, AssistantChatResponse, AssistantCarte } from '../models/assistant.models';
import { AssistantContextService } from './assistant-context.service';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly http = inject(HttpClient);
  private readonly contextService = inject(AssistantContextService);

  private readonly baseUrl = `${environment.apiUrl}/assistant`;
  private sessionId = this.getOrCreateSessionId();

  private getOrCreateSessionId(): string {
    const existing = sessionStorage.getItem('assistant_session_id');
    if (existing) return existing;
    const generated = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    sessionStorage.setItem('assistant_session_id', generated);
    return generated;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  chat(message: string): Observable<AssistantChatResponse> {
    const payload: AssistantChatRequest = this.contextService.buildChatContext(message, this.sessionId);
    return this.http.post<ApiResponse<AssistantChatResponse>>(`${this.baseUrl}/chat`, payload).pipe(
      map(res => res.data)
    );
  }

  confirmerAction(actionId: string): Observable<AssistantCarte> {
    return this.http.post<ApiResponse<AssistantCarte>>(
      `${this.baseUrl}/actions/${actionId}/confirmer?sessionId=${this.sessionId}`,
      {}
    ).pipe(
      map(res => res.data)
    );
  }

  annulerAction(actionId: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(
      `${this.baseUrl}/actions/${actionId}/annuler`,
      {}
    ).pipe(
      map(() => void 0)
    );
  }
}
