import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatLabel } from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

@Component({
  selector: 'app-coordinate-enter',
  standalone: true,
  imports: [ CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule],
  templateUrl: './coordinate-enter.component.html'
})
export class CoordinateEnterComponent {
  lat!: number;
  lon!: number;

  constructor(private dialogRef: MatDialogRef<CoordinateEnterComponent>) {}

  cancel(): void {
    this.dialogRef.close();  // fermeture sans retourner de données
  }

  confirm(): void {
    if (this.lat != null && this.lon != null) {
      // Ferme la modale en renvoyant un objet avec les coordonnées
      this.dialogRef.close({ lat: this.lat, lon: this.lon });
    }
    // Si les coordonnées ne sont pas remplies, on peut empêcher la fermeture ou gérer une erreur (non détaillé ici)
  }
}
