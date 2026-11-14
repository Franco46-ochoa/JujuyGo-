/* ═══ Travesía v2 — map-first · prototipo estático ═══
   Todo el contenido sale de data/travesia-v2.json. */
'use strict';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => innerWidth < 1024;

const $ = s => document.querySelector(s);
const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};

const fmtDur = min => {
  if (min == null) return null;
  const h = Math.floor(min / 60), m = min % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
};
const fmtFecha = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d} ${meses[m - 1]} ${y}`;
};
const imgBase = foto => foto.replace(/\.[^.]+$/, '');
const srcset = foto => {
  const b = imgBase(foto);
  return `img/${b}-640.webp 640w, img/${b}-1280.webp 1280w, img/${b}-1920.webp 1920w`;
};
const foto = (src, alt, sizes, lazy = true) => {
  const i = document.createElement('img');
  i.src = `img/${src}`;
  i.srcset = srcset(src);
  i.sizes = sizes;
  i.alt = alt;
  i.decoding = 'async';
  if (lazy) i.loading = 'lazy';
  return i;
};

/* ── Estado ── */
let DATA = null;
let vista = 'general';          // 'general' | número de día
let seleccion = null;           // item _id
let opener = null;              // elemento que abrió el detalle
const yapasOcultas = new Set();

const diaActual = () => DATA.dias.find(d => d.numero === vista);
const buscarItem = id => {
  for (const d of DATA.dias) for (const it of d.items) if (it._id === id) return { item: it, dia: d };
  return null;
};

/* ── Puntos y marcadores ── */
const pts = []; // {id, tipo, lat, lng, dia, itemId, nombre, orden, yapaRef}
const markerPorId = new Map();
let lineasDia = new Map(); // dia.numero -> [polyline]

function puntosDelDia(dia) {
  const out = [];
  const paradasVistas = new Set();
  let ultimo = null;
  let nV = 0; // número de orden entre VISITAS del día
  dia.items.forEach((it, i) => {
    if (it.tipo === 'tramo') {
      for (const lado of ['desde', 'hasta']) {
        const p = it[lado];
        if (p.coordenadas === 'verificadas-en-base' && p.lat != null) {
          const key = `${p.nombre}|parada`;
          if (!paradasVistas.has(key)) {
            paradasVistas.add(key);
            out.push({ tipo: 'parada', lat: p.lat, lng: p.lng, nombre: p.nombre, itemId: it._id, orden: i + 1 });
          }
          ultimo = { lat: p.lat, lng: p.lng };
        }
      }
    } else if (it.tipo === 'visita') {
      const g = it.lugar;
      if (g.lat != null) {
        nV++;
        out.push({ tipo: 'visita', lat: g.lat, lng: g.lng, nombre: g.nombre, itemId: it._id, orden: nV });
        ultimo = { lat: g.lat, lng: g.lng };
      }
    } else if (it.tipo === 'yapa') {
      const g = it.lugar;
      if (g && g.lat != null) {
        // La conexión sale SOLO de la referencia espacial declarada en los datos; sin referencia, no hay línea.
        const r = it.referencia;
        const ref = r && r.coordenadas === 'verificadas-en-base' && r.lat != null ? { lat: r.lat, lng: r.lng } : null;
        out.push({ tipo: 'yapa', lat: g.lat, lng: g.lng, nombre: g.nombre, itemId: it._id, orden: i + 1, ref });
      }
    }
  });
  // noche: en la parada donde se duerme
  if (dia.noche) {
    const p = out.find(q => q.tipo === 'parada' && q.nombre === dia.noche)
           || out.find(q => q.nombre === dia.noche);
    if (p) out.push({ tipo: 'noche', lat: p.lat, lng: p.lng, nombre: `Noche ${dia.numero}: ${dia.noche}`, itemId: null, orden: 0 });
  }
  return out;
}

function iconoDe(p) {
  let html, size, anchor;
  const general = vista === 'general';
  if (p.tipo === 'visita') {
    // general: glifo = número de DÍA · día: orden entre visitas del día
    html = `<div class="mk mk-visita"><b>${general ? p.dia : p.orden}</b><i class="mk-guia" hidden></i></div>`;
    size = [26, 26]; anchor = [13, 13];
  } else if (p.tipo === 'parada') {
    html = `<div class="mk mk-parada"><span class="mk-dot"></span><span class="mk-etiq">${p.nombre}</span><i class="mk-guia" hidden></i></div>`;
    size = [12, 12]; anchor = [6, 6];
  } else if (p.tipo === 'noche') {
    html = `<div class="mk mk-noche">N${p.dia}<i class="mk-guia" hidden></i></div>`;
    size = [24, 24]; anchor = [12, 12];
  } else {
    html = `<div class="mk mk-yapa">✳<i class="mk-guia" hidden></i></div>`;
    size = [26, 26]; anchor = [13, 13];
  }
  return L.divIcon({ className: 'mkw', html, iconSize: size, iconAnchor: anchor });
}

let mapa;
function initMapa() {
  mapa = L.map('mapa', { zoomControl: false });
  L.control.zoom({ position: 'topright' }).addTo(mapa);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 17
  }).addTo(mapa);
  const ley = L.control({ position: 'topleft' });
  ley.onAdd = () => {
    const d = el('div', 'v2-leyenda-wrap');
    d.innerHTML = `<div class="v2-leyenda"><span class="lin"></span><span class="ley-lg">Línea punteada: conexión esquemática, no es el recorrido del colectivo</span><span class="ley-sm">– – conexión esquemática, no es el recorrido</span></div>`;
    return d;
  };
  ley.addTo(mapa);
  window.__mapa = mapa; // solo para pruebas
  mapa.on('moveend', resolverEncimados);
}

function construirPuntos() {
  pts.length = 0;
  DATA.dias.forEach(d => puntosDelDia(d).forEach(p => { p.dia = d.numero; p.id = `${d.numero}|${p.tipo}|${p.orden}|${p.nombre}`; pts.push(p); }));
}

function dibujarMapa() {
  markerPorId.forEach(m => mapa.removeLayer(m));
  markerPorId.clear();
  const lin = [];
  mapa.eachLayer(l => { if (l instanceof L.Polyline) lin.push(l); });
  lin.forEach(l => mapa.removeLayer(l));

  // líneas esquemáticas por día
  DATA.dias.forEach(d => {
    // Las yapas no son puntos del recorrido: la línea del día no pasa por ellas.
    const seq = puntosDelDia(d).filter(p => p.tipo !== 'noche' && p.tipo !== 'yapa');
    const ll = seq.map(p => [p.lat, p.lng]);
    if (ll.length > 1) {
      const atenuar = vista !== 'general' && vista !== d.numero;
      L.polyline(ll, { className: 'v2-lin', interactive: false, opacity: atenuar ? .3 : 1 }).addTo(mapa);
    }
    puntosDelDia(d).forEach(p => {
      if (p.tipo === 'yapa' && p.ref) {
        L.polyline([p.ref, [p.lat, p.lng]], { className: 'v2-lin-yapa', interactive: false, opacity: vista !== 'general' && vista !== d.numero ? .3 : 1 }).addTo(mapa);
      }
    });
  });

  pts.forEach(p => {
    // vista general: solo visitas y noches (paradas y yapas son detalle de día)
    if (vista === 'general' && (p.tipo === 'parada' || p.tipo === 'yapa')) return;
    if (p.tipo === 'yapa' && p.itemId && yapasOcultas.has(p.itemId)) return;
    const inter = p.itemId != null;
    const m = L.marker([p.lat, p.lng], {
      icon: iconoDe(p),
      keyboard: inter,
      interactive: inter,
      title: p.nombre,
      alt: p.nombre
    }).addTo(mapa);
    m._pto = p;
    if (inter) m.on('click', () => seleccionar(p.itemId, null, true));
    aplicarEstadoMarcador(m);
    markerPorId.set(p.id, m);
  });
  resolverEncimados();
}

/* Si dos marcadores visibles se intersectan, el segundo se desplaza en X
   con una línea guía punteada de vuelta a su punto real. */
function resolverEncimados() {
  requestAnimationFrame(() => {
    const icons = [...document.querySelectorAll('.leaflet-marker-icon')]
      .filter(e => !e.classList.contains('atenuado'));
    icons.forEach(ic => { ic._nx = 0; ic._ny = 0; });
    for (let iter = 0; iter < 6; iter++) {
      let movio = false;
      const rs = icons.map(ic => ({ ic, r: ic.getBoundingClientRect() }));
      for (let i = 0; i < rs.length; i++) {
        for (let j = i + 1; j < rs.length; j++) {
          const a = rs[i].r, b = rs[j].r;
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox > 0 && oy > 0) {
            const ic = rs[j].ic;
            ic._nx += (ox + 8) * (b.left + b.width / 2 >= a.left + a.width / 2 ? 1 : -1);
            movio = true;
          }
        }
      }
      if (!movio) break;
      icons.forEach(ic => {
        // desplazar el icono completo vía margin-left (transform de Leaflet se reserva para posicionar)
        if (ic._m0 == null) ic._m0 = parseFloat(ic.style.marginLeft) || 0;
        ic.style.marginLeft = `${ic._m0 + ic._nx}px`;
        const g = ic.querySelector('.mk-guia');
        if (g) {
          g.hidden = ic._nx === 0;
          g.style.width = `${Math.abs(ic._nx)}px`;
          g.style.left = ic._nx > 0 ? `${-ic._nx}px` : '100%';
        }
      });
    }
  });
}

function aplicarEstadoMarcador(m) {
  const p = m._pto;
  const e = m.getElement();
  const atenuar = vista !== 'general' && p.dia !== vista;
  m.setIcon(iconoDe(p)); // reconstruye (incluye tag de día según vista)
  const e2 = m.getElement();
  if (e2) {
    e2.classList.toggle('atenuado', atenuar);
    e2.classList.toggle('sel', seleccion != null && p.itemId === seleccion);
  }
  if (atenuar && m.options.interactive) { m._interPrev = true; m.options.interactive = false; }
  else if (!atenuar && m._interPrev) { m.options.interactive = true; delete m._interPrev; }
}

function refrescarMarcadores() { markerPorId.forEach(aplicarEstadoMarcador); }

/* ── Encuadre ── */
const HOJA_SVH = { contraida: .28, media: .55, expandida: .88 };
function alturaHoja() {
  if (!mobile()) return 0;
  const e = $('#panel').dataset.estado;
  // altura objetivo del estado (no la medida a mitad de transición)
  return innerHeight * (HOJA_SVH[e] || .28);
}
function paddingMapa() {
  if (mobile()) {
    // clamp: nunca dejar una caja visible degenerada (p.ej. hoja expandida)
    const pb = Math.min(Math.round(alturaHoja()) + 60, innerHeight - 170);
    return { paddingTopLeft: [16, 70], paddingBottomRight: [16, pb] };
  }
  const det = !$('#detalle').hidden;
  return { paddingTopLeft: [440, 88], paddingBottomRight: [det ? 400 : 90, 40] };
}
function encuadrar() {
  const visibles = pts.filter(p =>
    (vista === 'general' || p.dia === vista) &&
    !(p.tipo === 'yapa' && p.itemId && yapasOcultas.has(p.itemId)));
  if (!visibles.length) return;
  const b = L.latLngBounds(visibles.map(p => [p.lat, p.lng]));
  mapa.fitBounds(b, { ...paddingMapa(), animate: !RM });
}
function panVisible(ll) {
  // panInside garantiza el punto dentro de la caja visible en una sola animación:
  // en mobile el punto queda por encima del borde superior de la hoja;
  // en desktop, fuera del panel izquierdo y del detalle derecho.
  const pad = mobile()
    ? { paddingTopLeft: [20, 90], paddingBottomRight: [20, Math.min(Math.round(alturaHoja()) + 64, innerHeight - 170)] }
    : { paddingTopLeft: [430, 90], paddingBottomRight: [$('#detalle').hidden ? 60 : 380, 60] };
  mapa.panInside(ll, { ...pad, animate: !RM });
}

/* ── Hash ── */
function escribirHash() {
  const h = vista === 'general' ? '#general' : (seleccion ? `#dia-${vista}/${seleccion}` : `#dia-${vista}`);
  history.replaceState(null, '', h);
}
function leerHash() {
  const m = location.hash.match(/^#dia-(\d+)(?:\/(.+))?$/);
  if (m) {
    vista = Number(m[1]);
    seleccion = m[2] ? decodeURIComponent(m[2]) : null;
  }
}

/* ── Render ── */
function chipsDeDias() {
  const dd = el('div', 'v2-dias');
  DATA.dias.forEach(d => {
    const db = el('button', null, String(d.numero).padStart(2, '0'));
    db.type = 'button';
    db.setAttribute('aria-pressed', String(d.numero === vista));
    db.setAttribute('aria-label', `Día ${d.numero}`);
    db.onclick = () => irDia(d.numero);
    dd.appendChild(db);
  });
  return dd;
}

function renderNav() {
  const nav = $('#v2-nav');
  nav.innerHTML = '';
  if (vista !== 'general') {
    const b = el('button', 'v2-volver', '← Todo el viaje');
    b.type = 'button';
    b.onclick = () => irGeneral();
    nav.appendChild(b);
    nav.appendChild(chipsDeDias());
    nav.classList.remove('vacia');
  } else {
    nav.classList.add('vacia'); // en mobile los chips viven en la cabecera de la hoja
  }
  // chips en la cabecera de la hoja (mobile; oculto en desktop por CSS)
  const cab = $('#cab-dias');
  cab.innerHTML = '';
  cab.appendChild(chipsDeDias());
}

function badge(txt, cls) { return el('span', `badge ${cls}`, txt); }

function tramoFila(t, compacta = false) {
  const w = el('div', 'tramo' + (compacta ? ' compacta' : ''));
  const horas = el('div', 'tramo-horas');
  horas.append(el('span', 'h', t.salida), el('span', 'flecha', '→'), el('span', 'll', `~${t.llegada}`));
  const bs = el('div', 'tramo-badges');
  bs.append(badge(t.salida_confianza === 'publicado' ? 'Salida publicada' : 'Salida estimada',
    t.salida_confianza === 'publicado' ? 'badge-publicado' : 'badge-estimado'));
  bs.append(badge('Llegada estimada', 'badge-estimado'));
  w.append(horas, bs);
  w.append(el('p', 'tramo-quien', `${t.empresa} · ${t.servicio} · hacia ${t.destino_final}`));
  const sinDesde = t.desde.coordenadas !== 'verificadas-en-base';
  const sinHasta = t.hasta.coordenadas !== 'verificadas-en-base';
  const ruta = el('p', 'tramo-ruta', `${t.desde.nombre} → ${t.hasta.nombre}`);
  w.append(ruta);
  if (sinDesde || sinHasta) {
    const pb = el('div', 'tramo-badges');
    pb.style.color = 'var(--tinta)';
    pb.append(badge('Parada sin coordenadas verificadas', 'badge-verificar'));
    w.append(pb);
  }
  const dur = fmtDur(t.duracion_min);
  w.append(el('p', 'tramo-info', `${dur ? dur + ' de viaje (estimado)' : 'Duración sin dato'} · Corre: ${t.frecuencia.texto}`));
  if (t.salida_nota) w.append(el('p', 'tramo-nota', t.salida_nota));
  if (t.nota_destino) w.append(el('p', 'tramo-nota', t.nota_destino));
  return w;
}

const BADGE_VISITA = {
  'local': ['Traslado local', 'badge-local'],
  'sin-horario': ['Sin horario fijo', 'badge-sin-horario'],
  'verificar-regreso': ['Verificar regreso', 'badge-verificar']
};

function paradaContenido(v, fotoModo = 'thumb', lazy = true, orden = null) {
  // fotoModo: 'thumb' (miniatura en la lista) | 'grande' (detalle) | null
  const frag = document.createDocumentFragment();
  const cuerpo = el('div', 'parada-cuerpo');
  const hh = el('div', 'parada-hora');
  if (orden != null) hh.append(el('span', 'p-num', String(orden)));
  if (v.hora) {
    hh.append(el('span', 'h', v.hora), badge('Hora estimada', 'badge-estimado'));
  } else {
    hh.append(el('span', 'h', '—'), el('span', 'parada-loc', 'Sin hora fija'));
  }
  cuerpo.append(hh);
  cuerpo.append(el('p', 'parada-nombre', v.lugar.nombre));
  cuerpo.append(el('p', 'parada-loc', `${v.lugar.localidad} · ${v.lugar.altitud_m} msnm`));
  const dur = v.duracion_min != null ? `${fmtDur(v.duracion_min)} · ${v.duracion_origen}` : v.duracion_origen;
  if (dur) cuerpo.append(el('p', 'parada-dur', dur));
  if (v.acceso_local) cuerpo.append(el('p', 'parada-acceso', v.acceso_local));
  if (v.badges && v.badges.length) {
    const bs = el('div', 'parada-badges');
    v.badges.forEach(b => { const d = BADGE_VISITA[b]; if (d) bs.append(badge(d[0], d[1])); });
    cuerpo.append(bs);
  }
  if (v.regreso_regla) cuerpo.append(el('p', 'parada-regla', v.regreso_regla));
  frag.append(cuerpo);
  if (fotoModo === 'thumb' && v.lugar.foto) {
    frag.append(foto(v.lugar.foto, v.lugar.nombre, '88px', lazy));
    frag.lastElementChild.className = 'p-thumb';
  } else if (fotoModo === 'grande' && v.lugar.foto) {
    frag.append(foto(v.lugar.foto, v.lugar.nombre, '(max-width:1023px) 88vw, 328px', lazy));
  }
  return frag;
}

function yapaInline(y, modo = 'lista') {
  // modo 'lista': botón seleccionable (kicker + mensaje + línea de estado) + acciones fuera;
  //              las razones/faltan van en el detalle.
  // modo 'detalle': todo el contenido en un solo bloque.
  const w = el('div', modo === 'lista' ? 'yapa-wrap' : 'yapa-i');
  w.dataset.yapa = y._id;

  const contenido = (destino) => {
    destino.append(el('p', 'kicker2', '✳ yapa'));
    destino.append(el('p', 'msg', y.mensaje));
    if (y.hora_sugerida) destino.append(el('p', 'hsug', `Hora sugerida: ~${y.hora_sugerida}`));
    if (y.cierre.estado === 'cierra') {
      if (modo === 'detalle') {
        destino.append(el('h4', null, 'Cierra porque'));
        const ul = el('ul');
        y.cierre.razones.forEach(r => ul.append(el('li', null, r)));
        destino.append(ul);
      } else {
        destino.append(el('p', 'yapa-status', 'Cierra · ver por qué en el detalle'));
      }
    } else {
      destino.append(el('h4', null, 'Sugerencia sin garantía de horario'));
      if (modo === 'detalle') {
        destino.append(el('p', 'msg', y.cierre.texto));
        const ul = el('ul');
        y.cierre.faltan.forEach(f => ul.append(el('li', null, f)));
        destino.append(ul);
      }
    }
  };

  const cola = () => {
    const c = el('div', 'yapa-cola');
    if (y._sumada) {
      c.append(el('p', 'yapa-estado', 'Sumada · en producción se vuelve a validar'));
    } else {
      const acc = el('div', 'yapa-acc');
      const s = el('button', 'sumar', 'Sumar');
      const p = el('button', 'pasar', 'Dejar pasar');
      s.type = p.type = 'button';
      s.onclick = ev => { ev.stopPropagation(); y._sumada = true; pintar(); };
      p.onclick = ev => {
        ev.stopPropagation();
        yapasOcultas.add(y._id);
        if (seleccion === y._id) seleccionar(null);
        pintar(); dibujarMapa(); encuadrar();
      };
      acc.append(s, p);
      c.append(acc);
    }
    return c;
  };

  const pintar = () => {
    w.innerHTML = '';
    if (yapasOcultas.has(y._id)) {
      const d = el('button', 'yapa-deshacer', 'Deshacer — mostrar la yapa otra vez');
      d.type = 'button';
      d.onclick = ev => { ev.stopPropagation(); yapasOcultas.delete(y._id); pintar(); dibujarMapa(); encuadrar(); };
      w.append(el('p', 'yapa-estado', 'Yapa omitida.'), d);
      return;
    }
    if (modo === 'detalle') {
      contenido(w);
      w.append(cola());
    } else {
      const b = el('button', 'item-btn yapa-i');
      b.type = 'button';
      b.setAttribute('aria-current', String(seleccion === y._id));
      contenido(b);
      b.onclick = () => seleccionar(y._id, b);
      w.append(b, cola());
    }
  };
  pintar();
  return w;
}

function renderLista() {
  const lista = $('#lista');
  lista.innerHTML = '';
  const resumen = $('#v2-resumen');
  if (vista === 'general') {
    lista.append(el('h1', 'v2-tit-vista', 'La travesía, día por día.'));
    DATA.dias.forEach(d => {
      const c = el('button', 'dia-card');
      c.type = 'button';
      c.append(el('span', 'num', String(d.numero).padStart(2, '0')));
      c.append(el('p', 'cuando', `${d.dia_semana} · ${fmtFecha(d.fecha)}`));
      c.append(el('p', 'ruta', d.recorrido.join(' → ')));
      if (d.foto) c.append(foto(d.foto, d.recorrido[d.recorrido.length - 1], '(max-width:1023px) 88vw, 364px', d.numero !== 1));
      const meta = el('p', 'meta');
      meta.innerHTML = `<b>${d.paradas}</b> ${d.paradas === 1 ? 'visita' : 'visitas'} · Colectivos ${d.rango.desde} → ~${d.rango.hasta}` +
        (d.noche ? ` · Noche en <b>${d.noche}</b>` : '');
      c.append(meta);
      c.append(el('p', `estado-txt ${d.estado}`, d.estado_texto));
      c.onclick = () => irDia(d.numero);
      lista.append(c);
    });
    const origen = DATA.dias[0].recorrido[0];
    const destino = DATA.dias[DATA.dias.length - 1].recorrido.at(-1);
    resumen.textContent = `${DATA.dias.length} días · ${origen} → … → ${destino}`;
    return;
  }
  const d = diaActual();
  lista.append(el('h1', 'v2-tit-dia', d.recorrido.join(' → ')));
  lista.append(el('p', `estado-txt ${d.estado}`, d.estado_texto));
  const ol = el('ol', 'v2-lista');
  let nV = 0;
  d.items.forEach(it => {
    const li = el('li');
    li.className = it.tipo;
    li.id = `item-${it._id}`;
    if (it.tipo === 'tramo') {
      const b = el('button', 'item-btn');
      b.type = 'button';
      b.append(tramoFila(it));
      b.setAttribute('aria-current', String(seleccion === it._id));
      b.onclick = () => seleccionar(it._id, b);
      li.append(b);
    } else if (it.tipo === 'visita') {
      nV++;
      const b = el('button', 'item-btn parada');
      b.type = 'button';
      b.append(paradaContenido(it, 'thumb', true, nV));
      b.setAttribute('aria-current', String(seleccion === it._id));
      b.onclick = () => seleccionar(it._id, b);
      li.append(b);
    } else if (it.tipo === 'yapa') {
      li.append(yapaInline(it));
    } else if (it.tipo === 'plan-b') {
      const pb = el('div', 'planb');
      pb.append(el('h4', null, 'Plan B — si perdés el regreso'));
      it.alternativas.forEach(a => pb.append(tramoFila(a, true)));
      it.descartados.forEach(x => {
        const f = el('p', 'descartado');
        const s = el('s', null, `${x.salida} ${x.empresa} ${x.servicio}`);
        f.append(s, document.createTextNode(` — no sirve: ${x.motivo}`));
        pb.append(f);
      });
      li.append(pb);
    }
    ol.append(li);
  });
  lista.append(ol);

  // resumen para la hoja contraída
  if (seleccion) {
    const f = buscarItem(seleccion);
    resumen.textContent = f ? resumenDe(f.item) : '';
  } else {
    const t = d.items.find(i => i.tipo === 'tramo');
    resumen.textContent = t ? resumenDe(t) : d.recorrido.join(' → ');
  }
}

function resumenDe(it) {
  if (it.tipo === 'tramo') return `Próximo tramo: ${it.salida} ${it.empresa} hacia ${it.destino_final}.`;
  if (it.tipo === 'visita') return `${it.lugar.nombre}${it.hora ? ' · ' + it.hora : ' · sin hora fija'}.`;
  if (it.tipo === 'yapa') return `✳ yapa — ${it.lugar ? it.lugar.nombre : it.mensaje}`;
  return '';
}

function renderDetalle() {
  const det = $('#detalle');
  det.innerHTML = '';
  det.hidden = false;
  det.style.top = '';
  if (!seleccion) { det.hidden = true; $('#panel').classList.add('sin-detalle'); return; }
  const f = buscarItem(seleccion);
  if (!f || (f.item.tipo !== 'visita' && f.item.tipo !== 'yapa')) { det.hidden = true; $('#panel').classList.add('sin-detalle'); return; }
  $('#panel').classList.remove('sin-detalle');
  // desktop: arranca debajo del control de zoom
  if (!mobile()) {
    const zc = document.querySelector('.leaflet-control-zoom');
    if (zc) det.style.top = `${Math.round(zc.getBoundingClientRect().bottom) + 16}px`;
  }
  const cerrar = el('button', 'cerrar', 'Cerrar');
  cerrar.type = 'button';
  cerrar.onclick = () => seleccionar(null);
  det.append(cerrar);
  const it = f.item;
  if (it.tipo === 'visita') {
    if (it.lugar.foto) det.append(foto(it.lugar.foto, it.lugar.nombre, '(max-width:1023px) 88vw, 328px'));
    else if (it.lugar.foto_nota) det.append(el('p', 'foto-nota', it.lugar.foto_nota));
    det.append(paradaContenido(it, null));
  } else {
    det.append(el('h3', null, it.lugar ? it.lugar.nombre : 'Yapa'));
    if (it.lugar && it.lugar.foto) det.append(foto(it.lugar.foto, it.lugar.nombre, '(max-width:1023px) 88vw, 328px'));
    else if (it.lugar && it.lugar.foto_nota) det.append(el('p', 'foto-nota', it.lugar.foto_nota));
    det.append(yapaInline(it, 'detalle'));
  }
  // tramo siguiente del día
  const idx = f.dia.items.indexOf(it);
  const sig = f.dia.items.slice(idx + 1).find(x => x.tipo === 'tramo');
  if (sig) {
    const s = el('div', 'det-sig');
    s.append(el('h4', null, 'Después'));
    s.append(tramoFila(sig, true));
    det.append(s);
  }
}

/* ── Transiciones de estado ── */
function irGeneral() { vista = 'general'; seleccion = null; sync(true); }
function irDia(n) { vista = n; seleccion = null; sync(true); }

function seleccionar(id, openerEl = null, desdeMapa = false) {
  if (id === seleccion) { seleccion = null; opener = null; }
  else { seleccion = id; if (openerEl) opener = openerEl; }
  sync(false);
  if (seleccion) {
    const f = buscarItem(seleccion);
    const p = pts.find(q => q.itemId === seleccion);
    if (p) panVisible([p.lat, p.lng]);
    if (desdeMapa && mobile() && $('#panel').dataset.estado === 'contraida') setHoja('media');
    if (desdeMapa) {
      const card = $(`#item-${CSS.escape(seleccion)}`);
      card?.querySelector('button, .yapa-i')?.scrollIntoView({ block: 'nearest' });
    }
    // aria-current
    document.querySelectorAll('.item-btn[aria-current]').forEach(b =>
      b.setAttribute('aria-current', String(b.closest('li').id === `item-${seleccion}`)));
  }
}

function sync(encuadre) {
  renderNav();
  renderLista();
  renderDetalle();
  dibujarMapa();
  escribirHash();
  if (encuadre) encuadrar();
  else refrescarMarcadores();
  if (!encuadre) encuadrar(); // el padding cambia si el detalle abre/cierra
}

/* ── Hoja (mobile) ── */
const ESTADOS = ['contraida', 'media', 'expandida'];
function setHoja(e) {
  const p = $('#panel');
  p.dataset.estado = e;
  p.setAttribute('aria-expanded', String(e !== 'contraida'));
  const i = ESTADOS.indexOf(e);
  const sub = $('#btn-subir'), baj = $('#btn-bajar');
  sub.disabled = i === ESTADOS.length - 1;
  baj.disabled = i === 0;
  sub.setAttribute('aria-disabled', String(sub.disabled));
  baj.setAttribute('aria-disabled', String(baj.disabled));
  // Re-encuadrar salvo al expandir: en expandida la hoja tapa el mapa de todos
  // modos y mover el lienzo sólo desorienta.
  if (e !== 'expandida') encuadrar();
}
function ciclarHoja() {
  const i = ESTADOS.indexOf($('#panel').dataset.estado);
  setHoja(ESTADOS[(i + 1) % ESTADOS.length]);
}
function initHoja() {
  setHoja('contraida');
  $('#hoja-asa').onclick = ciclarHoja;
  $('#btn-subir').onclick = () => {
    const i = ESTADOS.indexOf($('#panel').dataset.estado);
    if (i < 2) setHoja(ESTADOS[i + 1]);
  };
  $('#btn-bajar').onclick = () => {
    const i = ESTADOS.indexOf($('#panel').dataset.estado);
    if (i > 0) setHoja(ESTADOS[i - 1]);
  };
  // arrastre solo en la cabecera
  const cab = $('#hoja-cab');
  let y0 = null, h0 = 0;
  cab.addEventListener('pointerdown', e => {
    if (e.target.closest('.hoja-acciones')) return;
    y0 = e.clientY; h0 = $('#panel').getBoundingClientRect().height;
    cab.setPointerCapture(e.pointerId);
    $('#panel').classList.add('sin-transicion');
  });
  cab.addEventListener('pointermove', e => {
    if (y0 == null) return;
    const h = Math.min(innerHeight * .9, Math.max(innerHeight * .18, h0 + (y0 - e.clientY)));
    $('#panel').style.height = `${h}px`;
  });
  const soltar = e => {
    if (y0 == null) return;
    y0 = null;
    $('#panel').classList.remove('sin-transicion');
    $('#panel').style.height = '';
    const h = $('#panel').getBoundingClientRect().height / innerHeight * 100;
    const candidatos = [{ e: 'contraida', h: 28 }, { e: 'media', h: 55 }, { e: 'expandida', h: 88 }];
    candidatos.sort((a, b) => Math.abs(a.h - h) - Math.abs(b.h - h));
    setHoja(candidatos[0].e);
  };
  cab.addEventListener('pointerup', soltar);
  cab.addEventListener('pointercancel', soltar);
}

/* ── Teclado global ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && seleccion) {
    const liId = opener?.closest?.('li')?.id || (opener?.id?.startsWith('item-') ? opener.id : null);
    seleccionar(null);
    if (liId) $(`#${liId} button`)?.focus();
    else if (opener && document.contains(opener)) opener.focus();
    opener = null;
  }
});

addEventListener('resize', () => encuadrar());
addEventListener('hashchange', () => { leerHash(); sync(true); });

/* ── Datos ── */
function renderDatos() {
  const m = DATA.meta;
  $('#v2-sub').textContent = `${DATA.dias.length} días · ${DATA.dias.filter(d => d.noche).length} noches`;
  const sum = document.querySelector('.v2-datos summary');
  sum.textContent = 'Datos';
  sum.setAttribute('aria-label', 'Sobre estos datos');
  const b = $('#v2-datos-body');
  b.append(el('p', null, m.aviso));
  b.append(el('h3', null, 'Fuentes'));
  const ul = el('ul');
  Object.entries(m.fuentes).forEach(([k, v]) => {
    const li = el('li');
    li.append(el('span', null, `${k}: `), document.createTextNode(v));
    ul.append(li);
  });
  b.append(ul);
  b.append(el('h3', null, 'Bloqueos conocidos'));
  const ub = el('ul');
  m.bloqueos.forEach(x => ub.append(el('li', null, x)));
  b.append(ub);
}

(async () => {
  DATA = await (await fetch('data/travesia-v2.json')).json();
  DATA.dias.forEach(d => d.items.forEach((it, i) => it._id = `d${d.numero}-i${i}`));
  construirPuntos();
  initMapa();
  initHoja();
  leerHash();
  if (vista !== 'general' && seleccion && !buscarItem(seleccion)) seleccion = null;
  renderDatos();
  sync(true);
  if (seleccion) { // restaurar foco visual tras carga con hash
    const p = pts.find(q => q.itemId === seleccion);
    if (p) panVisible([p.lat, p.lng]);
  }
})();
