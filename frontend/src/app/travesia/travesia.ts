import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../auth.service';
import { CatalogoService } from '../catalogo.service';
import { Lugar } from '../catalogo.types';
import { deserializarPlan } from './travesia.guardadas';
import { crearPlan } from './travesia.model';
import {
  ConflictoTravesia,
  ContextoTravesia,
  Interes,
  Llegada,
  PlanTravesia,
  RespuestaProximos,
  ResultadoValidacion,
  TramoTravesia,
  YapaTravesia,
} from './travesia.types';
import { TravesiaService } from './travesia.service';
import { generarYapas } from './travesia.yapas';
import { TravesiaGuardada, TravesiasGuardadasService } from './travesias-guardadas.service';

@Component({
  imports: [DecimalPipe, NgTemplateOutlet, RouterLink],
  selector: 'app-travesia',
  templateUrl: './travesia.html',
  styleUrls: ['./travesia.css', './travesia-plan.css'],
})
export class TravesiaPage {
  protected readonly auth = inject(AuthService);
  private readonly catalogo = inject(CatalogoService);
  private readonly travesia = inject(TravesiaService);
  private readonly travesiasGuardadas = inject(TravesiasGuardadasService);

  protected readonly lugares = signal<Lugar[]>([]);
  protected readonly contexto = signal<ContextoTravesia | null>(null);
  protected readonly paso = signal(1);
  protected readonly fechaInicio = signal('');
  protected readonly fechaFin = signal('');
  protected readonly llegada = signal<Llegada>('terminal');
  protected readonly intereses = signal<Interes[]>(['paisaje']);
  protected readonly plan = signal<PlanTravesia | null>(null);
  protected readonly validacion = signal<ResultadoValidacion | null>(null);
  protected readonly transporte = signal<Record<string, RespuestaProximos>>({});
  protected readonly cargando = signal(true);
  protected readonly validando = signal(false);
  protected readonly error = signal('');
  protected readonly errorCatalogo = signal('');
  protected readonly errorContexto = signal('');
  protected readonly errorFechaInicio = signal('');
  protected readonly errorFechaFin = signal('');
  protected readonly lugaresElegidos = signal<string[]>([]);
  protected readonly descartadas = signal<string[]>([]);
  protected readonly yapasMostradas = signal<Record<string, number>>({});
  private readonly yapaMensajes = signal<Record<string, string>>({});
  private readonly yapaPedidas = new Set<string>();
  protected readonly lugarPendientePorDia = signal<Record<number, string>>({});
  protected readonly errorTransporte = signal('');
  protected readonly travesias = signal<TravesiaGuardada[]>([]);
  protected readonly cargandoTravesias = signal(false);
  protected readonly guardandoTravesia = signal(false);
  protected readonly errorTravesias = signal('');
  protected readonly mensajeGuardado = signal('');
  private validacionId = 0;
  private cargaTravesiasId = 0;

  constructor() {
    effect(() => {
      const usuario = this.auth.sesion();
      if (!this.auth.inicializado()) return;
      if (!usuario) {
        this.cargaTravesiasId++;
        this.travesias.set([]);
        this.cargandoTravesias.set(false);
        return;
      }
      void this.cargarTravesias(usuario.id);
    });

    this.catalogo.getLugares().subscribe({
      next: lugares => {
        this.lugares.set(lugares);
        this.cargando.set(false);
      },
      error: () => {
        this.errorCatalogo.set('No pudimos cargar los lugares para armar tu travesía. Revisá tu conexión e intentá de nuevo.');
        this.cargando.set(false);
      },
    });
    this.travesia.getContexto().subscribe({
      next: contexto => this.contexto.set(contexto),
      error: () => this.errorContexto.set('No pudimos consultar los horarios RN9. La propuesta usará horas orientativas y no mostrará yapas de ruta.'),
    });
  }

  protected actualizarFecha(campo: 'inicio' | 'fin', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (campo === 'inicio') {
      this.fechaInicio.set(value);
      this.errorFechaInicio.set('');
    } else {
      this.fechaFin.set(value);
      this.errorFechaFin.set('');
    }
    this.error.set('');
  }

  protected seleccionarLlegada(value: Llegada): void {
    this.llegada.set(value);
  }

  protected alternarInteres(interes: Interes, checked: boolean): void {
    this.intereses.update(actuales => {
      const actualizados = checked
        ? [...actuales, interes]
        : actuales.filter(actual => actual !== interes);
      return actualizados;
    });
  }

