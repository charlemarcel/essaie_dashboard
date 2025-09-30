import { Component, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MatDialogModule } from '@angular/material/dialog';
import { CoordinateEnterComponent } from './coordinate-enter.component/coordinate-enter.component';

@Component({
  selector: 'app-button-selection',
  standalone: true,
  imports: [MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,],
  templateUrl: './button-selection-component.html',
  styleUrls: ['./button-selection-component.css'],
  encapsulation: ViewEncapsulation.None
})


export class ButtonSelectionComponent {
  @Output() enterCoordinates = new EventEmitter<void>();
  @Output() drawPoint = new EventEmitter<void>();
  @Output() drawPolygon = new EventEmitter<void>();

  onEnterCoordinates() {
    this.enterCoordinates.emit();
  }

  onDrawPoint() {
    this.drawPoint.emit();
  }

  onDrawPolygon() {
    this.drawPolygon.emit();
  }
}
