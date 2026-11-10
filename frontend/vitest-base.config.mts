import { defineConfig } from 'vitest/config';

// Config base de Vitest para `ng test` (Angular unit-test builder, runnerConfig).
// Los tests de componentes pesan con la máquina cargada (workers en paralelo);
// 5s por defecto es frágil. 20s da margen sin ocultar tests realmente colgados.
export default defineConfig({
  test: {
    testTimeout: 20000,
  },
});
