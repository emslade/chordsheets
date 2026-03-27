import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ChordSheet, CreateChordSheetDto, UpdateChordSheetDto } from '@shared/types/index';

@Injectable({ providedIn: 'root' })
export class ChordSheetService {
  private baseUrl = '/api/sheets';

  constructor(private http: HttpClient) {}

  list(): Observable<ChordSheet[]> {
    return this.http.get<ChordSheet[]>(this.baseUrl);
  }

  get(id: string): Observable<ChordSheet> {
    return this.http.get<ChordSheet>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateChordSheetDto): Observable<ChordSheet> {
    return this.http.post<ChordSheet>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateChordSheetDto): Observable<ChordSheet> {
    return this.http.put<ChordSheet>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  share(id: string): Observable<ChordSheet> {
    return this.http.post<ChordSheet>(`${this.baseUrl}/${id}/share`, {});
  }

  unshare(id: string): Observable<ChordSheet> {
    return this.http.delete<ChordSheet>(`${this.baseUrl}/${id}/share`);
  }

  getShared(token: string): Observable<ChordSheet> {
    return this.http.get<ChordSheet>(`/api/shared/${token}`);
  }
}
