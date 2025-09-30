import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { NgxEchartsModule } from 'ngx-echarts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), // Routeur
    provideAnimations(), // Active les animations (requises par Material)
    provideHttpClient(),
    importProvidersFrom(NgxEchartsModule.forRoot({
      echarts: () => import('echarts')
    }))

  ]
};