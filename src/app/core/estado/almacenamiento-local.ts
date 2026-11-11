/**
 * Acceso tolerante a `localStorage`. Puede no estar disponible (navegación privada, almacenamiento bloqueado),
 * así que cualquier fallo se ignora y la consola sigue funcionando sin persistencia.
 */
export function leerJson<T>(clave: string, valorPorDefecto: T): T {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? (JSON.parse(texto) as T) : valorPorDefecto;
  } catch {
    return valorPorDefecto;
  }
}

export function escribirJson(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin persistencia: no es crítico para la consola.
  }
}

export function eliminarClave(clave: string): void {
  try {
    localStorage.removeItem(clave);
  } catch {
    // Ignorado intencionadamente.
  }
}
