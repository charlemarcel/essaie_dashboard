import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
// import { GeoJsonFeatureCollection } from 'C:/Users/ndomo/Desktop/cours université/preparation essaie/backend3/src/interfaces/interfaces';

// Interface pour les données géographiques (pas de changement)
export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: any[];
}

//  interface pour décrire une colonne (nom + type)
export interface ColumnInfo {
  name: string;
  type: string;
}

//  interface pour la configuration du graphique en pie à envoyer au backend
export interface PieChartConfig {
  tableName: string;
  categoryColumn: string;
  valueColumn: string;
  includeNulls?: boolean;
  unspecifiedLabel?: string;
  useSelection?: boolean;//utiliser le filtre de selection
  geomColumn?: string;
  options?: any;
}

//  interface pour la configuration du graphique en barres groupées
export interface BarGroupedChartConfig {
  tableNames: string[];
  dimensionColumn: string;
  categoryColumn: string;
  valueColumn: string;
  includeNulls?: boolean;
  unspecifiedLabel?: string;
  useSelection?: boolean;//utiliser le filtre de selection
  geomColumn?: string;
  options?: any;
}

// interface pour la configuration du graphique en ligne


export interface LineChartConfig {
  tableName?: string;           // mono
  tableNames?: string[];        // multi
  xColumn: string;              // X
  valueColumn: string;          // Y (numérique)
  seriesColumn?: string | null; // optionnel (multi)
  includeNulls?: boolean;       // considérer NULL comme "Non spécifié"
  useSelection?: boolean; //utiliser le filtre de selection
  geomColumn?: string;
  options?: any;
}

export interface LineChartResponse {
  x: string[];
  series: Array<{ name: string; data: number[] }>;
}



@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getGeoJson(tableName: string): Observable<GeoJsonFeatureCollection> {
    return this.http.get<GeoJsonFeatureCollection>(`${this.apiUrl}/geojson/${tableName}`);
  }

  /**
   * Récupère la liste des colonnes AVEC leur type de données.
   */
  getColumns(tableName: string): Observable<ColumnInfo[]> {
    return this.http.get<ColumnInfo[]>(`${this.apiUrl}/columns/${tableName}`);
  }

  /**
   *  méthode pour obtenir les données du graphique camembert, ligne, bar/bar groupé.
   */



  getPieChartData(config: PieChartConfig, useSelection = false) {
    const body = { ...config, useSelection: !!useSelection };
    const headers = useSelection ? new HttpHeaders({ 'X-Use-Selection': '1' }) : undefined;
    return this.http.post<any[]>(`${this.apiUrl}/chart-data/pie`, body, { headers });
  }


  /**
 * Récupère les données pour le Sunburst des milieux humides
 */
  getSunburstMilieuxHumides(): Observable<any> {
    const url = `${this.apiUrl}/sunburst-milieux-humides`;
    console.log('🌊 Appel API Sunburst (GET):', url);

    return this.http.get<any>(url);
  }

  getBarGroupedChartData(config: BarGroupedChartConfig): Observable<any[][]> {
    console.log('[API] POST /chart-data/bar-grouped useSel=', !!config.useSelection, config);
    return this.http.post<any[][]>(`${this.apiUrl}/chart-data/bar-grouped`, config);
  }


  getLineChartData(config: LineChartConfig) {
    console.log('[API] POST /chart-data/line useSel=', !!config.useSelection, config);
    return this.http.post<LineChartResponse>(`${this.apiUrl}/chart-data/line`, config);
  }
  /**
  * NOUVELLE méthode : Valide la compatibilité de la structure de plusieurs couches pour le diagramme en bar groupé.
  */
  validateLayerStructure(tableNames: string[]): Observable<{ compatible: boolean }> {
    return this.http.post<{ compatible: boolean }>(`${this.apiUrl}/validate-layer-structure`, { tableNames });
  }





}