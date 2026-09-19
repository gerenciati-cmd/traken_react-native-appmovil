import { useCallback, useEffect, useState } from 'react';
import { getCache, saveCache } from './offlineCache';

/**
 * Version "hook" del mismo patron que ya usan Ordenes Abiertas y Crear O.S.:
 * intenta cargar del servidor: si responde con ok=false es un error real (se
 * muestra tal cual, NO se usa el cache -- podria ser un permiso, un dato que
 * ya no existe, etc.); si la peticion truena (sin señal), se busca lo ultimo
 * guardado en el almacenamiento del telefono para esa pantalla y se muestra
 * con el aviso de "sin conexion".
 *
 * `extract` saca del response de la API solo lo que vale la pena recordar
 * (cada endpoint tiene una forma distinta: {hotels,...}, {items,...}, etc.).
 */
export function useOfflineLoad<TRes extends { ok: boolean; error?: string }, TData>(
  cacheKey: string,
  fetcher: () => Promise<TRes>,
  extract: (res: TRes) => TData,
  deps: React.DependencyList
) {
  const [data, setData] = useState<TData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      if (res.ok) {
        const extracted = extract(res);
        setData(extracted);
        setOfflineSince(null);
        await saveCache<TData>(cacheKey, extracted);
      } else {
        setError(res.error ?? 'No se pudo cargar la información.');
      }
    } catch (e) {
      const cached = await getCache<TData>(cacheKey);
      if (cached) {
        setData(cached.data);
        setOfflineSince(cached.savedAt);
      } else {
        setError('Sin conexión y sin datos guardados todavía.');
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, offlineSince, reload: load };
}

export function formatSavedAt(ms: number): string {
  const d = new Date(ms);
  return (
    d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) +
    ' ' +
    d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  );
}
