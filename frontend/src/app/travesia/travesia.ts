import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CatalogoService } from '../catalogo.service';
import { Lugar } from '../catalogo.types';
import { crearPlan } from './travesia.model';
import {
  ConflictoTravesia,
  Interes,
  Llegada,
  PlanTravesia,
  RespuestaProximos,
  ResultadoValidacion,
  TramoTravesia,
} from './travesia.types';
import { TravesiaService } from './travesia.service';

@Component({
  imports: [NgTemplateOutlet, RouterLink],
  selector: 'app-travesia',
  templateUrl: './travesia.html',
  styleUrl: './travesia.css',
})
export class TravesiaPage {
  private readonly catalogo = inject(CatalogoService);
  private readonly travesia = inject(TravesiaService);

  protected readonly lugares = signal<Lugar[]>([]);
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
  protected readonly errorTransporte = signal('');
  private validacionId = 0;

  constructor() {
    this.catalogo.getLugares().subscribe({
      next: lugares => {
        this.lugares.set(lugares);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar los lugares para armar tu travesía. Revisá tu conexión e intentá de nuevo.');
        this.cargando.set(false);
      },
    });
  }

  protected actualizarFecha(campo: 'inicio' | 'fin', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (campo === 'inicio') this.fechaInicio.set(value);
    else this.fechaFin.set(value);
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
      if (!this.fechaInicio() || !this.fechaFin() || this.fechaInicio() > this.fechaFin()) {
        this.error.set('Elegí un rango de fechas válido para continuar.');
        return;
      }
    }
    if (this.paso() === 3 && !this.intereses().length) {
      this.error.set('Elegí al menos un interés para preparar la propuesta.');
      return;
    }
    this.paso.update(actual => Math.min(actual + 1, 3));
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
    );
    if (!propuesta) {
      this.error.set('El rango de fechas no es válido. Corregilo para generar el plan.');
      return;
    }
    this.plan.set(propuesta);
    this.validar(propuesta);
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
}
