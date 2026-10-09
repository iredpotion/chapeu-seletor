import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // base relativa: o dist/ funciona em qualquer subpasta de um servidor estatico
  // (npm run preview, python3 -m http.server). Aberto direto pelo file:// o
  // navegador bloqueia os scripts de modulo e a pagina fica em branco.
  base: "./",
  plugins: [react()],
  build: {
    // o pedaco 3D (three + fiber) passa de 500 kB, mas so carrega depois da
    // interface, sob demanda
    chunkSizeWarningLimit: 1000,
  },
  server: {
    open: true,
    host: true, // permite abrir pelo celular na mesma rede Wi-Fi
  },
});
