import { Signal } from '@angular/core';
import { EstadoPedidoDto } from '../modelos/pedidos';
import { TransicionSaga } from '../modelos/saga';

/**
 * Origen de la línea de tiempo de la Saga que muestra el monitor.
 *
 * Es una clase abstracta usada como token de inyección para poder cambiar de implementación sin tocar
 * los componentes:
 *
 * - **Fase 1:** {@link HistorialSagaObservado} reconstruye el historial a partir de los estados que el
 *   monitor va obteniendo por sondeo.
 * - **Fase 2:** una implementación `HistorialSagaServidor` leerá `GET /api/pedidos/{id}/historial`, que
 *   el backend alimentará en cada transición de la máquina de estados. Bastará con cambiar el proveedor
 *   en `app.config.ts`.
 */
export abstract class FuenteHistorialSaga {
  /** Indica si el historial es completo (servidor) o solo lo observado por la consola. */
  abstract readonly esCompleto: boolean;

  /** Línea de tiempo del pedido, ordenada de la transición más antigua a la más reciente. */
  abstract historial(pedidoId: string): Signal<readonly TransicionSaga[]>;

  /**
   * El monitor llama a este método con cada estado obtenido. La implementación observada lo usa para
   * detectar cambios; la del servidor, para saber cuándo volver a pedir el historial.
   */
  abstract notificarEstado(estado: EstadoPedidoDto): void;
}
