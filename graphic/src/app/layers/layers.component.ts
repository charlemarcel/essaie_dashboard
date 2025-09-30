// src/app/layers/layers.component.ts

import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { LayerService, Layer } from '../services/layer.service';



// Interface pour l'événement émis
export interface LayerVisibilityChangeEvent {
    layerId: string;
    isVisible: boolean;
}

@Component({
    selector: 'app-layers',
    standalone: true,
    imports: [CommonModule, MatCheckboxModule, MatButtonModule, MatIconModule],
    templateUrl: './layers.component.html',
    styleUrls: ['./layers.component.css']
})
export class LayersComponent implements OnInit {
    // Événement émis vers le composant parent
    @Output() visibilityChanged = new EventEmitter<LayerVisibilityChangeEvent>();

    panelOpen = false;
    layers: Layer[] = [];
    constructor(private layerService: LayerService) { }

    ngOnInit(): void {
        this.layers = this.layerService.getLayers();
    }

    togglePanel(): void {
        this.panelOpen = !this.panelOpen;
    }

    toggleLayer(event: MatCheckboxChange, layerId: string): void {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.visible = event.checked;
            console.log(`Émission de l'événement: Couche ${layerId} - Visible: ${layer.visible}`);

            // Émettre l'événement avec l'ID de la couche et son nouvel état de visibilité
            this.visibilityChanged.emit({ layerId: layerId, isVisible: layer.visible });
        }
    }
}