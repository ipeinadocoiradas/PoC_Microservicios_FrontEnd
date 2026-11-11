import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, exhaustMap, forkJoin, switchMap, timer } from 'rxjs';
import { ClienteAlmacen } from '../../core/api/clientes-api';
import { CATALOGO_DEMOSTRACION, ProductoCatalogo } from '../../core/datos/catalogo';
import { ErrorApi, traducirError } from '../../core/http/errores';
import { DisponibilidadProductoDto } from '../../core/modelos/almacen-pagos';
import { PanelError } from '../../shared/panel-error';

const INTERVALO_REFRESCO_MS = 2000;

interface FilaInventario {
  readonly producto: ProductoCatalogo;
  readonly disponibilidad: DisponibilidadProductoDto;
}

/** Stock del catálogo de demostración, refrescado periódicamente. */
@Component({
  selector: 'app-inventario',
  imports: [DatePipe, PanelError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Inventario</h1>
        <p class="mt-2 max-w-3xl text-sm text-slate-600">
          Stock de Almacén. Una reserva aumenta el <strong>reservado</strong> sin tocar el físico; confirmarla resta
          del físico, y liberarla (compensación) devuelve las unidades al disponible.
        </p>
      </div>
      <label class="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" class="size-4 accent-indigo-600" [checked]="autorrefresco()" (change)="autorrefresco.set(!autorrefresco())" />
        Actualizar cada {{ intervalo / 1000 }} s
        @if (ultimaActualizacion(); as fecha) { <span class="text-xs text-slate-400">· {{ fecha | date: 'HH:mm:ss' }}</span> }
      </label>
    </section>

    @if (error(); as detalleError) {
      <div class="mb-6"><app-panel-error [error]="detalleError" /></div>
    }

    <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      @for (fila of filas(); track fila.producto.id) {
        @let datos = fila.disponibilidad;
        <article class="tarjeta p-5">
          <h2 class="font-semibold text-slate-900">{{ datos.nombre }}</h2>
          <p class="text-xs text-slate-500">{{ fila.producto.papel }}</p>

          <div class="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100" [attr.aria-label]="'Reservado ' + datos.stockReservado + ' de ' + datos.stockFisico">
            <div class="bg-sky-500 transition-all" [style.width.%]="porcentaje(datos.stockReservado, datos.stockFisico)"></div>
            <div class="bg-emerald-400 transition-all" [style.width.%]="porcentaje(datos.stockDisponible, datos.stockFisico)"></div>
          </div>

          <dl class="mt-4 grid grid-cols-3 gap-2 text-center">
            <div><dt class="etiqueta">Físico</dt><dd class="font-mono text-lg font-semibold">{{ datos.stockFisico }}</dd></div>
            <div><dt class="etiqueta text-sky-600">Reservado</dt><dd class="font-mono text-lg font-semibold text-sky-700">{{ datos.stockReservado }}</dd></div>
            <div><dt class="etiqueta text-emerald-600">Disponible</dt><dd class="font-mono text-lg font-semibold text-emerald-700">{{ datos.stockDisponible }}</dd></div>
          </dl>

          <p class="mt-4 text-xs text-slate-400">
            Inicial {{ fila.producto.stockInicial }} · vendidas {{ fila.producto.stockInicial - datos.stockFisico }}
          </p>
        </article>
      } @empty {
        @if (!error()) {
          <p class="text-sm text-slate-500">Cargando inventario…</p>
        }
      }
    </div>
  `,
})
export class Inventario {
  private readonly almacen = inject(ClienteAlmacen);

  protected readonly intervalo = INTERVALO_REFRESCO_MS;
  protected readonly autorrefresco = signal(true);
  protected readonly filas = signal<readonly FilaInventario[]>([]);
  protected readonly error = signal<ErrorApi | null>(null);
  protected readonly ultimaActualizacion = signal<Date | null>(null);

  constructor() {
    toObservable(this.autorrefresco)
      .pipe(
        // Con el autorrefresco desactivado se hace una única lectura.
        switchMap((activo) => (activo ? timer(0, INTERVALO_REFRESCO_MS) : timer(0))),
        exhaustMap(() =>
          forkJoin(CATALOGO_DEMOSTRACION.map((producto) => this.almacen.obtenerDisponibilidad(producto.id))).pipe(
            catchError((error: unknown) => {
              this.error.set(traducirError(error));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((disponibilidades) => {
        this.filas.set(disponibilidades.map((disponibilidad, i) => ({ producto: CATALOGO_DEMOSTRACION[i], disponibilidad })));
        this.error.set(null);
        this.ultimaActualizacion.set(new Date());
      });
  }

  protected porcentaje(parte: number, total: number): number {
    return total > 0 ? (parte / total) * 100 : 0;
  }
}
