import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DESCRIPCION_ESTADO_SAGA, EstadoSaga, TransicionSaga } from '../core/modelos/saga';

interface Nodo {
  readonly estado: EstadoSaga;
  readonly x: number;
  readonly y: number;
  readonly lineas: readonly string[];
}

interface Arista {
  readonly origen: EstadoSaga;
  readonly destino: EstadoSaga;
  readonly desde: readonly [number, number];
  readonly hasta: readonly [number, number];
  readonly etiqueta: readonly string[];
  readonly etiquetaEn: readonly [number, number];
  readonly anclaje: 'middle' | 'start';
}

const ANCHO = 150;
const ALTO = 56;

const NODOS: readonly Nodo[] = [
  { estado: 'PedidoPendiente', x: 0, y: 40, lineas: ['PedidoPendiente'] },
  { estado: 'ReservandoStock', x: 270, y: 40, lineas: ['ReservandoStock'] },
  { estado: 'ProcesandoPago', x: 540, y: 40, lineas: ['ProcesandoPago'] },
  { estado: 'Completado', x: 810, y: 40, lineas: ['Completado'] },
  { estado: 'Cancelado', x: 270, y: 240, lineas: ['Cancelado'] },
  { estado: 'CompensandoOperaciones', x: 540, y: 240, lineas: ['Compensando', 'Operaciones'] },
  { estado: 'Fallido', x: 810, y: 240, lineas: ['Fallido'] },
];

const ARISTAS: readonly Arista[] = [
  { origen: 'PedidoPendiente', destino: 'ReservandoStock', desde: [150, 68], hasta: [270, 68], etiqueta: ['SolicitarReserva', 'Stock'], etiquetaEn: [210, 46], anclaje: 'middle' },
  { origen: 'ReservandoStock', destino: 'ProcesandoPago', desde: [420, 68], hasta: [540, 68], etiqueta: ['StockReservado'], etiquetaEn: [480, 58], anclaje: 'middle' },
  { origen: 'ProcesandoPago', destino: 'Completado', desde: [690, 68], hasta: [810, 68], etiqueta: ['PagoCompletado'], etiquetaEn: [750, 58], anclaje: 'middle' },
  { origen: 'ReservandoStock', destino: 'Cancelado', desde: [345, 96], hasta: [345, 240], etiqueta: ['StockNoDisponible'], etiquetaEn: [353, 172], anclaje: 'start' },
  { origen: 'ProcesandoPago', destino: 'CompensandoOperaciones', desde: [615, 96], hasta: [615, 240], etiqueta: ['PagoRechazado', 'o Fault<ProcesarPago>'], etiquetaEn: [623, 164], anclaje: 'start' },
  { origen: 'CompensandoOperaciones', destino: 'Cancelado', desde: [540, 268], hasta: [420, 268], etiqueta: ['compensación', 'confirmada'], etiquetaEn: [480, 290], anclaje: 'middle' },
  { origen: 'CompensandoOperaciones', destino: 'Fallido', desde: [690, 268], hasta: [810, 268], etiqueta: ['tras fallo', 'técnico'], etiquetaEn: [750, 290], anclaje: 'middle' },
];

/**
 * Diagrama de la máquina de estados de la Saga. Resalta el estado actual, los estados por los que el
 * historial indica que ha pasado y las transiciones recorridas.
 */
