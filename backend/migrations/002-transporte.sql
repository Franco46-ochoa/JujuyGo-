-- Migración 002: Transporte y horarios RN9
CREATE TABLE IF NOT EXISTS linea (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS parada (
    id SERIAL PRIMARY KEY,
    linea_id TEXT NOT NULL REFERENCES linea(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    orden_en_linea INTEGER NOT NULL,
    lat NUMERIC(9,6),
    lng NUMERIC(9,6),
    tipo TEXT NOT NULL CHECK (tipo IN ('parada', 'cruce', 'terminal')),
    notas TEXT
);

CREATE INDEX IF NOT EXISTS idx_parada_linea_orden ON parada(linea_id, orden_en_linea);
CREATE INDEX IF NOT EXISTS idx_parada_slug ON parada(slug);

CREATE TABLE IF NOT EXISTS horario (
    id SERIAL PRIMARY KEY,
    linea_id TEXT NOT NULL REFERENCES linea(id) ON DELETE CASCADE,
    parada_id INTEGER NOT NULL REFERENCES parada(id) ON DELETE CASCADE,
    servicio_id TEXT NOT NULL,
    hora_saliente TIME NOT NULL,
    direccion TEXT NOT NULL CHECK (direccion IN ('ida', 'vuelta')),
    frecuencia_dias TEXT NOT NULL DEFAULT 'diario',
    fuente TEXT NOT NULL CHECK (length(fuente) > 0),
    confianza TEXT NOT NULL CHECK (confianza IN ('publicado', 'estimado', 'tiempo-real')),
    vigente_desde DATE,
    vigente_hasta DATE,
    CONSTRAINT uq_horario_servicio_parada UNIQUE (servicio_id, parada_id)
);

CREATE INDEX IF NOT EXISTS idx_horario_parada ON horario(parada_id);
CREATE INDEX IF NOT EXISTS idx_horario_servicio ON horario(servicio_id);
CREATE INDEX IF NOT EXISTS idx_horario_linea_dir ON horario(linea_id, direccion);
