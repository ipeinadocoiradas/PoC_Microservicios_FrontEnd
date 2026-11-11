/**
 * Estados internos de la Saga, tal como los persiste `GestorSagaPedidos` en la columna `EstadoActual`.
 * No confundir con {@link EstadoPedido}: el pedido permanece `Pendiente` mientras la Saga avanza.
 */
export const ESTADOS_SAGA = [
  'PedidoPendiente',
  'ReservandoStock',
  'ProcesandoPago',
  'CompensandoOperaciones',
  'Completado',
  'Cancelado',
  'Fallido',
] as const;

export type EstadoSaga = (typeof ESTADOS_SAGA)[number];

export const ESTADOS_SAGA_FINALES: readonly EstadoSaga[] = ['Completado', 'Cancelado', 'Fallido'];

export const esEstadoSagaFinal = (estado: EstadoSaga | null | undefined): boolean =>
  estado != null && ESTADOS_SAGA_FINALES.includes(estado);

/** Texto explicativo de cada estado, mostrado en el monitor y en el diagrama. */
export const DESCRIPCION_ESTADO_SAGA: Record<EstadoSaga, string> = {
  PedidoPendiente: 'Instancia creada con los datos del pedido; se abandona al enviar el primer comando.',
  ReservandoStock: 'Esperando la respuesta de Almacén (StockReservado o StockNoDisponible).',
  ProcesandoPago: 'Stock reservado; esperando la respuesta de Pagos.',
  CompensandoOperaciones: 'Compensaciones enviadas; no se sale de aquí hasta confirmarlas todas.',
  Completado: 'Final: pedido cobrado y reserva consolidada.',
  Cancelado: 'Final: causa de negocio, con las compensaciones confirmadas.',
  Fallido: 'Final: fallo técnico del pago, con las compensaciones confirmadas.',
};

/**
 * Una transición de la Saga en la línea de tiempo del monitor.
 *
 * - En la **fase 1** las transiciones son **observadas** por el front mediante sondeo: se registran cuando
 *   la consulta de estado devuelve un valor distinto del anterior, de modo que las transiciones rápidas
 *   (milisegundos) pueden no verse.
 * - En la **fase 2** las proporcionará el backend (`GET /api/pedidos/{id}/historial`) con el evento que
 *   provocó cada cambio, y la línea de tiempo será completa.
 */
export interface TransicionSaga {
  readonly estadoAnterior: EstadoSaga | null;
  readonly estadoNuevo: EstadoSaga;
  readonly fechaUtc: string;
  /** Evento o mensaje que provocó la transición. Solo disponible con el historial del servidor (fase 2). */
  readonly evento?: string;
  readonly origen: 'observado' | 'servidor';
}