  protected alternarInteresDesdeEvento(interes: Interes, event: Event): void {
    this.alternarInteres(interes, (event.target as HTMLInputElement).checked);
  }

  protected avanzar(): void {
    this.error.set('');
    if (this.paso() === 1) {
      this.errorFechaInicio.set(this.fechaInicio() ? '' : 'Elegí la fecha de llegada.');
      this.errorFechaFin.set(this.fechaFin() ? '' : 'Elegí la fecha de regreso.');
      if (this.fechaInicio() && this.fechaFin() && this.fechaInicio() > this.fechaFin()) {
        this.errorFechaFin.set('La fecha de regreso no puede ser anterior a la llegada.');
      }
      if (this.errorFechaInicio() || this.errorFechaFin()) {
        return;
      }
    }
    if (this.paso() === 3 && !this.intereses().length) {
      this.error.set('Elegí al menos un interés para preparar la propuesta.');
      return;
    }
    this.paso.update(actual => Math.min(actual + 1, 4));
  }

  protected volver(): void {
    this.error.set('');
    this.paso.update(actual => Math.max(actual - 1, 1));
  }

  protected armar(): void {
    const propuesta = crearPlan(
      this.fechaInicio(),
      this.fechaFin(),
      this.llegada(),
      this.intereses(),
      this.lugares(),
      this.lugaresElegidos(),
      this.contexto(),
    );
    if (!propuesta) {
      this.error.set(this.lugaresElegidos().length
        ? 'Con estas fechas no entran todos los lugares elegidos sin mezclar zonas lejanas. Sumá días o ajustá tu selección.'
        : 'No pudimos armar un plan con ese rango de fechas. Revisalo para continuar.');
      return;
    }
    this.plan.set(propuesta);
    this.validar(propuesta);
  }

  protected alternarLugar(lugar: Lugar): void {
    this.lugaresElegidos.update(actuales => actuales.includes(lugar.slug)
      ? actuales.filter(slug => slug !== lugar.slug)
      : [...actuales, lugar.slug]);
    this.error.set('');
  }

  protected omitirSeleccion(): void {
    this.lugaresElegidos.set([]);
    this.armar();
  }

  protected gruposDeLugares(): { zona: string; lugares: Lugar[] }[] {
    const grupos = new Map<string, Lugar[]>();
    for (const lugar of this.lugares()) {
      const lista = grupos.get(lugar.zona) ?? [];
      lista.push(lugar);
      grupos.set(lugar.zona, lista);
    }
    return [...grupos.entries()].map(([zona, lugares]) => ({ zona, lugares }));
  }

  /**
   * Devuelve la URL de la foto. Si foto es NULL, usa una imagen representativa
   * de la zona del lugar (nunca la foto de otra zona como fallback).
   */
  protected fotoUrl(foto: string | null, zona_slug?: string): string {
    if (foto) return `/img/${foto}`;
    const mapa: Record<string, string> = {
      quebrada: 'purmamarca.jpg',
      puna: 'puna.jpg',
      yungas: 'calilegua.jpg',
      valles: 'salsaju.jpg',
    };
    return `/img/${mapa[zona_slug ?? ''] ?? 'purmamarca.jpg'}`;
  }

  protected lugaresDisponibles(): Lugar[] {
    const incluidos = new Set(this.plan()?.dias.flatMap(dia => dia.eventos.map(evento => evento.lugar)) ?? []);
    return this.lugares().filter(lugar => !incluidos.has(lugar.slug));
  }

  protected actualizarLugarPendiente(diaIndex: number, event: Event): void {
    const slug = (event.target as HTMLSelectElement).value;
    this.lugarPendientePorDia.update(actuales => ({ ...actuales, [diaIndex]: slug }));
  }

  protected agregarLugarAlDia(diaIndex: number): void {
    const slug = this.lugarPendientePorDia()[diaIndex];
    const lugar = this.lugares().find(item => item.slug === slug);
    const actual = this.plan();
    if (!actual || !lugar) return;
    const dias = actual.dias.map(dia => ({ ...dia, eventos: [...dia.eventos] }));
    const eventos = dias[diaIndex].eventos;
    const horaFinal = eventos.reduce((ultimo, evento) => {
      const [hora, minuto] = evento.hora.split(':').map(Number);
      return Math.max(ultimo, hora * 60 + minuto + evento.duracion_minutos);
    }, 7 * 60);
    const hora = `${String(Math.floor(horaFinal / 60) % 24).padStart(2, '0')}:${String(horaFinal % 60).padStart(2, '0')}`;
    eventos.push({
      id: `${dias[diaIndex].fecha}-${lugar.slug}`,
      lugar: lugar.slug,
      nombre: lugar.nombre,
      hora,
      duracion_minutos: 120,
    });
    const actualizado = { ...actual, dias };
    this.plan.set(actualizado);
    this.validar(actualizado);
  }

