import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type Tono = 'en-curso' | 'exito' | 'compensacion' | 'cancelado' | 'fallo' | 'neutro';

/**
 * Significado visual común a los estados de los tres servicios:
 * azul = en curso, verde = éxito, violeta = compensación, ámbar = cancelado/rechazado, rojo = fallo técnico.
 */
const TONO_POR_ESTADO: Record<string, Tono> = {
  // Saga
  PedidoPendiente: 'en-curso',
  ReservandoStock: 'en-curso',
  ProcesandoPago: 'en-curso',
  CompensandoOperaciones: 'compensacion',
  Completado: 'exito',
  Cancelado: 'cancelado',
  Fallido: 'fallo',
  // Pedido
  Pendiente: 'en-curso',
  // Reserva
  Reservada: 'en-curso',
  Confirmada: 'exito',
  Liberada: 'compensacion',
  Rechazada: 'cancelado',
  // Pago
  Rechazado: 'cancelado',
  Reembolsado: 'compensacion',
};

const CLASES_TONO: Record<Tono, string> = {
  'en-curso': 'bg-sky-50 text-sky-700 ring-sky-200',
  exito: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  compensacion: 'bg-violet-50 text-violet-700 ring-violet-200',
  cancelado: 'bg-amber-50 text-amber-800 ring-amber-200',
  fallo: 'bg-rose-50 text-rose-700 ring-rose-200',
  neutro: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const CLASES_PUNTO: Record<Tono, string> = {
  'en-curso': 'bg-sky-500 animate-pulse',
  exito: 'bg-emerald-500',
  compensacion: 'bg-violet-500 animate-pulse',
  cancelado: 'bg-amber-500',
  fallo: 'bg-rose-500',
  neutro: 'bg-slate-400',
};

/** Insignia con el nombre de un estado y su color semántico. */
@Component({
  selector: 'app-insignia-estado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset"
      [class]="clases()"
    >
      <span class="size-1.5 rounded-full" [class]="clasesPunto()"></span>
      {{ estado() ?? textoSinValor() }}
    </span>
  `,
})
export class InsigniaEstado {
  readonly estado = input<string | null | undefined>();
  readonly textoSinValor = input('—');

  private readonly tono = computed<Tono>(() => {
    const estado = this.estado();
    return estado ? (TONO_POR_ESTADO[estado] ?? 'neutro') : 'neutro';
  });

  protected readonly clases = computed(() => CLASES_TONO[this.tono()]);
  protected readonly clasesPunto = computed(() => CLASES_PUNTO[this.tono()]);
}
