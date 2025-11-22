import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
// CAMBIO: Importamos 'es-SV'
import localeEsSV from '@angular/common/locales/es-SV';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

// CAMBIO: Registramos 'es-SV'
registerLocaleData(localeEsSV);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    // CAMBIO: Usamos 'es-SV'
    { provide: LOCALE_ID, useValue: 'es-SV' }
  ]
};