  protected yapaActual(): { diaIndex: number; yapa: YapaTravesia } | null {
    const plan = this.plan();
    const contexto = this.contexto();
    if (!plan) return null;

    for (const [diaIndex, dia] of plan.dias.entries()) {
      const diaKey = dia.fecha;
      if ((this.yapasMostradas()[diaKey] ?? 0) >= 2) continue;
      const lugaresDelDia = dia.eventos
        .map(evento => this.lugares().find(lugar => lugar.slug === evento.lugar))
        .filter((lugar): lugar is Lugar => Boolean(lugar));
      const ultimoEvento = dia.eventos.at(-1);
      const horaDisponible = ultimoEvento
        ? this.minutos(ultimoEvento.hora) + ultimoEvento.duracion_minutos
        : 0;
      const sugerencias = generarYapas(lugaresDelDia, this.lugares(), contexto, horaDisponible);
      const yapa = sugerencias.find(opcion => !this.descartadas().includes(`${diaKey}:${opcion.lugar_sugerido_slug}`));
      if (yapa) {
        const lugar = this.lugares().find(l => l.slug === yapa.lugar_sugerido_slug);
        const key = `${diaKey}:${yapa.lugar_sugerido_slug}:${yapa.mensaje}`;
        const inicio = this.fechaInicio();
        const fin = this.fechaFin();
        this.pedirRedaccionYapa(key, yapa, lugar?.nombre ?? yapa.lugar_sugerido_slug,
          inicio || fin ? `viaje del ${inicio || '?'} al ${fin || '?'}` : undefined);
        const mensaje = this.yapaMensajes()[key];
        return { diaIndex, yapa: mensaje ? { ...yapa, mensaje } : yapa };
      }
    }
    return null;
  }

  // El LLM solo decora el mensaje; las reglas ya decidieron qué yapa va.
  private pedirRedaccionYapa(key: string, yapa: YapaTravesia, lugarNombre: string, contexto?: string): void {
    if (this.yapaPedidas.has(key)) return;
    this.yapaPedidas.add(key);
    this.travesia.redactarYapas([{
      tipo: yapa.tipo,
      lugar: lugarNombre,
      mensaje: yapa.mensaje,
      contexto,
    }]).subscribe({
      next: res => {
        const mensaje = res.mensajes?.[0]?.mensaje;
        if (mensaje && mensaje !== yapa.mensaje) {
          this.yapaMensajes.update(m => ({ ...m, [key]: mensaje }));
        }
      },
      error: () => {},
    });
  }

  protected sumarYapa(diaIndex: number, yapa: YapaTravesia): void {
    const actual = this.plan();
    const lugar = this.lugares().find(item => item.slug === yapa.lugar_sugerido_slug);
    if (!actual || !lugar) return;

    const dias = actual.dias.map(dia => ({ ...dia, eventos: [...dia.eventos] }));
    const eventos = dias[diaIndex].eventos;
    const horaFinal = eventos.reduce((ultimo, evento) => {
      const fin = this.minutos(evento.hora) + evento.duracion_minutos;
      return Math.max(ultimo, fin);
    }, 8 * 60);
    const hora = yapa.hora_sugerida ?? this.horaDesdeMinutos(horaFinal + 30);
    eventos.push({
      id: `${dias[diaIndex].fecha}-${lugar.slug}`,
      lugar: lugar.slug,
      nombre: lugar.nombre,
      hora,
      duracion_minutos: 120,
    });
    const actualizado = { ...actual, dias };
    this.yapasMostradas.update(contador => ({
      ...contador,
      [dias[diaIndex].fecha]: (contador[dias[diaIndex].fecha] ?? 0) + 1,
    }));
    this.plan.set(actualizado);
    this.validar(actualizado);
  }

  protected dejarYapa(yapa: YapaTravesia, diaIndex: number): void {
    const fecha = this.plan()?.dias[diaIndex].fecha;
    if (!fecha) return;
    this.descartadas.update(actuales => [...actuales, `${fecha}:${yapa.lugar_sugerido_slug}`]);
    this.yapasMostradas.update(contador => ({
      ...contador,
      [fecha]: (contador[fecha] ?? 0) + 1,
    }));
  }

