import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from './app/app'; // Asegúrate de que el nombre del componente principal sea correcto
import { routes } from './app/app.routes';


bootstrapApplication(App, { // He cambiado 'App' por 'AppComponent' que es el nombre convencional
  providers: [
    provideRouter(routes),

    // NO se debe agregar 'provideCharts()' aquí.
    // La configuración de los gráficos se hace importando
    // NgChartsModule directamente en el componente que lo usa.
  ]
})
  .catch(err => console.error(err));