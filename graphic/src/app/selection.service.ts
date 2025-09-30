import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// GeoJSON "Polygon" ou "MultiPolygon"
export type GeoJSONGeometry = {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
};

export interface SelectionPayload {
    type: 'Feature';
    geometry: GeoJSONGeometry;
    properties?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class SelectionService {
    // private base = '/api/selection';
    private apiUrl = '/api';

    constructor(private http: HttpClient) { }


    setSelection(geojson: any): Observable<any> {
        const payload =
            geojson?.type === 'Feature'
                ? geojson
                : { geometry: geojson?.geometry ?? geojson };

        console.log('[SelectionService] POST', `${this.apiUrl}/selection`, payload);
        return this.http.post(`${this.apiUrl}/selection`, payload);
    }

    clearSelection(): Observable<any> {
        console.log('[SelectionService] DELETE', `${this.apiUrl}/selection`);
        return this.http.delete(`${this.apiUrl}/selection`);
    }

    getSelection(): Observable<any> {
        return this.http.get(`${this.apiUrl}/selection`);
    }
}