@Component({
  selector: 'app-diagrama-saga',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="-4 0 968 320" class="h-auto w-full" role="img" aria-label="Máquina de estados de la Saga">
      <defs>
        <marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" class="fill-slate-300" />
        </marker>
        <marker id="flecha-recorrida" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" class="fill-indigo-500" />
        </marker>
      </defs>

      @for (arista of aristas; track $index) {
        @let recorrida = aristaRecorrida(arista);
        <line
          [attr.x1]="arista.desde[0]" [attr.y1]="arista.desde[1]"
          [attr.x2]="arista.hasta[0]" [attr.y2]="arista.hasta[1]"
          [attr.marker-end]="recorrida ? 'url(#flecha-recorrida)' : 'url(#flecha)'"
          [class]="recorrida ? 'stroke-indigo-500' : 'stroke-slate-300'"
          stroke-width="2"
        />
        <text
          [attr.x]="arista.etiquetaEn[0]" [attr.y]="arista.etiquetaEn[1]" [attr.text-anchor]="arista.anclaje"
          class="font-mono text-[10px]" [class]="recorrida ? 'fill-indigo-600' : 'fill-slate-400'"
        >
          @for (linea of arista.etiqueta; track $index) {
            <tspan [attr.x]="arista.etiquetaEn[0]" [attr.dy]="$first ? 0 : 12">{{ linea }}</tspan>
          }
        </text>
      }

      @for (nodo of nodos; track nodo.estado) {
        @let esActual = nodo.estado === estadoActual();
        @let visitado = estadosVisitados().has(nodo.estado);
        <g>
          <title>{{ descripcion[nodo.estado] }}</title>
          <rect
            [attr.x]="nodo.x" [attr.y]="nodo.y" [attr.width]="ancho" [attr.height]="alto" rx="10"
            stroke-width="2"
            [class]="esActual ? 'fill-indigo-600 stroke-indigo-600' : visitado ? 'fill-indigo-50 stroke-indigo-300' : 'fill-white stroke-slate-200'"
          />
          @if (esActual && !esFinal()) {
            <rect
              [attr.x]="nodo.x - 4" [attr.y]="nodo.y - 4" [attr.width]="ancho + 8" [attr.height]="alto + 8" rx="13"
              class="animate-pulse fill-none stroke-indigo-300" stroke-width="2"
            />
          }
          <text
            [attr.x]="nodo.x + ancho / 2" [attr.y]="nodo.y + alto / 2 - (nodo.lineas.length - 1) * 7 + 4"
            text-anchor="middle" class="text-[12px] font-semibold"
            [class]="esActual ? 'fill-white' : visitado ? 'fill-indigo-800' : 'fill-slate-500'"
          >
            @for (linea of nodo.lineas; track $index) {
              <tspan [attr.x]="nodo.x + ancho / 2" [attr.dy]="$first ? 0 : 14">{{ linea }}</tspan>
            }
          </text>
        </g>
      }
    </svg>
  `,
})
export class DiagramaSaga {
  readonly estadoActual = input<EstadoSaga | null>(null);
  readonly historial = input<readonly TransicionSaga[]>([]);
  readonly esFinal = input(false);

  protected readonly nodos = NODOS;
  protected readonly aristas = ARISTAS;
  protected readonly ancho = ANCHO;
  protected readonly alto = ALTO;
  protected readonly descripcion = DESCRIPCION_ESTADO_SAGA;

  /**
   * PedidoPendiente es transitorio: la Saga lo abandona en la misma transacción en que se crea, así que nunca
   * se observa. Como toda Saga pasa por él, se marca como visitado en cuanto existe cualquier transición.
   */
  private readonly hayHistorial = computed(() => this.historial().length > 0);

  protected readonly estadosVisitados = computed(() => {
    const visitados = new Set<EstadoSaga>(
      this.historial().flatMap((t) => (t.estadoAnterior ? [t.estadoAnterior, t.estadoNuevo] : [t.estadoNuevo])),
    );
    if (this.hayHistorial()) visitados.add('PedidoPendiente');
    return visitados;
  });

  private readonly transicionesRecorridas = computed(() => {
    const recorridas = new Set(this.historial().map((t) => `${t.estadoAnterior}>${t.estadoNuevo}`));
    if (this.hayHistorial()) recorridas.add('PedidoPendiente>ReservandoStock');
    return recorridas;
  });

  protected aristaRecorrida(arista: Arista): boolean {
    return this.transicionesRecorridas().has(`${arista.origen}>${arista.destino}`);
  }
}
