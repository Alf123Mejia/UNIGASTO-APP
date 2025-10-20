// src/app/app.config.ts

// NUEVO: Importaciones necesarias para el idioma
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es'; // Importamos el paquete de idioma español
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

// NUEVO: Registramos el idioma español en Angular
registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(), // <-- ASEGÚRATE DE AÑADIR ESTA LÍNEA
    // NUEVO: Le decimos a Angular que use 'es' (español) como el idioma por defecto para toda la app
    { provide: LOCALE_ID, useValue: 'es' }
  ]
};