// buffer-dialog.component.ts
import { Component, Inject, OnInit,ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toLonLat } from 'ol/proj';




interface BufferDialogData {
  point?: { lat: number, lon: number };
}

@Component({
  selector: 'app-buffer-dialog',
  standalone: true,
  imports: [ CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule],

  templateUrl: './buffer-dialog.component.html',
styleUrls:['./buffer-dialog.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class BufferDialogComponent implements OnInit {
  distance!: number;
  convertedLonLat: { lon: number; lat: number } | null = null;

  constructor(
    private dialogRef: MatDialogRef<BufferDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BufferDialogData
  ) {}

  ngOnInit(): void {
    if (this.data?.point) {
      const [x, y] = [this.data.point.lon, this.data.point.lat];
      const [lon, lat] = toLonLat([x, y]);
      this.convertedLonLat = { lon, lat };
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  confirm(): void {
    if (this.distance != null) {
      this.dialogRef.close(this.distance);
    }
  }
}
