import { EstadoPedido } from '../modelos/pedidos';
import { LineaPedidoPeticion } from '../modelos/pedidos';
import { CATALOGO_DEMOSTRACION } from './catalogo';

/** Escenario de demostración con su pedido ya preparado y lo que debe ocurrir. */
export interface Escenario {
  readonly codigo: 'A' | 'B' | 'C' | 'D' | 'E';
  readonly titulo: string;
  readonly descripcion: string;
  readonly estadoFinalEsperado: EstadoPedido;
  readonly recorrido: string;
  readonly lineas: readonly LineaPedidoPeticion[];
  /** Pasos previos que hay que hacer fuera de la consola (configuración o dashboard de Aspire). */
  readonly preparacion?: readonly string[];
  /** Pasos a realizar mientras el pedido está en curso. */
  readonly duranteLaEjecucion?: readonly string[];
}

const [teclado, raton, monitor, agotado] = CATALOGO_DEMOSTRACION.map((producto) => producto.id);

export const ESCENARIOS: readonly Escenario[] = [
  {
    codigo: 'A',
    titulo: 'Compra satisfactoria',
    descripcion: '2 teclados a 49,90 €. Hay stock y el importe está por debajo del límite de la pasarela.',
    estadoFinalEsperado: 'Completado',
    recorrido: 'ReservandoStock → ProcesandoPago → Completado · reserva Confirmada · pago Completado',
    lineas: [{ productoId: teclado, cantidad: 2, precioUnitario: 49.9 }],
  },
  {
    codigo: 'B',
    titulo: 'Stock insuficiente',
    descripcion: '1 unidad de un producto agotado. Almacén responde StockNoDisponible.',
    estadoFinalEsperado: 'Cancelado',
    recorrido: 'ReservandoStock → Cancelado · reserva Rechazada · ningún pago',
    lineas: [{ productoId: agotado, cantidad: 1, precioUnitario: 199 }],
  },
  {
    codigo: 'C',
    titulo: 'Pago rechazado',
    descripcion: '2 monitores a 600 € (1.200 €) superan el límite de 1.000 €. Se compensa liberando el stock.',
    estadoFinalEsperado: 'Cancelado',
    recorrido: 'ProcesandoPago → CompensandoOperaciones → Cancelado · reserva Liberada · pago Rechazado',
    lineas: [{ productoId: monitor, cantidad: 2, precioUnitario: 600 }],
  },
  {
    codigo: 'D',
    titulo: 'Almacén caído durante la compensación',
    descripcion:
      'El mismo pedido que C, pero Almacén no está disponible cuando llega LiberarReservaStock. ' +
      'La compensación espera en la cola duradera y la Saga no finaliza hasta recibir la confirmación.',
    estadoFinalEsperado: 'Cancelado',
    recorrido: 'ProcesandoPago → CompensandoOperaciones (en espera) → Cancelado al volver Almacén',
    lineas: [{ productoId: monitor, cantidad: 2, precioUnitario: 600 }],
    preparacion: [
      'En el appsettings.Development.json de Pagos.Api añada "SimulacionPagos": { "LatenciaSimulada": "00:00:20" }.',
      'Reinicie pagos-api desde el dashboard de Aspire.',
      'Lanzar escenario D.',
      'En uno o dos segundos verás ProcesandoPago: el stock ya está reservado y Pagos está tardando 20s en responder.',
      'En ese momento, en el dashboard de Aspire → almacen-api → Stop (⏹).',
      'Espera unos 20 segundos. Comprueba que la compensación no se ha perdido.',
      'Recupera Almacén: en el dashboard → almacen-api → Start (▶).',
    ],
    duranteLaEjecucion: [
      'Cuando el monitor muestre ProcesandoPago, pulse Stop en almacen-api (dashboard de Aspire).',
      'Espere a ver CompensandoOperaciones: el pedido sigue Pendiente y el stock sigue reservado.',
      'Pulse Start en almacen-api: la compensación se procesa y el pedido termina Cancelado.',
      'Al terminar, quite LatenciaSimulada y reinicie pagos-api.',
    ],
  },
  {
    codigo: 'E',
    titulo: 'Fallo técnico del pago',
    descripcion:
      '1 ratón a 666,66 €: la pasarela simulada falla. Tras agotar los reintentos (≈30 s) la Saga ' +
      'no sabe si se cobró, así que cancela el pago y libera el stock.',
    estadoFinalEsperado: 'Fallido',
    recorrido: 'ProcesandoPago (reintentos) → CompensandoOperaciones → Fallido · pago Cancelado · reserva Liberada',
    lineas: [{ productoId: raton, cantidad: 1, precioUnitario: 666.66 }],
  },
];
