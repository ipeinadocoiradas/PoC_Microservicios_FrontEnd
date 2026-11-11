// Proxy del servidor de desarrollo de Angular.
//
// El navegador solo habla con http://localhost:4200; el servidor de desarrollo reenvía cada prefijo /api
// a la API propietaria. Así no hace falta habilitar CORS en el backend.
//
// Resolución del destino, por orden de prioridad:
//   1. Variables que inyecta .NET Aspire cuando el front se registra en el AppHost (fase 3):
//      services__pedidos-api__http__0, services__almacen-api__http__0, services__pagos-api__http__0
//   2. Variables propias, por si las APIs escuchan en otros puertos:
//      PEDIDOS_API_URL, ALMACEN_API_URL, PAGOS_API_URL
//   3. Los puertos por defecto de los launchSettings de cada API (5001, 5002, 5003).

const destino = (recursoAspire, variablePropia, urlPorDefecto) =>
  process.env[`services__${recursoAspire}__https__0`] ??
  process.env[`services__${recursoAspire}__http__0`] ??
  process.env[variablePropia] ??
  urlPorDefecto;

const pedidos = destino('pedidos-api', 'PEDIDOS_API_URL', 'http://localhost:5001');
const almacen = destino('almacen-api', 'ALMACEN_API_URL', 'http://localhost:5002');
const pagos = destino('pagos-api', 'PAGOS_API_URL', 'http://localhost:5003');

const reenviarA = (target) => ({ target, secure: false, changeOrigin: true, logLevel: 'warn' });

console.log(`[proxy] Pedidos → ${pedidos} · Almacén → ${almacen} · Pagos → ${pagos}`);

export default {
  '/api/pedidos': reenviarA(pedidos),
  '/api/productos': reenviarA(almacen),
  '/api/reservas': reenviarA(almacen),
  '/api/pagos': reenviarA(pagos),
};
