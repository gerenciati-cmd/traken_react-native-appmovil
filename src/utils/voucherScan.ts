import { scanVoucherAI, logVoucherScan } from '../api/client';

/**
 * Mismo heurístico que _adivinarNombreDeTexto() en op/modulos/open/valida.js
 * (web): de todo el texto que lee el OCR, trata de adivinar cuál línea es
 * el nombre de la persona. Nunca es perfecto (por eso el resultado siempre
 * queda editable en pantalla), pero da un punto de partida.
 */
export function adivinarNombreDeTexto(texto: string): string {
  if (!texto) return '';
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/[^A-Za-zÀ-ÿ<\s]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((l) => l.length >= 6 && l.length <= 45);

  // Línea tipo MRZ de pasaporte (P<MEXAPELLIDO<<NOMBRES<<<...).
  for (const linea of lineas) {
    const sinEsp = linea.replace(/\s/g, '');
    const mrz = sinEsp.match(/^P<([A-Z]{3})(.+)$/);
    if (mrz) {
      const partes = mrz[2].split('<').filter(Boolean);
      if (partes.length >= 2) return partes.join(' ');
    }
  }

  const candidatas = lineas.filter((l) => {
    const palabras = l.split(' ').filter(Boolean);
    return palabras.length >= 2 && palabras.length <= 4 && !/\d/.test(l);
  });
  if (!candidatas.length) return lineas.length ? lineas[0] : '';
  candidatas.sort((a, b) => b.length - a.length);
  return candidatas[0];
}

export type ScanStage =
  | { kind: 'ai-loading'; message: string }
  | { kind: 'ai-slow'; message: string } // ya puede elegir "a mano" u "OCR local"
  | { kind: 'ocr-loading'; message: string }
  | { kind: 'done'; nombre: string; modo: 'ia' | 'ocr' | 'manual'; message: string };

type Options = {
  idOrder?: number;
  idAirport?: number;
  onStage: (stage: ScanStage) => void;
};

/**
 * Igual que _procesarFotoVoucher() en la web: manda la foto a la IA
 * primero. A los 8s avisa que sigue esperando; a los 18s ofrece elegir
 * "escribir a mano" u "OCR local" sin tener que esperar más; a los 45s se
 * rinde solo. Si la IA contesta antes de cualquiera de esos tiempos, se
 * usa su resultado y se cancelan los avisos.
 *
 * A diferencia de la web (Tesseract.js, que corre en el navegador), el
 * OCR local aquí es @react-native-ml-kit/text-recognition (Google ML Kit,
 * on-device, funciona sin internet) -- pero es un modulo nativo, asi que
 * SOLO funciona en una build compilada (development/production build),
 * no dentro de Expo Go (igual que las notificaciones push en Android).
 *
 * Devuelve una funcion para cancelar el proceso (si la persona cierra la
 * pantalla antes de que termine).
 */
export function iniciarEscaneoVoucher(fileUri: string, opts: Options): () => void {
  let terminado = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const limpiarTimers = () => {
    timers.forEach(clearTimeout);
    timers.length = 0;
  };

  opts.onStage({ kind: 'ai-loading', message: '🤖 Leyendo la imagen con IA, un momento…' });

  timers.push(
    setTimeout(() => {
      if (terminado) return;
      opts.onStage({ kind: 'ai-loading', message: '🤖 Sigue leyendo la imagen, un momento más…' });
    }, 8000)
  );

  timers.push(
    setTimeout(() => {
      if (terminado) return;
      opts.onStage({
        kind: 'ai-slow',
        message: '🐢 Tu conexión parece lenta, puede tardar un poco más.',
      });
    }, 18000)
  );

  timers.push(
    setTimeout(() => {
      if (terminado) return;
      terminado = true;
      opts.onStage({
        kind: 'done',
        nombre: '',
        modo: 'manual',
        message: '❌ Está tardando demasiado (puede ser tu conexión). Escribe el nombre manualmente.',
      });
      logVoucherScan('manual', false, opts.idOrder, opts.idAirport, 'timeout 45s');
    }, 45000)
  );

  scanVoucherAI(fileUri, opts.idOrder, opts.idAirport)
    .then((resp) => {
      if (terminado) return;
      terminado = true;
      limpiarTimers();
      const nombre = resp.ok ? (resp.nombre || '').trim() : '';
      if (nombre) {
        opts.onStage({ kind: 'done', nombre, modo: 'ia', message: '✅ Nombre detectado por IA (revísalo antes de usarlo):' });
      } else {
        const msg = resp.msg || 'No se detectó el nombre en la imagen.';
        opts.onStage({ kind: 'done', nombre: '', modo: 'ia', message: '⚠️ ' + msg + ' Escríbelo aquí con lo que veas en la foto:' });
      }
      // El log de exito/fallo de IA ya lo hace scan.php del lado del servidor.
    })
    .catch(() => {
      if (terminado) return;
      terminado = true;
      limpiarTimers();
      opts.onStage({ kind: 'done', nombre: '', modo: 'manual', message: '❌ Error de conexión al leer la imagen. Escribe el nombre manualmente.' });
      logVoucherScan('manual', false, opts.idOrder, opts.idAirport, 'error de red');
    });

  return () => {
    terminado = true;
    limpiarTimers();
  };
}

/**
 * OCR local con ML Kit (offline, on-device). Solo funciona en una build
 * compilada -- en Expo Go lanza un error controlado que se atrapa aqui
 * mismo para no tronar la app; el llamador debe avisar "no disponible en
 * Expo Go" en ese caso.
 */
export async function escanearConOcrLocal(fileUri: string): Promise<{ nombre: string; textoCompleto: string }> {
  // Import perezoso: si el modulo nativo no esta disponible (Expo Go), que
  // el error salga aqui (en un try/catch del que llama) y no al cargar
  // toda la pantalla.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
  const result = await TextRecognition.recognize(fileUri);
  const texto = result?.text || '';
  return { nombre: adivinarNombreDeTexto(texto), textoCompleto: texto };
}
