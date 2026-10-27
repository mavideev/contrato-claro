// Aviso legal, visible (no letra chica) en toda pantalla que muestre un
// resultado del análisis: vista previa, informe y re-chequeo.
export function LegalDisclaimer() {
  return (
    <div role="note" className="flex items-start gap-3 rounded-[14px] border border-attention-bg bg-attention-bg px-4 py-3.5 text-attention-fg md:px-5 md:py-4">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
      <p className="text-sm leading-normal md:text-[15px]">
        <strong>Esto no es un consejo legal.</strong> Es un análisis automático hecho con inteligencia artificial, que puede tener errores o quedar desactualizado. Antes de decidir algo a partir de este informe — firmar, rescindir, reclamar o dejar de pagar algo — consultá con un abogado o escribano.
      </p>
    </div>
  );
}
