-- Migración 004: corrige asignaciones de foto por lugar
-- Idempotente: usa UPDATE … WHERE para no afectar registros que ya tienen la foto correcta.

-- 1. Monumento a los Héroes de la Independencia (Humahuaca)
--    Asset disponible: humahuaca.jpg (Cabildo de Humahuaca, CC BY-SA 4.0 · César Pérez)
UPDATE lugar
SET foto = 'humahuaca.jpg'
WHERE slug = 'monumento-independencia-humahuaca'
  AND (foto IS NULL OR foto <> 'humahuaca.jpg');

-- 2. Laguna de los Pozuelos (Puna)
--    Se mantiene puna.jpg (imagen genérica de zona Puna) ya que no hay foto
--    verificada específica de este lugar disponible en los assets actuales.
--    La foto de zona es coherente con la región (no confunde zonas).
--    Nota: foto editorial pendiente de curaduría futura.
UPDATE lugar
SET foto = 'puna.jpg'
WHERE slug = 'laguna-de-los-pozuelos'
  AND (foto IS NULL OR foto <> 'puna.jpg');

-- 3. Abra Pampa (Puna)
--    Se mantiene puna.jpg como imagen representativa de la zona Puna.
--    Nota: foto específica de Abra Pampa pendiente de curaduría futura.
UPDATE lugar
SET foto = 'puna.jpg'
WHERE slug = 'abra-pampa'
  AND (foto IS NULL OR foto <> 'puna.jpg');

-- 4. La Quiaca (Puna)
--    Se mantiene puna.jpg como imagen representativa de la zona Puna.
--    Nota: foto específica de La Quiaca pendiente de curaduría futura.
UPDATE lugar
SET foto = 'puna.jpg'
WHERE slug = 'la-quiaca'
  AND (foto IS NULL OR foto <> 'puna.jpg');

-- 5. Paleta del Pintor (Quebrada) — foto NULL
--    Se asigna purmamarca.jpg como imagen de zona Quebrada.
--    La Paleta del Pintor está en Maimará, Quebrada de Humahuaca.
--    Nota: foto específica de la Paleta del Pintor pendiente de curaduría futura.
UPDATE lugar
SET foto = 'purmamarca.jpg'
WHERE slug = 'paleta-del-pintor'
  AND (foto IS NULL OR foto <> 'purmamarca.jpg');

-- 6. Termas de Caimancito (Yungas) — foto NULL
--    Se asigna calilegua.jpg como imagen de zona Yungas.
--    Nota: foto específica de Termas de Caimancito pendiente de curaduría futura.
UPDATE lugar
SET foto = 'calilegua.jpg'
WHERE slug = 'termas-de-caimancito'
  AND (foto IS NULL OR foto <> 'calilegua.jpg');

-- 7. San Francisco (Yungas) — foto NULL
--    Se asigna calilegua.jpg como imagen de zona Yungas.
--    Nota: foto específica de San Francisco (Yungas) pendiente de curaduría futura.
UPDATE lugar
SET foto = 'calilegua.jpg'
WHERE slug = 'san-francisco-yungas'
  AND (foto IS NULL OR foto <> 'calilegua.jpg');

-- 8. Termas de Reyes (Valles) — foto NULL
--    Se asigna salsaju.jpg como imagen de zona Valles (San Salvador de Jujuy).
--    Nota: foto específica de Termas de Reyes pendiente de curaduría futura.
UPDATE lugar
SET foto = 'salsaju.jpg'
WHERE slug = 'termas-de-reyes'
  AND (foto IS NULL OR foto <> 'salsaju.jpg');

-- 9. Lagunas de Yala (Valles) — foto NULL
--    Se asigna salsaju.jpg como imagen de zona Valles.
--    Nota: foto específica de Lagunas de Yala pendiente de curaduría futura.
UPDATE lugar
SET foto = 'salsaju.jpg'
WHERE slug = 'lagunas-de-yala'
  AND (foto IS NULL OR foto <> 'salsaju.jpg');
