import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ErrorApi } from '../core/http/errores';

/** Muestra un error de la API (ProblemDetails) de forma legible, incluidos los errores de validación. */
@Component({
  selector: 'app-panel-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let detalleError = error();
    <div class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
      <p class="font-semibold">
        {{ detalleError.titulo }}
        @if (detalleError.estadoHttp) {
          <span class="font-mono text-xs font-normal text-rose-600">· HTTP {{ detalleError.estadoHttp }}</span>
        }
      </p>
      @if (detalleError.detalle) {
        <p class="mt-1">{{ detalleError.detalle }}</p>
      }
      @if (camposConError().length) {
        <ul class="mt-2 list-inside list-disc space-y-0.5">
          @for (campo of camposConError(); track campo.nombre) {
            <li><span class="font-mono text-xs">{{ campo.nombre }}</span>: {{ campo.mensajes }}</li>
          }
        </ul>
      }
      @if (detalleError.codigo || detalleError.traceId) {
        <p class="mt-2 font-mono text-xs text-rose-600">
          @if (detalleError.codigo) { código {{ detalleError.codigo }} }
          @if (detalleError.codigo && detalleError.traceId) { · }
          @if (detalleError.traceId) { traceId {{ detalleError.traceId }} }
        </p>
      }
    </div>
  `,
})
export class PanelError {
  readonly error = input.required<ErrorApi>();

  protected readonly camposConError = computed(() =>
    Object.entries(this.error().erroresValidacion).map(([nombre, mensajes]) => ({ nombre, mensajes: mensajes.join(' ') })),
  );
}
