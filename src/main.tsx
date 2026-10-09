import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error('Elemento #root não encontrado no index.html');
const raiz = createRoot(container);

// A vitrine do portfolio (VITE_VITRINE=1) nao leva o App: sem audio pre-carregado e sem perguntas.
const carregar = import.meta.env.VITE_VITRINE === "1" ? import("./Vitrine") : import("./App");
void carregar.then(({ default: Raiz }) => {
  raiz.render(
    <React.StrictMode>
      <Raiz />
    </React.StrictMode>
  );
});
