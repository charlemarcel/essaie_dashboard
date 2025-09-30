import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import {
  GraphicPrefineServiceApi,
  CreatePresetDto,
  PresetType,
  Preset
} from '../graphic.prefine.service.api';

type RegisterPresetData = {
  type: PresetType;
  config: any;
  ownerId?: string;
};

@Component({
  selector: 'app-register-preset-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Enregistrer ce graphique</h2>

    <form [formGroup]="form" (ngSubmit)="save()" class="form">
      <mat-dialog-content>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nom du preset</mat-label>
          <input matInput formControlName="name" maxlength="100" required />
          <mat-hint align="end">{{ form.value.name?.length || 0 }}/100</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Type</mat-label>
          <mat-select formControlName="type">
            <mat-option value="pie">Camembert</mat-option>
            <mat-option value="bar">Barres</mat-option>
            <mat-option value="bar_groupé">Barres groupées</mat-option>
            <mat-option value="ligne">Ligne</mat-option>
            <mat-option value="sunburst">Sunburst</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="row">
          <mat-slide-toggle formControlName="is_public">Public</mat-slide-toggle>
        </div>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Identifiant propriétaire (optionnel)</mat-label>
          <input matInput formControlName="owner_id" />
        </mat-form-field>

        <small class="muted">Le JSON de configuration sera stocké tel quel.</small>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="close()">Annuler</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading">
          {{ loading ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form { min-width: 420px; }
    .w-full { width: 100%; }
    .row { margin: 8px 0; }
    .muted { color: #666; }
  `]
})
export class RegisterPresetDialog {
  loading = false;
  form!: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RegisterPresetData,
    private fb: FormBuilder,
    private api: GraphicPrefineServiceApi,
    private ref: MatDialogRef<RegisterPresetDialog>
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      type: [{ value: this.data.type, disabled: true }],
      is_public: [false],
      owner_id: [this.data.ownerId ?? '']
    });
  }

  close() { this.ref.close(); }

  save() {
    if (this.form.invalid || this.loading) return;

    const dto: CreatePresetDto = {
      name: this.form.getRawValue().name,   // getRawValue car 'type' est disabled
      type: this.data.type,
      schema_version: 1,
      is_public: !!this.form.getRawValue().is_public,
      owner_id: this.form.getRawValue().owner_id || null,
      config: this.data.config
    };

    this.loading = true;
    this.api.createPreset(dto).subscribe({
      next: (created: Preset) => {
        this.loading = false;
        this.ref.close(created);
      },
      error: (err: any) => {
        this.loading = false;
        // Si on reçoit une erreur 409 (Conflict) du backend
        if (err.status === 409) {
          // On attache une erreur 'duplicate' au champ 'name' du formulaire
          this.form.get('name')?.setErrors({ duplicate: true });
        } else {
          // Pour les autres erreurs, on logue dans la console
          console.error('[RegisterPresetDialog] createPreset failed:', err);
        }
      }
    });
  }
}
