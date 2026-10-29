import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { LoadingService } from '../../services/loading.service';

export interface RequestOptions {
  params?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
  headers?: Record<string, string | string[]>;
  silent?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly loadingService = inject(LoadingService);
  private readonly baseUrl = environment.apiUrl;

  private createParams(
    paramsObj?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>
  ): HttpParams {
    let params = new HttpParams();
    if (paramsObj) {
      Object.entries(paramsObj).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          if (Array.isArray(val)) {
            val.forEach((item) => {
              params = params.append(key, String(item));
            });
          } else {
            params = params.set(key, String(val));
          }
        }
      });
    }
    return params;
  }

  private createHeaders(headersObj?: Record<string, string | string[]>): HttpHeaders {
    let headers = new HttpHeaders();
    if (headersObj) {
      Object.entries(headersObj).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          headers = headers.set(key, val);
        }
      });
    }
    return headers;
  }

  private executeWithLoading<T>(
    operation: () => Observable<ApiResponse<T>>,
    silent = false
  ): Observable<ApiResponse<T>> {
    if (!silent) {
      this.loadingService.show();
    }
    return operation().pipe(
      finalize(() => {
        if (!silent) {
          this.loadingService.hide();
        }
      })
    );
  }

  get<T>(path: string, options?: RequestOptions): Observable<ApiResponse<T>> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const httpOptions = {
      params: this.createParams(options?.params),
      headers: this.createHeaders(options?.headers)
    };
    return this.executeWithLoading(() => this.http.get<ApiResponse<T>>(url, httpOptions), options?.silent);
  }

  post<T>(path: string, body: unknown, options?: RequestOptions): Observable<ApiResponse<T>> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const httpOptions = {
      params: this.createParams(options?.params),
      headers: this.createHeaders(options?.headers)
    };
    return this.executeWithLoading(() => this.http.post<ApiResponse<T>>(url, body, httpOptions), options?.silent);
  }

  put<T>(path: string, body: unknown, options?: RequestOptions): Observable<ApiResponse<T>> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const httpOptions = {
      params: this.createParams(options?.params),
      headers: this.createHeaders(options?.headers)
    };
    return this.executeWithLoading(() => this.http.put<ApiResponse<T>>(url, body, httpOptions), options?.silent);
  }

  patch<T>(path: string, body: unknown, options?: RequestOptions): Observable<ApiResponse<T>> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const httpOptions = {
      params: this.createParams(options?.params),
      headers: this.createHeaders(options?.headers)
    };
    return this.executeWithLoading(() => this.http.patch<ApiResponse<T>>(url, body, httpOptions), options?.silent);
  }

  delete<T>(path: string, options?: RequestOptions): Observable<ApiResponse<T>> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const httpOptions = {
      params: this.createParams(options?.params),
      headers: this.createHeaders(options?.headers)
    };
    return this.executeWithLoading(() => this.http.delete<ApiResponse<T>>(url, httpOptions), options?.silent);
  }
}
