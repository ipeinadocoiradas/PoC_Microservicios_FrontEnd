# Consola Saga — Front Angular de la PoC

Consola web para **lanzar los escenarios de la PoC de transacciones distribuidas y observar en directo** cómo evolucionan el estado del pedido, el estado interno de la Saga, la reserva de Almacén, el pago y el stock.

**Angular 20** (componentes standalone, señales, *zoneless*, control de flujo `@if`/`@for`) · **Tailwind CSS 4** · sin otras dependencias de UI.

## Pantallas

| Ruta | Qué permite |
|---|---|
| `/escenarios` | Lanzar con un clic los escenarios A–E, con su recorrido y resultado esperados. |
| `/pedidos/:id` | **Monitor**: estado del pedido frente a estado de la Saga, diagrama de la máquina de estados, historial de transiciones, reserva, pago y stock afectado. |
| `/pedidos` | Pedidos lanzados desde la consola, con su último estado y si coincide con el esperado. |
| `/pedidos/nuevo` | Pedido a medida. Permite desactivar la validación del navegador para ver la del backend (HTTP 400 con ProblemDetails). |
| `/inventario` | Stock físico, reservado y disponible del catálogo, refrescado cada 2 s. |

## Requisitos

- Node.js 20.19 o superior (o 22.12+).
- El backend en marcha: el AppHost de Aspire, o las tres APIs en `http://localhost:5001`, `5002` y `5003`.

## Puesta en marcha

```powershell
cd C:\MisProyectos\PoC_MicroServicios\FrontEnd
npm install
npm start          # ng serve → http://localhost:4200
```

### Cómo llega a las APIs

No hace falta CORS. El servidor de desarrollo reenvía las llamadas mediante `proxy.conf.mjs`:

| Prefijo | Destino por defecto |
|---|---|
| `/api/pedidos` | Pedidos.Api · `http://localhost:5001` |
| `/api/productos`, `/api/reservas` | Almacen.Api · `http://localhost:5002` |
| `/api/pagos` | Pagos.Api · `http://localhost:5003` |

Si las APIs usan otros puertos, defina `PEDIDOS_API_URL`, `ALMACEN_API_URL` o `PAGOS_API_URL` antes de `npm start`:

```powershell
$env:PEDIDOS_API_URL = "http://localhost:5101"; npm start
```

Cuando el front se registre en el AppHost de Aspire (fase 3), el proxy usará automáticamente las variables `services__<recurso>__http__0` que inyecta Aspire.

Al arrancar, la consola de `npm start` muestra los destinos efectivos: `[proxy] Pedidos → … · Almacén → … · Pagos → …`.

## Cómo sigue la Saga

El monitor consulta cada **750 ms**, en paralelo y de forma independiente:

- `GET /api/pedidos/{id}/estado`
- `GET /api/reservas?pedidoId=`
- `GET /api/pagos?pedidoId=`
- `GET /api/productos/{id}/disponibilidad`

Deja de consultar cuando la Saga llega a un estado final y, en el caso de `Completado`, cuando la reserva está `Confirmada`.

Si un servicio cae (escenario D), la consola **conserva su último estado conocido** y lo marca como *No disponible*, mientras sigue mostrando los demás.

## Historial de transiciones: fase 1 y fase 2

El monitor obtiene la línea de tiempo de la Saga a través de la abstracción `FuenteHistorialSaga` (`src/app/core/historial/`):

- **Fase 1 (actual) — `HistorialSagaObservado`:** registra una transición cada vez que el estado devuelto por `/estado` cambia. Las transiciones que ocurren entre dos consultas pueden no verse. `PedidoPendiente` se marca como visitado de forma implícita, porque es transitorio y nunca llega a persistirse.
- **Fase 2 — `HistorialSagaServidor` (pendiente):** leerá `GET /api/pedidos/{id}/historial`, que el backend alimentará en cada transición, con el evento que la provocó (`TransicionSaga.evento`). Bastará con cambiar el proveedor en `src/app/app.config.ts`:

```ts
{ provide: FuenteHistorialSaga, useClass: HistorialSagaServidor },
```

El diagrama y la línea de tiempo ya están preparados para mostrar el evento de cada transición.

## Estructura

```
src/app/
├─ core/
│  ├─ api/            clientes tipados de las tres APIs
│  ├─ datos/          catálogo de demostración y definición de los escenarios
│  ├─ estado/         pedidos recientes (localStorage, tolerante a fallos)
│  ├─ historial/      FuenteHistorialSaga + implementación observada (fase 1)
│  ├─ http/           interceptor X-Correlation-ID y traducción de ProblemDetails
│  ├─ modelos/        reflejo de los DTOs del backend y estados de la Saga
│  └─ seguimiento/    sondeo de los tres servicios y lanzamiento de pedidos
├─ shared/            insignia de estado, diagrama SVG de la Saga, panel de error
└─ features/          escenarios · monitor-pedido · pedidos-recientes · pedido-libre · inventario
```

## Convenciones

- Nombres del dominio y de la aplicación en español, coherentes con el backend.
- Colores con significado fijo:
  - azul: en curso;
  - verde: éxito;
  - violeta: compensación;
  - ámbar: cancelado o rechazado;
  - rojo: fallo técnico.
- Cada petición lleva `X-Correlation-ID`. El monitor muestra el del pedido para localizarlo en los logs del dashboard de Aspire.

## Limitaciones de la fase 1

- El catálogo y los pedidos recientes son locales al navegador, hasta que el backend exponga `GET /api/productos` y `GET /api/pedidos`.
- El historial es observado, no completo (ver arriba).
- La caída de Almacén (escenario D) se provoca desde el dashboard de Aspire. La consola muestra los pasos que hay que seguir.
- No incluye pruebas automatizadas del front.
