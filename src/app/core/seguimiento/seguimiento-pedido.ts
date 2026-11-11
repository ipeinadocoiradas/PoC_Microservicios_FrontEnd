import { Injectable, inject } from '@angular/core';
import { Observable, catchError, exhaustMap, forkJoin, map, of, takeWhile, timer } from 'rxjs';
import { ClienteAlmacen, ClientePagos, ClientePedidos } from '../api/clientes-api';
import { ErrorApi, traducirError } from '../http/errores';
import { DisponibilidadProductoDto, PagoDto, ReservaDto } from '../modelos/almacen-pagos';
import { EstadoPedidoDto } from '../modelos/pedidos';
import { esEstadoSagaFinal } from '../modelos/saga';

export const INTERVALO_SONDEO_MS = 750;

/**
 * Resultado de una consulta individual. Cada servicio se consulta por separado para que la caída de uno
 * (p. ej. Almacén en el escenario D) no impida ver el estado de los demás.
 */
export type Consulta<T> = { readonly correcta: true; readonly valor: T } | { readonly correcta: false; readonly error: ErrorApi };

/** Lo que la consola sabe de un pedido en un instante: una "foto" de los tres servicios. */
export interface InstantaneaPedido {
  readonly estado: Consulta<EstadoPedidoDto>;
  readonly reserva: Consulta<ReservaDto | null>;
  readonly pago: Consulta<PagoDto | null>;
  readonly stock: Consulta<readonly DisponibilidadProductoDto[]>;
  readonly fecha: Date;
}

/**
 * Sondea los tres microservicios hasta que el proceso distribuido termina.
 *
 * El seguimiento se detiene cuando la Saga llega a un estado final y, si es `Completado`, cuando además
 * Almacén ha consolidado la reserva (`ConfirmarReservaStock` es el último paso del flujo satisfactorio).
 * Se usa `exhaustMap` para no lanzar una consulta nueva mientras la anterior sigue en curso.
 */
@Injectable({ providedIn: 'root' })
export class SeguimientoPedido {
  private readonly pedidos = inject(ClientePedidos);
  private readonly almacen = inject(ClienteAlmacen);
  private readonly pagos = inject(ClientePagos);

  seguir(pedidoId: string, productoIds: readonly string[]): Observable<InstantaneaPedido> {
    return timer(0, INTERVALO_SONDEO_MS).pipe(
      exhaustMap(() => this.tomarInstantanea(pedidoId, productoIds)),
      takeWhile((instantanea) => !SeguimientoPedido.procesoTerminado(instantanea), true),
    );
  }

  tomarInstantanea(pedidoId: string, productoIds: readonly string[]): Observable<InstantaneaPedido> {
    const stock$ =
      productoIds.length === 0
        ? of<readonly DisponibilidadProductoDto[]>([])
        : forkJoin(productoIds.map((id) => this.almacen.obtenerDisponibilidad(id)));

    return forkJoin({
      estado: consultar(this.pedidos.obtenerEstado(pedidoId)),
      reserva: consultar(this.almacen.obtenerReservaDePedido(pedidoId)),
      pago: consultar(this.pagos.obtenerPagoDePedido(pedidoId)),
      stock: consultar(stock$),
    }).pipe(map((resultado) => ({ ...resultado, fecha: new Date() })));
  }

  static procesoTerminado({ estado, reserva }: InstantaneaPedido): boolean {
    if (!estado.correcta || !esEstadoSagaFinal(estado.valor.estadoSaga)) {
      return false;
    }

    return estado.valor.estadoSaga !== 'Completado' || (reserva.correcta && reserva.valor?.estado === 'Confirmada');
  }
}

const consultar = <T>(origen: Observable<T>): Observable<Consulta<T>> =>
  origen.pipe(
    map((valor): Consulta<T> => ({ correcta: true, valor })),
    catchError((error: unknown) => of<Consulta<T>>({ correcta: false, error: traducirError(error) })),
  );
