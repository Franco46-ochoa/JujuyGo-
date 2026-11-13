/**
 * Resolución de fotos de lugares y zonas.
 * Los nombres de archivo vienen de la base (columna `foto`); las variantes
 * WebP (-640/-1280/-1920) se derivan del nombre, sin tocar datos.
 */

const FALLBACK_POR_ZONA: Record<string, string> = {
  quebrada: 'purmamarca.jpg',
  puna: 'puna.jpg',
  yungas: 'calilegua.jpg',
  valles: 'salsaju.jpg',
};

const FOTO_DEFECTO = 'purmamarca.jpg';

/** Nombre del archivo de fallback para una zona (nunca la foto de otra zona). */
export function fotoFallbackZona(zona_slug?: string): string {
  return FALLBACK_POR_ZONA[zona_slug ?? ''] ?? FOTO_DEFECTO;
}

/** `/img/<archivo>.jpg` — el JPG original, que queda como fallback. */
export function fotoSrc(foto: string | null | undefined, zona_slug?: string): string {
  return `/img/${foto || fotoFallbackZona(zona_slug)}`;
}

/** `srcset` con las tres variantes WebP derivadas del nombre del archivo. */
export function fotoSrcset(foto: string | null | undefined, zona_slug?: string): string {
  const base = (foto || fotoFallbackZona(zona_slug)).replace(/\.[^.]+$/, '');
  return `/img/${base}-640.webp 640w, /img/${base}-1280.webp 1280w, /img/${base}-1920.webp 1920w`;
}
