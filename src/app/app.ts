import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface EnlaceNavegacion {
  readonly ruta: string;
  readonly texto: string;
  readonly exacto: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen">
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 sm:px-6">
          <a routerLink="/escenarios" class="flex items-center gap-3">
            <span class="grid size-9 place-items-center rounded-lg bg-indigo-600 font-mono text-sm font-bold text-white">S</span>
            <span class="leading-tight">
              <span class="block text-sm font-semibold text-slate-900">Consola Saga</span>
              <span class="block text-xs text-slate-500">PoC transacciones distribuidas</span>
            </span>
          </a>

          <nav class="flex flex-wrap gap-1" aria-label="Navegación principal">
            @for (enlace of enlaces; track enlace.ruta) {
              <a
                [routerLink]="enlace.ruta"
                routerLinkActive="bg-indigo-50 text-indigo-700"
                [routerLinkActiveOptions]="{ exact: enlace.exacto }"
                class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {{ enlace.texto }}
              </a>
            }
          </nav>
        </div>
      </header>

      <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class App {
  protected readonly enlaces: readonly EnlaceNavegacion[] = [
    { ruta: '/escenarios', texto: 'Escenarios', exacto: true },
    { ruta: '/pedidos', texto: 'Pedidos recientes', exacto: true },
    { ruta: '/pedidos/nuevo', texto: 'Pedido libre', exacto: true },
    { ruta: '/inventario', texto: 'Inventario', exacto: true },
  ];
}
