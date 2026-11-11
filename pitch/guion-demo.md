# Guion de demo — Yapa / JujuyGo (pre-hackathon Tren Solar)

Duración objetivo: **4 minutos**. Tener `pitch/index.html` abierto en una pestaña
y la app en `localhost:4200` en otra, con el backend (`localhost:3000`) corriendo.

## 0:00 — El problema (30 seg)

> "Soy turista en Jujuy. No tengo auto. Quiero ir a Humahuaca.
> Google Maps me dice cómo llegar en auto. Las empresas de ómnibus
> pegan sus horarios en la terminal, en papel. Y la app de viajes
> asume que tenés nafta."

(Mostrar `pitch/index.html` scrolleando hasta la sección "El problema".)

## 0:30 — La respuesta (45 seg)

> "Yapa cruza el catálogo editorial de la Quebrada con los horarios
> reales del transporte público. No inventa logística: cada plan
> cierra contra los bondis que existen de verdad."

(Mostrar secciones "La respuesta" y la banda verde de datos:
896 horarios · 18 ciudades · 54 líneas urbanas.)

## 1:15 — Demo en vivo I: cómo se llega (90 seg)

En la app:

1. `/como-llegar` → origen "Mi ubicación" o Terminal de San Salvador →
   destino **Humahuaca**.
   - Mostrar: la RN9 con horarios reales, el mapa que **sigue las calles**
     (no líneas rectas), y la sección "Colectivo urbano" si aplica.
2. Probar un destino dentro de la ciudad (Plaza Belgrano) para mostrar
   las **líneas urbanas en vivo** de Santa Ana / El Urbano.

Frase: *"Esto no es una estimación. Es el horario que la empresa publicó."*

## 2:45 — Demo en vivo II: la travesía (90 seg)

1. `/travesia` → las 3 preguntas (fechas, llegada, intereses).
2. Mostrar el **plan día por día** generado y validado contra horarios.
3. Mostrar las **yapas** contextuales (los extra gifts).
4. Si hay tiempo: login con Google + "Guardar travesía" (requiere que el
   usuario haya configurado Supabase — si no, saltearlo sin drama).

## 4:15 — Cierre (30 seg)

> "Yapa es open source, sin reservas, sin comisiones. Nació para el
> Tren Solar: la misma lógica que hace que el tren valga la pena —
> llegar a horario — aplicada a todo el viaje del turista sin auto.
> Repo en GitHub, la landing está en pitch/."

## Plan B si se corta internet / falla algo

- Screenshots en `pitch/img/` (home, como-llegar, detalle, travesía) —
  mostrar la landing que ya tiene la sección "La demo".
- Si `/como-llegar` falla: mostrar la landing + explicar que es live
  contra datos reales.
- Backup del pitch hablado: problema → 3 datos duros → ruta piloto
  Terminal→Maimará→Tilcara→Humahuaca → CTA.
