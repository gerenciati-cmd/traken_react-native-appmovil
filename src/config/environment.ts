/**
 * Ambiente de datos de la app: "sandbox" (datos de prueba, clon separado de
 * la base de datos real) o "production" (datos reales de Traken).
 *
 * Por defecto SIEMPRE arranca en sandbox, y el switch de Producción se ve
 * en el Login pero queda BLOQUEADO (deshabilitado, con candado) hasta que
 * se libere aqui mismo cambiando PRODUCTION_UNLOCKED a `true` -- asi nadie
 * puede terminar probando la app contra datos reales por accidente
 * mientras se sigue probando.
 */
export type ApiEnvironment = 'sandbox' | 'production';

export const DEFAULT_ENVIRONMENT: ApiEnvironment = 'sandbox';

// Cambiar a `true` cuando ya se probo suficiente en sandbox y se decide
// permitir el cambio a datos reales desde la app.
export const PRODUCTION_UNLOCKED = false;

export const SITE_BASE_URLS: Record<ApiEnvironment, string> = {
  sandbox: 'https://traken.mx/sandbox',
  production: 'https://traken.mx',
};

export const ENVIRONMENT_LABELS: Record<ApiEnvironment, string> = {
  sandbox: 'Sandbox (pruebas)',
  production: 'Producción (datos reales)',
};
