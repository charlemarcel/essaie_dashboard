import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';


import { Component, Inject, OnInit,Input } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';

import { GeoJSON } from 'ol/format';
import { area as turfArea } from '@turf/turf';
import { toLonLat } from 'ol/proj';

interface SaveFormDialogData {
  geometry: Feature<Polygon>;
  shapeType: 'polygon' | 'buffer';
  radius?: number; // seulement pour buffer
  pointCoords?: [number, number]; // EPSG:3857
}

@Component({
  selector: 'app-save-form-dialog',
  standalone: true,
  imports: [ CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDialogModule,
    MatButtonModule],
  templateUrl: './save-form-dialog.component.html',
  styleUrls: ['./save-form-dialog.component.css']
})
export class SaveFormDialogComponent {
  polygonShape: 'buffer' | 'polygon' = 'polygon'; // Valeur par défaut
  polygonName: string = '';

  constructor(
    private dialogRef: MatDialogRef<SaveFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (data?.polygonShape === 'buffer') {
      this.polygonShape = 'buffer';
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    this.dialogRef.close({
      name: this.polygonName,
      shape: this.polygonShape,
    });
  }
}



