// src/app/graphic.prefine.service.api.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type PresetType = 'pie' | 'bar' | 'bar_groupé' | 'ligne';

export interface Preset {
  id: string;
  name: string;
  type: PresetType;
  schema_version: number;
  is_public: boolean;
  owner_id: string | null;
  config: any;
  created_at: string;
  updated_at: string;
}

export interface CreatePresetDto {
  name: string;
  type: PresetType;
  is_public?: boolean;
  owner_id?: string | null;
  schema_version?: number;
  config: any;
}

@Injectable({ providedIn: 'root' })
export class GraphicPrefineServiceApi {
  // ✅ grâce au proxy, on reste relatif
  private base = '/api/presets';

  constructor(private http: HttpClient) { }

  createPreset(dto: CreatePresetDto): Observable<Preset> {
    return this.http.post<Preset>(this.base, dto);
  }
  listPresets(): Observable<Preset[]> {
    return this.http.get<Preset[]>(this.base);
  }
  getPreset(id: string): Observable<Preset> {
    return this.http.get<Preset>(`${this.base}/${id}`);
  }
  updatePreset(id: string, dto: Partial<CreatePresetDto>): Observable<Preset> {
    return this.http.put<Preset>(`${this.base}/${id}`, dto);
  }
  deletePreset(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
