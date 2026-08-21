import type { Language } from "@malvinas/simulation";

const copy: Record<Language, { eyebrow: string; title: string; body: string }> = {
  "es-AR": {
    eyebrow: "PROTOTIPO DE ARQUITECTURA · 1982",
    title: "MALVINAS",
    body: "La historia real será el punto de partida. El resultado de cada partida quedará en manos de quienes la juegan.",
  },
  "en-GB": {
    eyebrow: "ARCHITECTURE PROTOTYPE · 1982",
    title: "MALVINAS",
    body: "Real history is the starting point. Each match outcome will be shaped by the people playing it.",
  },
};

export default function Home() {
  const text = copy["es-AR"];

  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="lede">{text.body}</p>
        <div className="status" aria-label="Estado del prototipo">
          <span className="dot" />
          Contratos de simulación y bitácora inicializados
        </div>
        <p className="note">La cronología histórica verificada será incorporada en la siguiente etapa.</p>
      </section>
    </main>
  );
}
