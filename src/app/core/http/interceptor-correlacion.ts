import { HttpInterceptorFn } from '@angular/common/http';

export const CABECERA_CORRELACION = 'X-Correlation-ID';

/**
 * Añade `X-Correlation-ID` a toda petición que no la traiga. El backend la devuelve en la respuesta,
 * la etiqueta en la traza y la incluye en sus logs, de modo que se puede localizar una acción de la
 * consola en el dashboard de Aspire.
 */
export const interceptorCorrelacion: HttpInterceptorFn = (peticion, siguiente) =>
  peticion.headers.has(CABECERA_CORRELACION)
    ? siguiente(peticion)
    : siguiente(peticion.clone({ setHeaders: { [CABECERA_CORRELACION]: `consola-${crypto.randomUUID()}` } }));
