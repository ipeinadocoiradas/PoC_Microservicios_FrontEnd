import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ClientePedidos, PedidoCreado } from '../api/clientes-api';
import { RegistroPedidosRecientes } from '../estado/registro-pedidos-recientes';
import { EstadoPedido, LineaPedidoPeticion } from '../modelos/pedidos';

export interface SolicitudLanzamiento {
  readonly lineas: readonly LineaPedidoPeticion[];
  /** Texto con el que el pedido aparecerá en "Pedidos recientes". */
  readonly etiqueta: string;
  readonly estadoFinalEsperado?: EstadoPedido | null;
  readonly moneda?: string;
  readonly clienteId?: string;
}

/** Crea pedidos desde la consola y los anota en la lista de pedidos recientes. */
@Injectable({ providedIn: 'root' })
export class LanzadorPedidos {
  private readonly pedidos = inject(ClientePedidos);
  private readonly recientes = inject(RegistroPedidosRecientes);

  lanzar(solicitud: SolicitudLanzamiento): Observable<PedidoCreado> {
    const peticion = {
      clienteId: solicitud.clienteId ?? crypto.randomUUID(),
      moneda: solicitud.moneda ?? 'EUR',
      lineas: [...solicitud.lineas],
    };

    return this.pedidos.crear(peticion).pipe(
      tap(({ pedido, idCorrelacion }) =>
        this.recientes.registrar({
          pedidoId: pedido.pedidoId,
          etiqueta: solicitud.etiqueta,
          total: pedido.total,
          moneda: pedido.moneda,
          idCorrelacion,
          estadoFinalEsperado: solicitud.estadoFinalEsperado ?? null,
          estadoPedido: pedido.estado,
        }),
      ),
    );
  }
}
