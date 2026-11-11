import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { nombreProducto } from '../../core/datos/catalogo';
import { ESCENARIOS, Escenario } from '../../core/datos/escenarios';
import { ErrorApi, traducirError } from '../../core/http/errores';
import { LanzadorPedidos } from '../../core/seguimiento/lanzador-pedidos';
import { InsigniaEstado } from '../../shared/insignia-estado';
import { PanelError } from '../../shared/panel-error';

/** Lanzador de los escenarios de demostración A–E. */
@Component({
  selector: 'app-escenarios',
  imports: [DecimalPipe, InsigniaEstado, PanelError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mb-8">
      <h1 class="text-2xl font-bold text-slate-900">Escenarios de la Saga</h1>
      <p class="mt-2 max-w-3xl text-sm text-slate-600">
        Cada escenario envía un pedido preparado a <span class="codigo">POST /api/pedidos</span> y abre el monitor,
        donde se ve cómo avanzan por separado el <strong>estado del pedido</strong> (lo que ve el cliente) y el
        <strong>estado de la Saga</strong> (lo que hace el orquestador).
      </p>
    </section>

    <div class="grid gap-5 lg:grid-cols-2">
      @for (escenario of escenarios; track escenario.codigo) {
        <article class="tarjeta flex flex-col p-5">
          <header class="flex items-start gap-4">
            <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-900 font-mono text-lg font-bold text-white">
              {{ escenario.codigo }}
            </span>
            <div class="min-w-0 flex-1">
              <h2 class="font-semibold text-slate-900">{{ escenario.titulo }}</h2>
              <p class="mt-1 text-sm text-slate-600">{{ escenario.descripcion }}</p>
            </div>
          </header>

          <dl class="mt-4 grid gap-3 text-sm">
            <div>
              <dt class="etiqueta">Pedido</dt>
              <dd>
                @for (linea of escenario.lineas; track linea.productoId) {
                  {{ linea.cantidad }} × {{ nombre(linea.productoId) }} a {{ linea.precioUnitario | number: '1.2-2' }} €
                }
              </dd>
            </div>
            <div>
              <dt class="etiqueta">Recorrido esperado</dt>
              <dd class="font-mono text-xs text-slate-700">{{ escenario.recorrido }}</dd>
            </div>
            <div class="flex items-center gap-2">
              <dt class="etiqueta mb-0">Estado final del pedido</dt>
              <dd><app-insignia-estado [estado]="escenario.estadoFinalEsperado" /></dd>
            </div>
          </dl>

          @if (escenario.preparacion) {
            <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p class="font-semibold">Antes de lanzarlo</p>
              <ol class="mt-1 list-inside list-decimal space-y-1">
                @for (paso of escenario.preparacion; track $index) { <li>{{ paso }}</li> }
              </ol>
            </div>
          }

          @if (errores()[escenario.codigo]; as error) {
            <div class="mt-4"><app-panel-error [error]="error" /></div>
          }

          <div class="mt-auto pt-5">
            <button
              type="button"
              class="boton-primario w-full sm:w-auto"
              [disabled]="lanzando() === escenario.codigo"
              (click)="lanzar(escenario)"
            >
              {{ lanzando() === escenario.codigo ? 'Enviando…' : 'Lanzar escenario ' + escenario.codigo }}
            </button>
          </div>
        </article>
      }
    </div>
  `,
})
export class Escenarios {
  private readonly lanzador = inject(LanzadorPedidos);
  private readonly router = inject(Router);

  protected readonly escenarios = ESCENARIOS;
  protected readonly lanzando = signal<Escenario['codigo'] | null>(null);
  protected readonly errores = signal<Partial<Record<Escenario['codigo'], ErrorApi>>>({});

  protected nombre(productoId: string): string {
    return nombreProducto(productoId);
  }

  protected lanzar(escenario: Escenario): void {
    this.lanzando.set(escenario.codigo);
    this.errores.update(({ [escenario.codigo]: _, ...resto }) => resto);

    this.lanzador
      .lanzar({
        lineas: escenario.lineas,
        etiqueta: `Escenario ${escenario.codigo} · ${escenario.titulo}`,
        estadoFinalEsperado: escenario.estadoFinalEsperado,
      })
      .subscribe({
        next: ({ pedido }) =>
          this.router.navigate(['/pedidos', pedido.pedidoId], { queryParams: { escenario: escenario.codigo } }),
        error: (error: unknown) => {
          this.errores.update((actuales) => ({ ...actuales, [escenario.codigo]: traducirError(error) }));
          this.lanzando.set(null);
        },
      });
  }
}
