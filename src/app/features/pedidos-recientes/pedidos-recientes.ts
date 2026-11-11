import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RegistroPedidosRecientes } from '../../core/estado/registro-pedidos-recientes';
import { InsigniaEstado } from '../../shared/insignia-estado';

/** Pedidos lanzados desde esta consola, con el último estado que observó el monitor. */
@Component({
  selector: 'app-pedidos-recientes',
  imports: [RouterLink, DatePipe, DecimalPipe, InsigniaEstado],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Pedidos recientes</h1>
        <p class="mt-2 max-w-3xl text-sm text-slate-600">
          Pedidos lanzados desde esta consola y guardados en el navegador. Los estados son los últimos que vio el
          monitor; ábralo para actualizarlos.
        </p>
      </div>
      @if (registro.hayPedidos()) {
        <button type="button" class="boton-secundario" (click)="registro.vaciar()">Vaciar lista</button>
      }
    </section>

    @if (registro.hayPedidos()) {
      <div class="tarjeta overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th class="px-4 py-3 font-semibold">Pedido</th>
              <th class="px-4 py-3 font-semibold">Creado</th>
              <th class="px-4 py-3 text-right font-semibold">Total</th>
              <th class="px-4 py-3 font-semibold">Pedido</th>
              <th class="px-4 py-3 font-semibold">Saga</th>
              <th class="px-4 py-3 font-semibold">Esperado</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (pedido of registro.pedidos(); track pedido.pedidoId) {
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3">
                  <p class="font-medium text-slate-900">{{ pedido.etiqueta }}</p>
                  <p class="font-mono text-xs text-slate-400">{{ pedido.pedidoId }}</p>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-slate-600">{{ pedido.fechaCreacion | date: 'dd/MM HH:mm:ss' }}</td>
                <td class="px-4 py-3 text-right whitespace-nowrap">{{ pedido.total | number: '1.2-2' }} {{ pedido.moneda }}</td>
                <td class="px-4 py-3"><app-insignia-estado [estado]="pedido.estadoPedido" /></td>
                <td class="px-4 py-3"><app-insignia-estado [estado]="pedido.estadoSaga" /></td>
                <td class="px-4 py-3">
                  @if (pedido.estadoFinalEsperado; as esperado) {
                    <span class="text-xs text-slate-600">{{ esperado }}</span>
                    @if (pedido.estadoPedido !== 'Pendiente') {
                      <span class="ml-1 text-xs font-bold" [class]="pedido.estadoPedido === esperado ? 'text-emerald-600' : 'text-rose-600'">
                        {{ pedido.estadoPedido === esperado ? '✓' : '✗' }}
                      </span>
                    }
                  } @else {
                    <span class="text-xs text-slate-400">—</span>
                  }
                </td>
                <td class="px-4 py-3 text-right">
                  <a [routerLink]="['/pedidos', pedido.pedidoId]" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">Monitor →</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="tarjeta p-10 text-center">
        <p class="text-slate-600">Todavía no se ha lanzado ningún pedido desde esta consola.</p>
        <a routerLink="/escenarios" class="boton-primario mt-4">Ir a los escenarios</a>
      </div>
    }
  `,
})
export class PedidosRecientes {
  protected readonly registro = inject(RegistroPedidosRecientes);
}
