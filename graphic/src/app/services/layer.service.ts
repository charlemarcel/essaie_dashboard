// src/app/services/layer.service.ts

import { Injectable } from '@angular/core';


export interface Layer {
  id: string;
  name: string;
  visible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LayerService {


  private layers: Layer[] = [
    { id: 'agri2022', name: 'Agriculture 2022', visible: false },
    { id: 'agri2023', name: 'Agriculture 2023', visible: false },
    { id: 'agri2024', name: 'Agriculture 2024', visible: false },
    { id: 'milieux_humides', name: 'Milieux Humides', visible: false },
    { id: 'bati', name: 'Batiments', visible: false },
    { id: 'casernes', name: 'Casernes de pompiers', visible: false },
    { id: 'interventions_pompiers', name: 'Zones des interventions', visible: false },
    { id: 'reseau_express_velo', name: 'Reseau de velo', visible: false },
  ];

  constructor() { }

  /**
   * Retourne la liste complète des couches.
   */
  getLayers(): Layer[] {
    return this.layers;
  }
}