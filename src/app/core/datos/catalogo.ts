/**
 * Catálogo de demostración sembrado por Almacen.Api (`ProductosDemostracion`).
 * Mientras el backend no exponga `GET /api/productos` (fase 2), la consola usa estos identificadores fijos.
 */
export interface ProductoCatalogo {
  readonly id: string;
  readonly nombre: string;
  readonly stockInicial: number;
  readonly precioSugerido: number;
  readonly papel: string;
}

export const CATALOGO_DEMOSTRACION: readonly ProductoCatalogo[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Teclado mecánico',
    stockInicial: 100,
    precioSugerido: 49.9,
    papel: 'Flujo satisfactorio',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    nombre: 'Ratón inalámbrico',
    stockInicial: 50,
    precioSugerido: 25,
    papel: 'Fallo técnico del pago (666,66 €)',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    nombre: 'Monitor 4K 27"',
    stockInicial: 10,
    precioSugerido: 600,
    papel: 'Pago rechazado y compensación',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    nombre: 'Edición limitada',
    stockInicial: 0,
    precioSugerido: 199,
    papel: 'Sin stock',
  },
];

export const nombreProducto = (productoId: string): string =>
  CATALOGO_DEMOSTRACION.find((producto) => producto.id === productoId)?.nombre ?? productoId;
