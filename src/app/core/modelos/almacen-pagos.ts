// Modelos de Almacen.Api y Pagos.Api. Reflejan los DTOs del backend (enums serializados como texto).

export type EstadoReserva = 'Reservada' | 'Confirmada' | 'Liberada' | 'Rechazada';

export interface LineaReservaDto {
  productoId: string;
  cantidad: number;
}

/** Respuesta de `GET /api/reservas?pedidoId=…`. */
export interface ReservaDto {
  reservaId: string;
  pedidoId: string;
  estado: EstadoReserva;
  motivoRechazo: string | null;
  fechaActualizacionUtc: string;
  lineas: LineaReservaDto[];
}

/** Respuesta de `GET /api/productos/{id}/disponibilidad`. */
export interface DisponibilidadProductoDto {
  productoId: string;
  nombre: string;
  stockFisico: number;
  stockReservado: number;
  stockDisponible: number;
}

export type EstadoPago = 'Pendiente' | 'Completado' | 'Rechazado' | 'Cancelado' | 'Reembolsado';

/** Respuesta de `GET /api/pagos/{id}` y `GET /api/pagos?pedidoId=…`. */
export interface PagoDto {
  pagoId: string;
  pedidoId: string;
  clienteId: string;
  importe: number;
  moneda: string;
  estado: EstadoPago;
  codigoAutorizacion: string | null;
  motivo: string | null;
  fechaCreacionUtc: string;
  fechaActualizacionUtc: string;
}
