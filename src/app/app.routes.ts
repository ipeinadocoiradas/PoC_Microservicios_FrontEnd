import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'escenarios' },
  {
    path: 'escenarios',
    title: 'Escenarios · Consola Saga',
    loadComponent: () => import('./features/escenarios/escenarios').then((m) => m.Escenarios),
  },
  {
    path: 'pedidos',
    title: 'Pedidos recientes · Consola Saga',
    loadComponent: () => import('./features/pedidos-recientes/pedidos-recientes').then((m) => m.PedidosRecientes),
  },
  {
    path: 'pedidos/nuevo',
    title: 'Pedido libre · Consola Saga',
    loadComponent: () => import('./features/pedido-libre/pedido-libre').then((m) => m.PedidoLibre),
  },
  {
    path: 'pedidos/:pedidoId',
    title: 'Monitor del pedido · Consola Saga',
    loadComponent: () => import('./features/monitor-pedido/monitor-pedido').then((m) => m.MonitorPedido),
  },
  {
    path: 'inventario',
    title: 'Inventario · Consola Saga',
    loadComponent: () => import('./features/inventario/inventario').then((m) => m.Inventario),
  },
  { path: '**', redirectTo: 'escenarios' },
];
