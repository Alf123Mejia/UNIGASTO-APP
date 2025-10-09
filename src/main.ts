// src/main.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config'; // NUEVO: Importamos la configuración central
import { App } from './app/app';

// NUEVO: Usamos la configuración importada 'appConfig'
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));