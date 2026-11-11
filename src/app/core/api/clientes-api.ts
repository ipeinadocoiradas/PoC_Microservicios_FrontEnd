import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { CABECERA_CORRELACION } from '../http/interceptor-correlacion';
import { esNoEncontrado } from '../http/errores';
import { DisponibilidadProductoDto, PagoDto, ReservaDto } from '../modelos/almacen-pagos';
import { CrearPedidoPeticion, EstadoPedidoDto, PedidoCreadoDto, PedidoDto, TransicionSagaDto } from '../modelos/pedidos';

// Clientes tipados de las tres APIs. Las URLs son relativas: el proxy de desarrollo (proxy.conf.mjs)
// reenvía cada prefijo al microservicio propietario.

/** Resultado de crear un pedido: la respuesta y el identificador de correlación de la petición. */
export interface PedidoCreado {
  readonly pedido: PedidoCreadoDto;
  readonly idCorrelacion: string;
}

@Injectable({ providedIn: 'root' })
export class ClientePedidos {
  private readonly http = inject(HttpClient);

  crear(peticion: CrearPedidoPeticion): Observable<PedidoCreado> {
    const idCorrelacion = `consola-${crypto.randomUUID()}`;

    return this.http
      .post<PedidoCreadoDto>('/api/pedidos', peticion, {
        headers: new HttpHeaders({ [CABECERA_CORRELACION]: idCorrelacion }),
        observe: 'response',
      })
      .pipe(map((respuesta) => ({ pedido: respuesta.body!, idCorrelacion })));
  }

  obtener(pedidoId: string): Observable<PedidoDto> {
    return this.http.get<PedidoDto>(`/api/pedidos/${pedidoId}`);
  }

  obtenerEstado(pedidoId: string): Observable<EstadoPedidoDto> {
    return this.http.get<EstadoPedidoDto>(`/api/pedidos/${pedidoId}/estado`);
  }
  
    obtenerHistorial(pedidoId: string): Observable<TransicionSagaDto[]> {
    return this.http.get<TransicionSagaDto[]>(`/api/pedidos/${pedidoId}/historial`);
  }
}

@Injectable({ providedIn: 'root' })
export class ClienteAlmacen {
  private readonly http = inject(HttpClient);

  obtenerDisponibilidad(productoId: string): Observable<DisponibilidadProductoDto> {
    return this.http.get<DisponibilidadProductoDto>(`/api/productos/${productoId}/disponibilidad`);
  }

  /** Reserva del pedido, o `null` si Almacén aún no la ha registrado (404). */
  obtenerReservaDePedido(pedidoId: string): Observable<ReservaDto | null> {
    return this.http
      .get<ReservaDto>('/api/reservas', { params: { pedidoId } })
      .pipe(catchError(nuloSiNoExiste));
  }
}

@Injectable({ providedIn: 'root' })
export class ClientePagos {
  private readonly http = inject(HttpClient);

  /** Pago del pedido, o `null` si no existe (404): p. ej. un pedido cancelado por falta de stock. */
  obtenerPagoDePedido(pedidoId: string): Observable<PagoDto | null> {
    return this.http
      .get<PagoDto>('/api/pagos', { params: { pedidoId } })
      .pipe(catchError(nuloSiNoExiste));
  }
}

const nuloSiNoExiste = (error: unknown): Observable<null> =>
  esNoEncontrado(error) ? of(null) : throwError(() => error);
