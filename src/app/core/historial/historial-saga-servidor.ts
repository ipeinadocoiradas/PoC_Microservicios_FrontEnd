import { Injectable, Signal, WritableSignal, inject, signal } from '@angular/core';
import { ClientePedidos } from '../api/clientes-api';
import { EstadoPedidoDto } from '../modelos/pedidos';
import { TransicionSaga } from '../modelos/saga';
import { FuenteHistorialSaga } from './fuente-historial-saga';

/**
 * Historial de la fase 2: lo proporciona el backend (`GET /api/pedidos/{id}/historial`), que registra cada
 * transición de la máquina de estados en la misma transacción que el estado de la Saga. Es completo:
 * incluye las transiciones de milisegundos y el evento que provocó cada una.
 *
 * Solo vuelve a pedir el historial cuando cambia el estado o la fecha de actualización de la Saga.
 */
@Injectable()
export class HistorialSagaServidor extends FuenteHistorialSaga {
  readonly esCompleto = true;

  private readonly clientePedidos = inject(ClientePedidos);
  private readonly historiales = new Map<string, WritableSignal<readonly TransicionSaga[]>>();
  private readonly versionesConsultadas = new Map<string, string>();

  historial(pedidoId: string): Signal<readonly TransicionSaga[]> {
    return this.obtenerSenal(pedidoId).asReadonly();
  }

  notificarEstado(estado: EstadoPedidoDto): void {
    const version = `${estado.estadoSaga}|${estado.fechaActualizacionSagaUtc}`;

    if (!estado.estadoSaga || this.versionesConsultadas.get(estado.pedidoId) === version) {
      return;
    }

    this.versionesConsultadas.set(estado.pedidoId, version);

    this.clientePedidos.obtenerHistorial(estado.pedidoId).subscribe({
      next: (transiciones) =>
        this.obtenerSenal(estado.pedidoId).set(
          transiciones.map((transicion) => ({
            estadoAnterior: transicion.estadoAnterior,
            estadoNuevo: transicion.estadoNuevo,
            fechaUtc: transicion.fechaUtc,
            evento: transicion.evento,
            origen: 'servidor',
          })),
        ),
      // Si falla, se olvida la versión para reintentarlo en la siguiente consulta del monitor.
      error: () => this.versionesConsultadas.delete(estado.pedidoId),
    });
  }

  private obtenerSenal(pedidoId: string): WritableSignal<readonly TransicionSaga[]> {
    let senal = this.historiales.get(pedidoId);

    if (!senal) {
      senal = signal<readonly TransicionSaga[]>([]);
      this.historiales.set(pedidoId, senal);
    }

    return senal;
  }
}