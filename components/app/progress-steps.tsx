// Pasos del análisis (prototipo 4 · Análisis y pago). `active` = índice del
// paso en curso; con active >= steps.length, todos quedan hechos.
export function ProgressSteps({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="flex flex-col gap-3.5 md:gap-[18px]">
      {steps.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={label} className={`flex items-center gap-3.5 text-base md:gap-4 md:text-lg ${done || current ? "text-ink" : "text-[#7B8794]"}`}>
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                done ? "bg-ok" : current ? "bg-primary shadow-[0_0_0_6px_#CDE8E6]" : "border-2 border-line bg-surface"
              }`}
            >
              {done && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              )}
            </span>
            {label}
            <span className="sr-only">{done ? "(hecho)" : current ? "(en curso)" : "(pendiente)"}</span>
          </li>
        );
      })}
    </ol>
  );
}
