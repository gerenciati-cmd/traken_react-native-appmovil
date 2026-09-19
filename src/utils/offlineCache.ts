import * as SQLite from 'expo-sqlite';

/**
 * Cache generico para pantallas de datos (Ordenes Abiertas, Crear O.S.,
 * Agregar Pax, y las que sigan): cada pantalla guarda aqui lo ultimo que
 * cargo con exito, y si la proxima peticion falla por falta de señal, se
 * muestra esto en vez de una pantalla vacia/de error. Es la version "app
 * nativa" del mismo objetivo que el service worker le da a la version web.
 *
 * Motor: SQLite (expo-sqlite), no AsyncStorage -- misma idea de fondo que
 * usan apps como WhatsApp para guardar datos en el telefono: una base de
 * datos real en vez de banderas sueltas. Aqui es una sola tabla
 * llave/valor porque lo que se guarda son "fotos" de la ultima respuesta
 * buena de cada pantalla (no hace falta relacionar tablas entre si para
 * esto), pero corre sobre el mismo motor de base de datos.
 */
const DB_NAME = 'traken_cache.db';

let dbPromise: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS cache (
           key TEXT PRIMARY KEY NOT NULL,
           data TEXT NOT NULL,
           saved_at INTEGER NOT NULL
         );`
      );
      return db;
    });
  }
  return dbPromise;
}

type CacheEntry<T> = { data: T; savedAt: number };

export async function saveCache<T>(key: string, data: T) {
  try {
    const db = await getDb();
    const savedAt = Date.now();
    await db.runAsync(
      'INSERT INTO cache (key, data, saved_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data, saved_at = excluded.saved_at;',
      [key, JSON.stringify(data), savedAt]
    );
  } catch (e) {
    // No es critico: en el peor caso no hay nada que mostrar offline.
  }
}

export async function getCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ data: string; saved_at: number }>(
      'SELECT data, saved_at FROM cache WHERE key = ?;',
      [key]
    );
    if (!row) return null;
    return { data: JSON.parse(row.data) as T, savedAt: row.saved_at };
  } catch (e) {
    return null;
  }
}
