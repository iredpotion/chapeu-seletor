import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // base relativa: assim o "npm run build" gera uma pasta dist/ que funciona
  // ate abrindo o index.html direto com dois cliques, sem servidor.
  base: "./",
  plugins: [react()],
  server: {
    open: true,
    host: true, // permite abrir pelo celular na mesma rede Wi-Fi
  },
});
