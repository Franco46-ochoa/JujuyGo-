import { describe, expect, it } from 'vitest';
import { fotoFallbackZona, fotoSrc, fotoSrcset } from './foto';

describe('foto helpers', () => {
  it('fallback por zona conocida', () => {
    expect(fotoFallbackZona('quebrada')).toBe('purmamarca.jpg');
    expect(fotoFallbackZona('puna')).toBe('puna.jpg');
    expect(fotoFallbackZona('yungas')).toBe('calilegua.jpg');
    expect(fotoFallbackZona('valles')).toBe('salsaju.jpg');
  });

  it('fallback por defecto para zona desconocida o ausente', () => {
    expect(fotoFallbackZona('otra')).toBe('purmamarca.jpg');
    expect(fotoFallbackZona(undefined)).toBe('purmamarca.jpg');
    expect(fotoFallbackZona('')).toBe('purmamarca.jpg');
  });

  it('fotoSrc con foto devuelve el JPG', () => {
    expect(fotoSrc('garganta.jpg')).toBe('/img/garganta.jpg');
    expect(fotoSrc('garganta.jpg', 'puna')).toBe('/img/garganta.jpg');
  });

  it('fotoSrc sin foto usa el fallback de la zona', () => {
    expect(fotoSrc(null, 'puna')).toBe('/img/puna.jpg');
    expect(fotoSrc(undefined, 'yungas')).toBe('/img/calilegua.jpg');
    expect(fotoSrc(null)).toBe('/img/purmamarca.jpg');
  });

  it('fotoSrcset deriva las tres variantes WebP de un nombre .jpg', () => {
    expect(fotoSrcset('garganta.jpg')).toBe(
      '/img/garganta-640.webp 640w, /img/garganta-1280.webp 1280w, /img/garganta-1920.webp 1920w',
    );
  });

  it('fotoSrcset sin foto usa el fallback de la zona', () => {
    expect(fotoSrcset(null, 'valles')).toBe(
      '/img/salsaju-640.webp 640w, /img/salsaju-1280.webp 1280w, /img/salsaju-1920.webp 1920w',
    );
  });
});
