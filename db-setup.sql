-- Setup Postgres local para desarrollo (correr UNA vez como superusuario):
--   psql -U postgres -f db-setup.sql
-- Crea el rol y la DB de desarrollo. Las credenciales son SOLO dev local.
CREATE ROLE jujuygo LOGIN PASSWORD 'jujuygo';
CREATE DATABASE jujuygo OWNER jujuygo;
