import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TransicionSaga } from '../../core/modelos/saga';
import { InsigniaEstado } from '../../shared/insignia-estado';

/**
 * Línea de tiempo de las transiciones de la Saga. Está preparada para el historial del servidor (fase 2):
 * si la transición trae `evento`, lo muestra; si el historial es solo observado, lo advierte.
 */
@Component({
  selector: 'app-linea-tiempo-saga',
  imports: [DatePipe, InsigniaEstado],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (transiciones().length === 0) {
      <p class="text-sm text-slate-500">Esperando el primer estado de la Saga…</p>
    } @else {
      <ol class="relative space-y-4 border-l border-slate-200 pl-5">
        @for (item of transiciones(); track $index) {
          <li class="relative">
            <span
              class="absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-white"
              [class]="$last ? 'bg-indigo-600' : 'bg-slate-300'"
            ></span>
            <div class="flex flex-wrap items-center gap-2">
              <app-insignia-estado [estado]="item.transicion.estadoNuevo" />
              <span class="font-mono text-xs text-slate-500">{{ item.transicion.fechaUtc | date: 'HH:mm:ss.SSS' }}</span>
              @if (item.milisegundosDesdeAnterior !== null) {
                <span class="font-mono text-xs text-slate-400">+{{ item.milisegundosDesdeAnterior }} ms</span>
              }
            </div>
            <p class="mt-1 text-xs text-slate-500">
              @if (item.transicion.estadoAnterior) {
                desde <span class="font-medium text-slate-600">{{ item.transicion.estadoAnterior }}</span>
              }  @else {
                {{ item.transicion.origen === 'servidor' ? 'inicio de la Saga' : 'primer estado observado' }}
              }
              @if (item.transicion.evento) {
                · por <span class="codigo">{{ item.transicion.evento }}</span>
              }
            </p>
          </li>
        }
      </ol>
    }

    @if (!esCompleto()) {
      <p class="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        Historial <strong>observado por sondeo</strong>: las transiciones que ocurren entre dos consultas pueden no
        aparecer. En la fase 2 lo proporcionará el backend con el evento que provocó cada cambio.
      </p>
    }
  `,
})
export class LineaTiempoSaga {
  readonly historial = input.required<readonly TransicionSaga[]>();
  readonly esCompleto = input(false);

  protected readonly transiciones = computed(() =>
    this.historial().map((transicion, indice, todas) => ({
      transicion,
      milisegundosDesdeAnterior:
        indice === 0 ? null : Math.max(0, Date.parse(transicion.fechaUtc) - Date.parse(todas[indice - 1].fechaUtc)),
    })),
  );
}
