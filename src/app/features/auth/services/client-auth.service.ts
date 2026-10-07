import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, Compte } from '../../../shared/models';
import { ClientRegisterDto, SalonCheckDto } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class ClientAuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  checkSalonExists(slugSalon: string): Observable<ApiResponse<SalonCheckDto>> {
    return this.http.get<ApiResponse<SalonCheckDto>>(
      `${this.baseUrl}/${slugSalon}/check`
    );
  }

  registerClient(slugSalon: string, dto: ClientRegisterDto): Observable<ApiResponse<Compte>> {
    return this.http.post<ApiResponse<Compte>>(
      `${this.baseUrl}/${slugSalon}/vitrine/register`,
      dto
    );
  }
}
