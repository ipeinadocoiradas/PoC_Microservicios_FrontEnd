import { HttpErrorResponse } from '@angular/common/http';

/**
 * Error normalizado de la consola. Se construye a partir de un ProblemDetails (RFC 9457) del backend,
 * o de un fallo de red cuando la API no responde.
 */
export interface ErrorApi {
  readonly estadoHttp: number;
  readonly titulo: string;
  readonly detalle: string | null;
  /** Código estable del backend (extensión `codigo`, p. ej. `Pedido.ProductoRepetido`). */
  readonly codigo: string | null;
  readonly traceId: string | null;
  /** Errores de validación por campo (`ValidationProblemDetails.errors`). */
  readonly erroresValidacion: Readonly<Record<string, readonly string[]>>;
}

interface ProblemDetails {
  title?: string;
  detail?: string;
  codigo?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

export function traducirError(error: unknown): ErrorApi {
  if (!(error instanceof HttpErrorResponse)) {
    return crearError(0, 'Error inesperado', error instanceof Error ? error.message : String(error));
  }

  if (error.status === 0) {
    return crearError(0, 'La API no responde', 'Compruebe que el AppHost de Aspire (o las APIs) están en marcha.');
  }

  const problema = (typeof error.error === 'object' && error.error !== null ? error.error : {}) as ProblemDetails;

  return {
    estadoHttp: error.status,
    titulo: problema.title ?? `Error HTTP ${error.status}`,
    detalle: problema.detail ?? null,
    codigo: problema.codigo ?? null,
    traceId: problema.traceId ?? null,
    erroresValidacion: problema.errors ?? {},
  };
}

export const esNoEncontrado = (error: unknown): boolean =>
  error instanceof HttpErrorResponse && error.status === 404;

function crearError(estadoHttp: number, titulo: string, detalle: string | null): ErrorApi {
  return { estadoHttp, titulo, detalle, codigo: null, traceId: null, erroresValidacion: {} };
}
