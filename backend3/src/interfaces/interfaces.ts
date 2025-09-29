// Interfaces pour la structure GeoJSON
export interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any[];
  };
  properties: any;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}




export interface BarGroupedChartConfig {
  tableNames: string[];
  dimensionColumn: string;
  categoryColumn: string;
  valueColumn: string;
}







// Interface pour les lignes de données agrégées pour le Sunburst des milieux humides
// Basée sur le compte des occurrences (COUNT(*))
export interface MilieuxHumidesSunburstRow {
  classe: string;
  pression_1: string;
  count_records: number; // Propriété pour le nombre d'occurrences
}

// Interface pour le noeud de données d'un graphique Sunburst (structure hiérarchique)
export interface SunburstNode {
  name: string;
  value?: number;
  children?: SunburstNode[];
};