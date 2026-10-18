// Fallback de los formularios mientras se resuelve el pedido (Cache Components).
export function FormSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-4">
      <div className="h-8 w-1/2 rounded bg-line-soft" />
      <div className="h-12 rounded-[10px] bg-line-soft" />
      <div className="h-12 rounded-[10px] bg-line-soft" />
      <div className="h-12 rounded-[10px] bg-line-soft" />
    </div>
  );
}
