import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { default as OlMap } from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Fill, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { ApiService } from '../api.service';
import { LayersComponent, LayerVisibilityChangeEvent } from '../layers/layers.component';
import { GeoJsonFeatureCollection } from 'C:/Users/ndomo/Desktop/cours université/preparation essaie/essai_dashboard/backend3/src/interfaces/interfaces';
import { GraphicComponent } from '../graphic/graphic.component';
import { SelectionToolsComponent } from '../selection-tools/selection-tools.component';



@Component({
    selector: 'app-map',
    standalone: true,
    imports: [LayersComponent, GraphicComponent, SelectionToolsComponent],
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
    map!: OlMap;
    private vectorLayers: Map<string, VectorLayer<any>> = new Map();

    constructor(private apiService: ApiService) { }

    ngOnInit(): void {
        this.initMap();
    }

    private initMap(): void {
        this.map = new OlMap({
            target: 'map',
            layers: [
                new TileLayer({
                    source: new OSM()
                })
            ],
            view: new View({
                center: fromLonLat([-71.9, 46.2]),
                zoom: 7
            })
        });
        (window as any).olMap = this.map; // on rend la carte accessible à SelectionToolsComponent
    }

    //on nettoie à la destruction du composant de selection
    ngOnDestroy(): void {
        if ((window as any).olMap === this.map) {
            delete (window as any).olMap;
        }
    }


    onLayerVisibilityChange(event: LayerVisibilityChangeEvent): void {
        const { layerId, isVisible } = event;
        if (isVisible) {
            this.addGeoJsonLayer(layerId);
        } else {
            this.removeGeoJsonLayer(layerId);
        }
    }

    private addGeoJsonLayer(layerId: string): void {
        if (this.vectorLayers.has(layerId)) {
            this.vectorLayers.get(layerId)?.setVisible(true);
            return;
        }

        // FIX 2: Corrected typo from getGeoJSON to getGeoJson
        this.apiService.getGeoJson(layerId).subscribe({
            // FIX 3: Added the correct type for the received data
            next: (geojsonData: GeoJsonFeatureCollection) => {
                if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
                    console.warn(`Les données GeoJSON pour la couche ${layerId} sont vides.`);
                    return;
                }

                const vectorSource = new VectorSource({
                    features: new GeoJSON().readFeatures(geojsonData, {
                        featureProjection: 'EPSG:3857'
                    })
                });

                const vectorLayer = new VectorLayer({
                    source: vectorSource,
                    style: new Style({
                        stroke: new Stroke({ color: '#FF00FF', width: 2 }),
                        fill: new Fill({ color: 'rgba(255, 0, 255, 0.3)' })
                    })
                });

                this.map.addLayer(vectorLayer);
                this.vectorLayers.set(layerId, vectorLayer);

                const extent = vectorSource.getExtent();

                // FIX 4: Corrected the logic to check if the extent is valid
                if (extent && extent.every((c: number) => isFinite(c))) {
                    this.map.getView().fit(extent, {
                        padding: [50, 50, 50, 50],
                        duration: 1000
                    });
                }
            },
            // FIX 5: Added a type for the error object
            error: (err: any) => {
                console.error(`❌ Erreur lors de la récupération des données GeoJSON pour ${layerId}:`, err);
            }
        });
    }

    private removeGeoJsonLayer(layerId: string): void {
        if (this.vectorLayers.has(layerId)) {
            this.vectorLayers.get(layerId)?.setVisible(false);
        }
    }
}