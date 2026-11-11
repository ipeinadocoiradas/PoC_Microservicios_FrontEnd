import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, catchError, finalize, of, switchMap, tap } from 'rxjs';
import { ClientePedidos } from '../../core/api/clientes-api';
import { ESCENARIOS } from '../../core/datos/escenarios';
import { RegistroPedidosRecientes } from '../../core/estado/registro-pedidos-recientes';
import { FuenteHistorialSaga } from '../../core/historial/fuente-historial-saga';
import { ErrorApi, traducirError } from '../../core/http/errores';
import { DisponibilidadProductoDto, PagoDto, ReservaDto } from '../../core/modelos/almacen-pagos';
import { EstadoPedidoDto, PedidoDto, esEstadoPedidoFinal } from '../../core/modelos/pedidos';
import { DESCRIPCION_ESTADO_SAGA, esEstadoSagaFinal } from '../../core/modelos/saga';
import { INTERVALO_SONDEO_MS, InstantaneaPedido, SeguimientoPedido } from '../../core/seguimiento/seguimiento-pedido';
import { DiagramaSaga } from '../../shared/diagrama-saga';
import { InsigniaEstado } from '../../shared/insignia-estado';
import { PanelError } from '../../shared/panel-error';
import { LineaTiempoSaga } from './linea-tiempo-saga';

type Servicio = 'pedidos' | 'almacen' | 'pagos';

/**
 * Monitor de un pedido: sigue en directo el estado de negocio del pedido, el estado interno de la Saga,
 * la reserva de Almacén, el pago y el stock afectado.
 *
 * Conserva el último valor correcto de cada servicio: si uno cae (escenario D), se sigue viendo su
 * último estado conocido junto a un aviso de "no disponible".
 */
@Component({
  selector: 'app-monitor-pedido',
  imports: [RouterLink, DatePipe, DecimalPipe, InsigniaEstado, PanelError, DiagramaSaga, LineaTiempoSaga],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './monitor-pedido.html',
})
export class MonitorPedido {
  /** Parámetro de ruta `:pedidoId`. */
  readonly pedidoId = input.required<string>();
  /** Parámetro de consulta `?escenario=` cuando el pedido se lanzó desde un escenario. */
  readonly escenario = input<string>();

  private readonly clientePedidos = inject(ClientePedidos);
  private readonly seguimiento = inject(SeguimientoPedido);
  private readonly recientes = inject(RegistroPedidosRecientes);
  protected readonly fuenteHistorial = inject(FuenteHistorialSaga);

  protected readonly intervaloSondeo = INTERVALO_SONDEO_MS;
  protected readonly descripcionSaga = DESCRIPCION_ESTADO_SAGA;

  private readonly ciclo = signal(0);
  private readonly activo = signal(true);

  protected readonly siguiendo = signal(false);
  protected readonly pedido = signal<PedidoDto | null>(null);
  protected readonly errorCarga = signal<ErrorApi | null>(null);
  protected readonly estado = signal<EstadoPedidoDto | null>(null);
  protected readonly reserva = signal<ReservaDto | null>(null);
  protected readonly pago = signal<PagoDto | null>(null);
  protected readonly stock = signal<readonly DisponibilidadProductoDto[]>([]);
  protected readonly ultimaActualizacion = signal<Date | null>(null);
  protected readonly erroresServicio = signal<Record<Servicio, ErrorApi | null>>({ pedidos: null, almacen: null, pagos: null });

  private readonly senalHistorial = computed(() => this.fuenteHistorial.historial(this.pedidoId()));
  protected readonly historial = computed(() => this.senalHistorial()());

  protected readonly pedidoReciente = computed(() => this.recientes.buscar(this.pedidoId()));
  protected readonly datosEscenario = computed(() => ESCENARIOS.find((e) => e.codigo === this.escenario()));

  protected readonly cantidadesPedido = computed(
    () => new Map((this.pedido()?.lineas ?? []).map((linea) => [linea.productoId, linea.cantidad])),
  );

  protected readonly sagaFinalizada =computed(() => esEstadoSagaFinal(this.estado()?.estadoSaga));
  protected readonly pedidoFinalizado = computed(() => esEstadoPedidoFinal(this.estado()?.estadoPedido));

  /** Compara el resultado con lo que el escenario esperaba, solo cuando el pedido ya ha terminado. */
  protected readonly resultadoEsperado = computed(() => {
    const esperado = this.pedidoReciente()?.estadoFinalEsperado ?? this.datosEscenario()?.estadoFinalEsperado;
    const actual = this.estado()?.estadoPedido;
    return esperado && actual && this.pedidoFinalizado() ? { esperado, coincide: esperado === actual } : null;
  });

  constructor() {
    const parametros = computed(() => ({ pedidoId: this.pedidoId(), ciclo: this.ciclo(), activo: this.activo() }));

    toObservable(parametros)
      .pipe(
        switchMap(({ pedidoId, activo }) => (activo ? this.iniciarSeguimiento(pedidoId) : EMPTY)),
        takeUntilDestroyed(),
      )
      .subscribe((instantanea) => this.aplicar(instantanea));
  }

  protected detener(): void {
    this.activo.set(false);
  }

  protected reanudar(): void {
    this.activo.set(true);
    this.ciclo.update((ciclo) => ciclo + 1);
  }

  private iniciarSeguimiento(pedidoId: string) {
    this.errorCarga.set(null);

    const pedido$ = this.pedido()?.pedidoId === pedidoId ? of(this.pedido()!) : this.clientePedidos.obtener(pedidoId);

    return pedido$.pipe(
      tap((pedido) => this.pedido.set(pedido)),
      catchError((error: unknown) => {
        this.errorCarga.set(traducirError(error));
        return EMPTY;
      }),
      switchMap((pedido) => {
        this.siguiendo.set(true);
        return this.seguimiento
          .seguir(pedidoId, pedido.lineas.map((linea) => linea.productoId))
          .pipe(finalize(() => this.siguiendo.set(false)));
      }),
    );
  }

  private aplicar({ estado, reserva, pago, stock, fecha }: InstantaneaPedido): void {
    if (estado.correcta) {
      this.estado.set(estado.valor);
      this.fuenteHistorial.notificarEstado(estado.valor);
      this.recientes.actualizarEstado(estado.valor.pedidoId, estado.valor.estadoPedido, estado.valor.estadoSaga);
    }

    if (reserva.correcta) this.reserva.set(reserva.valor);
    if (pago.correcta) this.pago.set(pago.valor);
    if (stock.correcta) this.stock.set(stock.valor);

    this.erroresServicio.set({
      pedidos: estado.correcta ? null : estado.error,
      // La reserva y el stock salen de Almacén: basta con que falle una de las dos consultas.
      almacen: !reserva.correcta ? reserva.error : !stock.correcta ? stock.error : null,
      pagos: pago.correcta ? null : pago.error,
    });

    this.ultimaActualizacion.set(fecha);
  }
}
