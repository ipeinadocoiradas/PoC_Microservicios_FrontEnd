import { Injectable, computed, signal } from '@angular/core';
import { EstadoPedido } from '../modelos/pedidos';
import { EstadoSaga } from '../modelos/saga';
import { eliminarClave, escribirJson, leerJson } from './almacenamiento-local';

const CLAVE = 'consola-saga:pedidos-recientes';
const MAXIMO_PEDIDOS = 50;

/** Pedido lanzado desde la consola, con el último estado conocido. */
export interface PedidoReciente {
  readonly pedidoId: string;
  readonly etiqueta: string;
  readonly total: number;
  readonly moneda: string;
  readonly idCorrelacion: string;
  readonly fechaCreacion: string;
  readonly estadoFinalEsperado: EstadoPedido | null;
  readonly estadoPedido: EstadoPedido;
  readonly estadoSaga: EstadoSaga | null;
}

/**
 * Pedidos lanzados desde esta consola. Mientras el backend no ofrezca `GET /api/pedidos` (fase 2),
 * la lista se mantiene en el navegador.
 */
@Injectable({ providedIn: 'root' })
export class RegistroPedidosRecientes {
  private readonly pedidosInternos = signal<readonly PedidoReciente[]>(leerJson(CLAVE, []));

  readonly pedidos = this.pedidosInternos.asReadonly();
  readonly hayPedidos = computed(() => this.pedidosInternos().length > 0);

  registrar(pedido: Omit<PedidoReciente, 'fechaCreacion' | 'estadoSaga'>): void {
    const nuevo: PedidoReciente = { ...pedido, fechaCreacion: new Date().toISOString(), estadoSaga: null };
    this.guardar([nuevo, ...this.pedidosInternos()].slice(0, MAXIMO_PEDIDOS));
  }

  actualizarEstado(pedidoId: string, estadoPedido: EstadoPedido, estadoSaga: EstadoSaga | null): void {
    const pedidos = this.pedidosInternos();
    const actual = pedidos.find((pedido) => pedido.pedidoId === pedidoId);

    if (!actual || (actual.estadoPedido === estadoPedido && actual.estadoSaga === estadoSaga)) {
      return;
    }

    this.guardar(pedidos.map((pedido) => (pedido === actual ? { ...pedido, estadoPedido, estadoSaga } : pedido)));
  }

  buscar(pedidoId: string): PedidoReciente | undefined {
    return this.pedidosInternos().find((pedido) => pedido.pedidoId === pedidoId);
  }

  vaciar(): void {
    this.pedidosInternos.set([]);
    eliminarClave(CLAVE);
  }

  private guardar(pedidos: readonly PedidoReciente[]): void {
    this.pedidosInternos.set(pedidos);
    escribirJson(CLAVE, pedidos);
  }
}