  protected nombreLugar(slug: string): string {
    return this.lugares().find(lugar => lugar.slug === slug)?.nombre
      ?? this.nombreParada(slug)
      ?? slug.replace(/-/g, ' ').replace(/\b\p{L}/gu, letra => letra.toLocaleUpperCase('es'));
  }

  protected nombreParada(slug: string): string | null {
    const paradas = this.contexto()?.paradas ?? [];
    const encontrada = paradas.find(parada => parada.slug === slug);
    if (encontrada) return encontrada.nombre;
    const nombres: Record<string, string> = {
      'terminal-jjs': 'Terminal de San Salvador',
      'purmamarca-cruce': 'Purmamarca Cruce',
      'abra-pampa': 'Abra Pampa',
      'la-quiaca': 'La Quiaca',
      maimara: 'Maimará',
      tilcara: 'Tilcara',
      humahuaca: 'Humahuaca',
      uquia: 'Uquía',
      volcan: 'Volcán',
    };
    return nombres[slug] ?? null;
  }

  protected humanizar(texto: string): string {
    return texto.replace(/\b[a-z]+(?:-[a-z]+)+\b/gi, slug => this.nombreParada(slug) ?? slug);
  }

  private minutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  }

  private horaDesdeMinutos(total: number): string {
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  protected moverEvento(diaOrigen: number, indiceEvento: number, event: Event): void {
    const diaDestino = Number((event.target as HTMLSelectElement).value);
    if (!Number.isInteger(diaDestino) || diaDestino === diaOrigen) return;

    const actual = this.plan();
    if (!actual) return;
    const dias = actual.dias.map(dia => ({ ...dia, eventos: [...dia.eventos] }));
    const [evento] = dias[diaOrigen].eventos.splice(indiceEvento, 1);
    dias[diaDestino].eventos.push(evento);
    dias[diaDestino].eventos.sort((a, b) => a.hora.localeCompare(b.hora));
    const actualizado = { ...actual, dias };
    this.plan.set(actualizado);
    this.validar(actualizado);
  }

  protected borrarEvento(diaIndice: number, eventoIndice: number): void {
    const actual = this.plan();
    if (!actual) return;
    const dias = actual.dias.map(dia => ({ ...dia, eventos: [...dia.eventos] }));
    dias[diaIndice].eventos.splice(eventoIndice, 1);
    const actualizado = { ...actual, dias };
    this.plan.set(actualizado);
    this.validar(actualizado);
  }

  protected editarRespuestas(): void {
    this.validacionId++;
    this.validando.set(false);
    this.error.set('');
    this.plan.set(null);
    this.validacion.set(null);
    this.transporte.set({});
    this.paso.set(1);
  }

  protected nuevaTravesia(): void {
    this.editarRespuestas();
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.intereses.set(['paisaje']);
    this.lugaresElegidos.set([]);
    this.yapasMostradas.set({});
  }

  protected async entrarConGoogle(): Promise<void> {
    await this.auth.entrarConGoogle();
  }

  protected async guardarTravesia(): Promise<void> {
    const plan = this.plan();
    const usuario = this.auth.sesion();
    if (!plan) return;
    if (!usuario) {
      if (this.auth.configurado) await this.auth.entrarConGoogle();
      return;
    }

    this.guardandoTravesia.set(true);
    this.errorTravesias.set('');
    this.mensajeGuardado.set('');
    try {
      const lugaresDelPlan = [...new Set(plan.dias.flatMap(dia => dia.eventos.map(evento => evento.lugar)))];
      await this.travesiasGuardadas.guardar(usuario.id, plan, lugaresDelPlan);
      this.mensajeGuardado.set('Travesía guardada en tu cuenta.');
      await this.cargarTravesias(usuario.id);
    } catch (error) {
      this.errorTravesias.set(this.mensajeError(error, 'No pudimos guardar la travesía.'));
    } finally {
      this.guardandoTravesia.set(false);
    }
  }

  protected cargarTravesia(guardada: TravesiaGuardada): void {
    const datos = deserializarPlan(guardada.datos);
    if (!datos) {
      this.errorTravesias.set('Esta travesía guardada no tiene un formato que podamos cargar.');
      return;
    }

    this.errorTravesias.set('');
    this.mensajeGuardado.set('');
    this.llegada.set(datos.plan.llegada);
    this.intereses.set([...datos.plan.intereses]);
    this.lugaresElegidos.set([...datos.lugaresElegidos]);
    this.fechaInicio.set(datos.plan.dias[0]?.fecha ?? '');
    this.fechaFin.set(datos.plan.dias.at(-1)?.fecha ?? '');
    this.errorFechaInicio.set('');
    this.errorFechaFin.set('');
    this.descartadas.set([]);
    this.yapasMostradas.set({});
    this.lugarPendientePorDia.set({});
    this.paso.set(4);
    this.plan.set(datos.plan);
    this.validar(datos.plan);
  }

  protected async borrarTravesia(guardada: TravesiaGuardada): Promise<void> {
    if (!window.confirm(`¿Borrar “${guardada.titulo}” de tus travesías?`)) return;
    this.errorTravesias.set('');
    try {
      await this.travesiasGuardadas.borrar(guardada.id);
      this.travesias.update(actuales => actuales.filter(item => item.id !== guardada.id));
    } catch (error) {
      this.errorTravesias.set(this.mensajeError(error, 'No pudimos borrar la travesía.'));
    }
  }

  protected fechaGuardada(fecha: string): string {
    return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(fecha));
  }

  protected conflictosDelDia(numeroDia: number): ConflictoTravesia[] {
    return this.validacion()?.conflictos.filter(conflicto => conflicto.dia === numeroDia) ?? [];
  }

  protected tramosDelEvento(numeroDia: number, eventoIndice: number): TramoTravesia[] {
    return this.validacion()?.tramos.filter(tramo =>
      tramo.dia === numeroDia && tramo.evento_indice === eventoIndice,
    ) ?? [];
  }

  protected tramosDeRegreso(numeroDia: number): TramoTravesia[] {
    return this.validacion()?.tramos.filter(tramo =>
      tramo.dia === numeroDia && tramo.etiqueta === 'regreso',
    ) ?? [];
  }

  protected transporteDelTramo(tramo: TramoTravesia): RespuestaProximos | null {
    return this.transporte()[this.claveTramo(tramo)] ?? null;
  }

  protected etiquetaLlegada(value: Llegada): string {
    return { avion: 'Avión', terminal: 'Terminal', auto: 'Auto propio' }[value];
  }

  protected fechaLegible(fecha: string): string {
    return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
      .format(new Date(`${fecha}T12:00:00`));
  }

  private validar(plan: PlanTravesia): void {
    const validacionId = ++this.validacionId;
    this.validando.set(true);
    this.error.set('');
    this.errorTransporte.set('');
    this.validacion.set(null);
    this.transporte.set({});
    this.travesia.validar(plan).subscribe({
      next: resultado => {
        if (validacionId !== this.validacionId) return;
        this.validacion.set(resultado);
        this.plan.set(resultado.plan);
        this.validando.set(false);
        this.cargarTransporte(resultado.tramos, validacionId);
      },
      error: () => {
        if (validacionId !== this.validacionId) return;
        this.error.set('No pudimos comprobar los horarios. Revisá tu conexión e intentá validar el plan otra vez.');
        this.validando.set(false);
      },
    });
  }

  private cargarTransporte(tramos: TramoTravesia[], validacionId: number): void {
    const consultas = tramos.map(tramo => ({
      clave: this.claveTramo(tramo),
      observable: this.travesia.getProximos(tramo.origen, tramo.destino, tramo.hora_salida),
    }));
    if (!consultas.length) {
      this.transporte.set({});
      return;
    }
    forkJoin(consultas.map(consulta => consulta.observable)).subscribe({
      next: respuestas => {
        if (validacionId !== this.validacionId) return;
        this.transporte.set(Object.fromEntries(respuestas.map((respuesta, indice) => [
          consultas[indice].clave,
          respuesta,
        ])));
      },
      error: () => {
        if (validacionId !== this.validacionId) return;
        this.errorTransporte.set('No pudimos cargar el detalle de los próximos colectivos; los conflictos y horarios publicados siguen visibles.');
      },
    });
  }

  private claveTramo(tramo: TramoTravesia): string {
    return `${tramo.origen}:${tramo.destino}:${tramo.hora_salida}`;
  }

  private async cargarTravesias(userId: string): Promise<void> {
    const cargaId = ++this.cargaTravesiasId;
    this.cargandoTravesias.set(true);
    this.errorTravesias.set('');
    try {
      const travesias = await this.travesiasGuardadas.listar(userId);
      if (cargaId === this.cargaTravesiasId) this.travesias.set(travesias);
    } catch (error) {
      if (cargaId === this.cargaTravesiasId) {
        this.errorTravesias.set(this.mensajeError(error, 'No pudimos cargar tus travesías.'));
      }
    } finally {
      if (cargaId === this.cargaTravesiasId) this.cargandoTravesias.set(false);
    }
  }

  private mensajeError(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
