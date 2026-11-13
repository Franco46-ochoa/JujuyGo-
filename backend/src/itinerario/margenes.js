// Margen de traslado entre el colectivo RN9 y la visita.
// Fuente única de los valores: para ajustarlos se toca solo este archivo.

export const MARGEN_BASE_MINUTOS = 15;
export const MARGEN_ACCESO_LOCAL_MINUTOS = 30;

// Claves: slug de una parada RN9 o de un lugar que exige un traslado local
// adicional entre la parada y la visita (también alimenta el aviso
// `acceso_local` que devuelve resolverParadaLugar).
export const ACCESOS_LOCALES = new Map([
  ['purmamarca-cruce', 'El colectivo deja en Purmamarca Cruce, a 3 km del pueblo; coordiná un traslado local.'],
  ['serrania-del-hornocal', 'El colectivo llega a Humahuaca; el Hornocal requiere un traslado local de altura.'],
]);

// Minutos de margen que hay que dejar entre la llegada del colectivo y la
// visita (y entre el fin de la visita y la vuelta a la parada).
// `parada` es lo que devuelve resolverParadaLugar(lugar); el margen suma el
// extra cuando el slug del lugar o el de su parada está en ACCESOS_LOCALES.
export function margenDeLugar(lugar, parada) {
  const accesoLocal = parada?.accesoLocal ?? ACCESOS_LOCALES.get(lugar?.slug) ?? null;
  return accesoLocal
    ? MARGEN_BASE_MINUTOS + MARGEN_ACCESO_LOCAL_MINUTOS
    : MARGEN_BASE_MINUTOS;
}
