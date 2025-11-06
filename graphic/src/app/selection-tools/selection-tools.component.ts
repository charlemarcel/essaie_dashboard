import { Component, inject, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

import { CoordinateEnterComponent } from './button-selection-component/coordinate-enter.component/coordinate-enter.component';
import { BufferDialogComponent } from './button-selection-component/buffer-dialog/buffer-dialog.component';
import { SaveFormDialogComponent } from './button-selection-component/save-form-dialog/save-form-dialog.component';
import { ButtonSelectionComponent } from './button-selection-component/button-selection-component';

import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Draw from 'ol/interaction/Draw';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import LineString from 'ol/geom/LineString';
import GeoJSON from 'ol/format/GeoJSON';
import { toLonLat, fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Select from 'ol/interaction/Select';
import { click } from 'ol/events/condition';
// import { Feature as GeoJSONFeature, GeoJsonProperties } from 'geojson';
import * as turf from '@turf/turf';

import Overlay from 'ol/Overlay';

import { SelectionService } from '../selection.service';
import OLGeoJSON from 'ol/format/GeoJSON'; // pour l'export du polygon OL


@Component({
  selector: 'app-selection-tools',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    ButtonSelectionComponent
  ],
  templateUrl: './selection-tools.component.html'
})
export class SelectionToolsComponent {
  @Input() map!: Map; // ← la carte viendra du parent (MapComponent)
  private selectedFeatures: Feature[] = [];
  private originalStyles: WeakMap<Feature, Style> = new WeakMap();
  private selectInteraction: Select | null = null;

  private helpTooltipElement!: HTMLElement;
  private helpTooltip!: Overlay;
  private measureTooltipElement!: HTMLElement;
  private measureTooltip!: Overlay;
  private sketch!: Feature | null;
  private mapPointerMoveListener: ((event: any) => void) | null = null;

  private currentDrawInteraction: Draw | null = null;
  private escapeKeyListener: ((event: KeyboardEvent) => void) | null = null;

  constructor(private dialog: MatDialog, private selectionSrv: SelectionService) { }

  // --- Méthodes de gestion de la sélection et suppression ---
  public highlightIntersectingFeatures(polygon: Polygon, map: Map, excludeLayer?: VectorLayer<VectorSource>): void {
    const highlightStyle = new Style({
      fill: new Fill({ color: 'rgba(255, 255, 0, 0.5)' }),
      stroke: new Stroke({ color: 'yellow', width: 2 }),
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: 'rgba(255, 255, 0, 0.8)' }),
        stroke: new Stroke({ color: 'yellow', width: 2 })
      })
    });

    this.resetFeatureStyles();

    const allLayers = map.getLayers().getArray();
    const vectorLayers = allLayers.filter(layer =>
      layer instanceof VectorLayer && layer !== excludeLayer
    ) as VectorLayer<VectorSource>[];

    vectorLayers.forEach(layer => {
      const source = layer.getSource();
      if (source) {
        source.getFeatures().forEach(feature => {
          const featureGeometry = feature.getGeometry();
          if (featureGeometry) {
            const extent = featureGeometry.getExtent();
            const intersects = polygon.intersectsExtent(extent);

            const contains = [
              [extent[0], extent[1]],
              [extent[0], extent[3]],
              [extent[2], extent[1]],
              [extent[2], extent[3]]
            ].every(coord => polygon.intersectsCoordinate(coord));

            if (intersects || contains) {
              const featureStyle = feature.getStyle();
              const layerStyle = layer.getStyle();

              if (featureStyle instanceof Style) {
                this.originalStyles.set(feature, featureStyle);
              } else if (typeof layerStyle === 'function') {
                const style = layerStyle(feature, 1);
                if (style instanceof Style) {
                  this.originalStyles.set(feature, style);
                }
              } else if (layerStyle instanceof Style) {
                this.originalStyles.set(feature, layerStyle);
              }

              feature.setStyle(highlightStyle);
              this.selectedFeatures.push(feature);
            }
          }
        });
      }
    });
  }

  public resetFeatureStyles(): void {
    this.selectedFeatures.forEach(feature => {
      const originalStyle = this.originalStyles.get(feature);
      if (originalStyle instanceof Style) {
        feature.setStyle(originalStyle);
      } else {
        feature.setStyle(undefined);
      }
    });
    this.selectedFeatures = [];
    this.originalStyles = new WeakMap();
  }

  public setupDeletionInteraction(map: Map): void {
    if (this.selectInteraction) {
      map.removeInteraction(this.selectInteraction);
      this.selectInteraction = null;
    }

    const deletableVectorLayers = map.getLayers().getArray().filter(layer =>
      layer instanceof VectorLayer && (layer as any).userCreated === true
    ) as VectorLayer<VectorSource>[];

    if (deletableVectorLayers.length === 0) {
      return;
    }

    this.selectInteraction = new Select({
      layers: deletableVectorLayers,
      condition: click,
      style: new Style({
        fill: new Fill({ color: 'rgba(255, 0, 0, 0.3)' }),
        stroke: new Stroke({ color: 'red', width: 2 }),
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({ color: 'rgba(255, 0, 0, 0.5)' }),
          stroke: new Stroke({ color: 'red', width: 2 })
        })
      })
    });

    map.addInteraction(this.selectInteraction);

    this.selectInteraction.on('select', (event) => {
      if (event.selected.length > 0) {
        const selectedFeature = event.selected[0];

        const layerToRemove = deletableVectorLayers.find(layer =>
          layer.getSource()?.getFeatures().some(f => f === selectedFeature)
        );

        if (layerToRemove) {
          layerToRemove.getSource()?.clear();
          map.removeLayer(layerToRemove);

          // supprimer les selections envoyées au backend
          this.selectionSrv.clearSelection().subscribe({
            next: () => console.log('[Selection] backend: sélection supprimée'),
            error: (e) => console.error('[Selection] backend: échec suppression', e)
          });
          this.setupDeletionInteraction(map);
          this.resetFeatureStyles();
        }
      }
    });
  }

  // --- Méthodes de gestion des tooltips et mesures ---
  public createMeasureTooltip(map: Map) {
    if (this.measureTooltipElement) {
      this.measureTooltipElement.parentNode?.removeChild(this.measureTooltipElement);
    }
    this.measureTooltipElement = document.createElement('div');
    this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
    this.measureTooltip = new Overlay({
      element: this.measureTooltipElement,
      offset: [0, -15],
      positioning: 'bottom-center',
      stopEvent: false,
      insertFirst: false,
    });
    map.addOverlay(this.measureTooltip);
  }

  public createHelpTooltip(map: Map) {
    if (this.helpTooltipElement) {
      this.helpTooltipElement.parentNode?.removeChild(this.helpTooltipElement);
    }
    this.helpTooltipElement = document.createElement('div');
    this.helpTooltipElement.className = 'ol-tooltip ol-tooltip-help';
    this.helpTooltip = new Overlay({
      element: this.helpTooltipElement,
      offset: [15, 0],
      positioning: 'center-left',
      stopEvent: false,
      insertFirst: false,
    });
    map.addOverlay(this.helpTooltip);
  }

  public formatLength(line: LineString): string {
    const length = Math.round(line.getLength() * 100) / 100;
    let output;
    if (length > 100) {
      output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
    } else {
      output = length + ' ' + 'm';
    }
    return output;
  }

  public removeTooltips(): void {
    if (this.measureTooltipElement && this.measureTooltipElement.parentNode) {
      this.measureTooltipElement.parentNode.removeChild(this.measureTooltipElement);
      (this.measureTooltip as any).setMap(null); // Retire explicitement l'overlay de la carte
      this.measureTooltipElement = null as any;
    }
    if (this.helpTooltipElement && this.helpTooltipElement.parentNode) {
      this.helpTooltipElement.parentNode.removeChild(this.helpTooltipElement);
      (this.helpTooltip as any).setMap(null); // Retire explicitement l'overlay de la carte
      this.helpTooltipElement = null as any;
    }
    this.measureTooltip = null as any;
    this.helpTooltip = null as any;
  }

  // --- Méthodes de gestion de l'annulation du dessin ---
  public cancelDraw(map: Map): void {
    if (this.currentDrawInteraction) {
      map.removeInteraction(this.currentDrawInteraction);
      this.currentDrawInteraction = null;
    }

    if (this.sketch) {
      const source = (this.sketch.getGeometry() as any)?.getOwner()?.getSource();
      if (source instanceof VectorSource) {
        source.removeFeature(this.sketch);
      }
      this.sketch = null;
    }

    this.removeTooltips();

    if (this.escapeKeyListener) {
      document.removeEventListener('keydown', this.escapeKeyListener);
      this.escapeKeyListener = null;
    }

    if (this.mapPointerMoveListener) {
      map.un('pointermove', this.mapPointerMoveListener);
      this.mapPointerMoveListener = null;
    }
  }

  public setupEscapeKeyListener(map: Map): void {
    if (this.escapeKeyListener) {
      document.removeEventListener('keydown', this.escapeKeyListener);
    }

    this.escapeKeyListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancelDraw(map);
      }
    };
    document.addEventListener('keydown', this.escapeKeyListener);
  }

  // --- Méthodes d'activation des outils de dessin ---
  public startDrawPoint(): void {
    const map: Map = (window as any).olMap;
    if (!map) {
      console.error('❌ La carte OpenLayers n’est pas encore prête.');
      return;
    }

    this.cancelDraw(map); // Nettoie tout état de dessin précédent
    this.resetFeatureStyles();

    const source = new VectorSource();
    const pointLayer = new VectorLayer({
      source: source,
      style: new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: 'red' }),
          stroke: new Stroke({ color: 'black', width: 1 }),
        }),
      }),
    });
    (pointLayer as any).userCreated = true;
    map.addLayer(pointLayer);
    this.setupDeletionInteraction(map);

    const draw = new Draw({
      source: source,
      type: 'Point',
    });

    this.currentDrawInteraction = draw;
    this.setupEscapeKeyListener(map);

    map.addInteraction(draw);

    draw.on('drawend', (event) => {
      // Nettoyage après un dessin réussi
      if (this.currentDrawInteraction) {
        map.removeInteraction(this.currentDrawInteraction);
        this.currentDrawInteraction = null;
      }
      if (this.escapeKeyListener) {
        document.removeEventListener('keydown', this.escapeKeyListener);
        this.escapeKeyListener = null;
      }
      if (this.mapPointerMoveListener) {
        map.un('pointermove', this.mapPointerMoveListener);
        this.mapPointerMoveListener = null;
      }
      this.removeTooltips();


      const geometry = event.feature.getGeometry() as Point;
      const coords3857 = geometry.getCoordinates();

      const dialogRef = this.dialog.open(BufferDialogComponent, {
        width: '300px',
        data: {
          point: {
            lon: coords3857[0],
            lat: coords3857[1]
          }
        }
      });

      dialogRef.afterClosed().subscribe((distanceMetersInput) => {
        if (distanceMetersInput === undefined || distanceMetersInput === null || isNaN(Number(distanceMetersInput))) {
          console.error('❌ La distance du buffer est invalide ou non fournie.');
          this.cancelDraw(map); // Annuler si le buffer est annulé
          return;
        }
        const distanceMeters = Number(distanceMetersInput);

        const [lon, lat] = toLonLat(coords3857);
        const turfPoint = turf.point([lon, lat]);

        // creation du buffer
        const buffered = turf.buffer(turfPoint, distanceMeters, { units: 'meters' });

        if (!buffered) {
          console.error('❌ Échec de génération du buffer.');
          this.cancelDraw(map); // Annuler si le buffer échoue
          return;
        }
        // envoyer la selection ou buffer au back end

        console.log('[Selection] Envoi du buffer au backend (GeoJSON):', JSON.stringify(buffered));
        this.selectionSrv.setSelection(buffered as any).subscribe({
          next: () => console.log('[Selection] ✅ buffer envoyé au backend'),
          error: (e) => console.error('[Selection] ❌ échec envoi buffer', e)
        });

        const format = new GeoJSON();
        const features = format.readFeatures(
          turf.featureCollection([buffered]),
          { featureProjection: 'EPSG:3857' }
        );



        const bufferLayer = new VectorLayer({
          source: new VectorSource({ features }),
          style: new Style({
            fill: new Fill({ color: 'rgba(0, 128, 255, 0.3)' }),
            stroke: new Stroke({ color: '#007bff', width: 2 })
          })
        });
        (bufferLayer as any).userCreated = true;
        map.addLayer(bufferLayer);
        this.setupDeletionInteraction(map);

        this.highlightIntersectingFeatures(features[0].getGeometry() as Polygon, map, bufferLayer);

        const dialogSave = this.dialog.open(SaveFormDialogComponent, {
          width: '300px',
          data: {
            polygonShape: 'buffer',
            bufferRadius: distanceMeters,
            convertedLonLat: { lat, lon }
          }
        });

        dialogSave.afterClosed().subscribe((result) => {
          if (result) {
            console.log('✅ Données enregistrées :', result);
          } else {
            this.cancelDraw(map); // Annuler si la sauvegarde est annulée
          }
        });
      });
    });
  }

  public openCoordinateDialog(): void {
    const map: Map = (window as any).olMap;
    this.cancelDraw(map); // Nettoie tout état de dessin précédent
    this.resetFeatureStyles();

    const dialogRef = this.dialog.open(CoordinateEnterComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe((coords4326) => {
      if (!coords4326) {
        this.cancelDraw(map); // Annule le processus si l'utilisateur ferme la boîte de dialogue
        return;
      }

      const [lat, lon] = [coords4326.lat, coords4326.lon];
      const coords3857 = fromLonLat([lon, lat]);

      const pointFeature = new Feature({
        geometry: new Point(coords3857)
      });

      const source = new VectorSource({ features: [pointFeature] });
      const pointLayer = new VectorLayer({
        source: source,
        style: new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: 'red' }),
            stroke: new Stroke({ color: 'black', width: 1 })
          })
        })
      });
      (pointLayer as any).userCreated = true;
      map.addLayer(pointLayer);
      this.setupDeletionInteraction(map);

      const dialogBuffer = this.dialog.open(BufferDialogComponent, {
        width: '350px',
        data: {
          point: {
            lon: coords3857[0],
            lat: coords3857[1]
          }
        }
      });

      dialogBuffer.afterClosed().subscribe((distanceMetersInput) => {
        if (distanceMetersInput === undefined || distanceMetersInput === null || isNaN(Number(distanceMetersInput))) {
          console.error('❌ La distance du buffer est invalide ou non fournie.');
          this.cancelDraw(map); // Annuler si la saisie du buffer est annulée
          return;
        }
        const distanceMeters = Number(distanceMetersInput);

        const buffered = turf.buffer(turf.point([lon, lat]), distanceMeters, { units: 'meters' });
        if (!buffered) {
          this.cancelDraw(map); // Annuler en cas d'échec de buffer
          return;
        }

        //envoi la selection au back end
        this.selectionSrv.setSelection(buffered as any).subscribe({
          next: () => console.log('[Selection] buffer envoyé au backend'),
          error: (e) => console.error('[Selection] échec envoi buffer', e)
        });


        const format = new GeoJSON();
        const features = format.readFeatures(
          turf.featureCollection([buffered]),
          { featureProjection: 'EPSG:3857' }
        );

        const bufferLayer = new VectorLayer({
          source: new VectorSource({ features }),
          style: new Style({
            fill: new Fill({ color: 'rgba(0, 128, 255, 0.3)' }),
            stroke: new Stroke({ color: '#007bff', width: 2 })
          })
        });
        (bufferLayer as any).userCreated = true;
        map.addLayer(bufferLayer);
        this.setupDeletionInteraction(map);

        this.highlightIntersectingFeatures(features[0].getGeometry() as Polygon, map, bufferLayer);

        const dialogSave = this.dialog.open(SaveFormDialogComponent, {
          width: '300px',
          data: {
            polygonShape: 'buffer',
            bufferRadius: distanceMeters,
            convertedLonLat: coords4326
          }
        });

        dialogSave.afterClosed().subscribe((result) => {
          if (result) {
            console.log('✅ Données enregistrées :', result);
          } else {
            this.cancelDraw(map); // Annuler si la sauvegarde est annulée
          }
        });
      });
    });

  }


  public startDrawPolygon(): void {
    const map = (window as any).olMap;
    this.resetFeatureStyles();

    if (!map) {
      console.error('❌ La carte OpenLayers n’est pas encore prête.');
      return;
    }

    this.cancelDraw(map);

    this.createMeasureTooltip(map);
    this.createHelpTooltip(map);

    const source = new VectorSource();
    const polygonLayer = new VectorLayer({
      source: source,
      style: new Style({
        fill: new Fill({ color: 'rgba(0, 128, 255, 0.3)' }),
        stroke: new Stroke({ color: '#007bff', width: 2 })
      })
    });
    (polygonLayer as any).userCreated = true;
    map.addLayer(polygonLayer);
    this.setupDeletionInteraction(map);

    // SOLUTION: Créer une interaction Draw standard
    const draw = new Draw({
      source: source,
      type: 'Polygon',
      style: new Style({
        fill: new Fill({
          color: 'rgba(0, 128, 255, 0.1)',
        }),
        stroke: new Stroke({
          color: 'deepskyblue',
          width: 3,
        }),
        image: new CircleStyle({
          radius: 6,
          stroke: new Stroke({
            color: 'deepskyblue',
            width: 2
          }),
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.5)',
          }),
        }),
      })
    });

    this.currentDrawInteraction = draw;
    this.setupEscapeKeyListener(map);

    map.addInteraction(draw);

    // SOLUTION: Ajouter un écouteur d'événement pour le double-clic sur la carte
    let dblClickListener: ((event: any) => void) | null = null;

    draw.on('drawstart', (event) => {
      this.sketch = event.feature;
      const firstCoord = (this.sketch.getGeometry() as Polygon).getCoordinates()[0][0];
      this.measureTooltip.setPosition(firstCoord);

      this.helpTooltip.setPosition(firstCoord);
      this.helpTooltipElement.innerHTML = '<span style="font-weight: bold; font-style: italic;">Double-cliquez pour terminer</span>';

      // SOLUTION: Ajouter l'écouteur de double-clic
      dblClickListener = (mapEvent: any) => {
        if (mapEvent.type === 'dblclick') {
          // Terminer le dessin manuellement
          draw.finishDrawing();
        }
      };

      map.on('dblclick', dblClickListener);
    });

    draw.on('drawend', (event) => {
      // Nettoyer l'écouteur de double-clic
      if (dblClickListener) {
        map.un('dblclick', dblClickListener);
        dblClickListener = null;
      }

      if (this.currentDrawInteraction) {
        map.removeInteraction(this.currentDrawInteraction);
        this.currentDrawInteraction = null;
      }
      if (this.escapeKeyListener) {
        document.removeEventListener('keydown', this.escapeKeyListener);
        this.escapeKeyListener = null;
      }
      if (this.mapPointerMoveListener) {
        map.un('pointermove', this.mapPointerMoveListener);
        this.mapPointerMoveListener = null;
      }
      this.removeTooltips();
      this.sketch = null;

      const geometry = event.feature.getGeometry() as Polygon;

      const fmt = new GeoJSON();
      const featureGeo = fmt.writeFeatureObject(event.feature, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326'
      }) as any;

      console.log('[Selection] Envoi polygon GeoJSON au backend:', featureGeo);
      this.selectionSrv.setSelection(featureGeo).subscribe({
        next: () => console.log('[Selection] ✅ polygon envoyé au backend'),
        error: (e) => console.error('[Selection] ❌ échec envoi polygon', e)
      });

      this.highlightIntersectingFeatures(geometry, map, polygonLayer);

      const dialogRef = this.dialog.open(SaveFormDialogComponent, {
        width: '300px',
        data: {
          geometry: geometry
        }
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          console.log('✅ Données du formulaire sauvegardées :', result);
        } else {
          this.cancelDraw(map);
        }
      });
    });

    if (!this.mapPointerMoveListener) {
      this.mapPointerMoveListener = (evt: any) => {
        if (this.sketch && this.currentDrawInteraction) {
          const geometry = this.sketch.getGeometry() as Polygon;
          const coordinates = geometry.getCoordinates()[0];
          if (coordinates.length > 1) {
            const lastPoint = coordinates[coordinates.length - 1];
            const currentPoint = evt.coordinate;
            const segment = new LineString([lastPoint, currentPoint]);
            const length = this.formatLength(segment);
            this.measureTooltipElement.innerHTML = length;
            this.measureTooltip.setPosition(currentPoint);
          }
        }
        this.helpTooltip.setPosition(evt.coordinate);
      };
      map.on('pointermove', this.mapPointerMoveListener);
    }

    // SOLUTION: Ajouter également la possibilité de terminer avec la touche Entrée
    const enterKeyListener = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        draw.finishDrawing();
      }
    };
    document.addEventListener('keydown', enterKeyListener);

    // Nettoyer l'écouteur de touche Entrée à la fin
    draw.on('drawend', () => {
      document.removeEventListener('keydown', enterKeyListener);
    });
  }
}
