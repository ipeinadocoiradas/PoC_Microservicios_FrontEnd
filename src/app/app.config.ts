import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { FuenteHistorialSaga } from './core/historial/fuente-historial-saga';
import { interceptorCorrelacion } from './core/http/interceptor-correlacion';
import { HistorialSagaServidor } from './core/historial/historial-saga-servidor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([interceptorCorrelacion])),
    { provide: LOCALE_ID, useValue: 'es' },        
    { provide: FuenteHistorialSaga, useClass: HistorialSagaServidor },
  ],
};
