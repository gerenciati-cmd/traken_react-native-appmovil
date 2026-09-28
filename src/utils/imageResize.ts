import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIMENSION = 1600;

/**
 * Redimensiona/comprime una foto antes de subirla o mandarla a la IA --
 * las fotos de camara (12-48MP) se suben casi enteras si no se tocan, lo
 * que hace lento el escaneo de vouchers y la subida de comprobantes. Solo
 * reduce dimensiones si la foto es mas grande que MAX_DIMENSION (nunca
 * agranda una imagen chica). Si algo falla, regresa el uri original para
 * no bloquear la subida por esto.
 */
export async function resizeForUpload(uri: string, width?: number, height?: number): Promise<string> {
  try {
    const actions: ImageManipulator.Action[] = [];
    if (width && width > MAX_DIMENSION) {
      actions.push({ resize: { width: MAX_DIMENSION } });
    } else if (!width && height && height > MAX_DIMENSION) {
      actions.push({ resize: { height: MAX_DIMENSION } });
    }
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch (e) {
    return uri;
  }
}
