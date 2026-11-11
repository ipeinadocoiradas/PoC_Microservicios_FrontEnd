import { Injectable, Signal, WritableSignal, signal } from '@angular/core';
import { escribirJson, leerJson } from '../estado/almacenamiento-local';
import { EstadoPedidoDto } from '../modelos/pedidos';
import { TransicionSaga } from '../modelos/saga';
import { FuenteHistorialSaga } from './fuente-historial-saga';

const PREFIJO_CLAVE = 'consola-saga:historial:';

/**
 * Historial de la fase 1: registra una transición cada vez que el estado de la Saga devuelto por
 * `/estado` cambia respecto al anterior. Se guarda en `localStorage` para que sobreviva a una recarga.
 *
 * Limitación conocida: las transiciones que ocurren entre dos consultas no se ven. En el escenario A,
 * por ejemplo, ProcesandoPago dura milisegundos y puede no aparecer. El historial del servidor (fase 2)
 * resolverá esta limitación.
 */
@Injectable()
export class HistorialSagaObservado extends FuenteHistorialSaga {
  readonly esCompleto = false;

  private readonly historiales = new Map<string, WritableSignal<readonly TransicionSaga[]>>();

  historial(pedidoId: string): Signal<readonly TransicionSaga[]> {
    return this.obtenerSenal(pedidoId).asReadonly();
  }

  notificarEstado(estado: EstadoPedidoDto): void {
    if (!estado.estadoSaga) {
      return;
    }

    const senal = this.obtenerSenal(estado.pedidoId);
    const ultima = senal().at(-1);

    if (ultima?.estadoNuevo === estado.estadoSaga) {
      return;
    }

    const transicion: TransicionSaga = {
      estadoAnterior: ultima?.estadoNuevo ?? null,
      estadoNuevo: estado.estadoSaga,
      fechaUtc: estado.fechaActualizacionSagaUtc ?? new Date().toISOString(),
      origen: 'observado',
    };

    senal.update((transiciones) => [...transiciones, transicion]);
    escribirJson(PREFIJO_CLAVE + estado.pedidoId, senal());
  }

  private obtenerSenal(pedidoId: string): WritableSignal<readonly TransicionSaga[]> {
    let senal = this.historiales.get(pedidoId);

    if (!senal) {
      senal = signal(leerJson<TransicionSaga[]>(PREFIJO_CLAVE + pedidoId, []));
      this.historiales.set(pedidoId, senal);
    }

    return senal;
  }
}
