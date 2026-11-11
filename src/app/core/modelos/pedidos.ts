import { EstadoSaga } from './saga';

/** Estado de negocio del pedido (el que ve el cliente). */
export type EstadoPedido = 'Pendiente' | 'Completado' | 'Cancelado' | 'Fallido';

export const esEstadoPedidoFinal = (estado: EstadoPedido | null | undefined): boolean =>
  estado != null && estado !== 'Pendiente';

export interface LineaPedidoPeticion {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

/** Cuerpo de `POST /api/pedidos`. */
export interface CrearPedidoPeticion {
  clienteId: string;
  moneda: string;
  lineas: LineaPedidoPeticion[];
}

/** Respuesta `202 Accepted` de `POST /api/pedidos`. */
export interface PedidoCreadoDto {
  pedidoId: string;
  estado: EstadoPedido;
  total: number;
  moneda: string;
}

export interface LineaPedidoDto {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

/** Respuesta de `GET /api/pedidos/{id}`. */
export interface PedidoDto {
  pedidoId: string;
  clienteId: string;
  estado: EstadoPedido;
  total: number;
  moneda: string;
  motivoFinalizacion: string | null;
  fechaCreacionUtc: string;
  fechaFinalizacionUtc: string | null;
  lineas: LineaPedidoDto[];
}

/** Elemento de `GET /api/pedidos/{id}/historial`: una transición registrada por la Saga. */
export interface TransicionSagaDto {
  secuencia: number;
  estadoAnterior: EstadoSaga | null;
  estadoNuevo: EstadoSaga;
  evento: string;
  fechaUtc: string;
}

/** Respuesta de `GET /api/pedidos/{id}/estado`: estado de negocio y estado técnico de la Saga. */
export interface EstadoPedidoDto {
  pedidoId: string;
  estadoPedido: EstadoPedido;
  /** Nulo durante los primeros instantes: el mensaje que crea la Saga aún está en el Outbox. */
  estadoSaga: EstadoSaga | null;
  reservaId: string | null;
  pagoId: string | null;
  motivo: string | null;
  ultimoErrorSaga: string | null;
  fechaActualizacionSagaUtc: string | null;
}
