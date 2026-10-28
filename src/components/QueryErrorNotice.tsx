export function QueryErrorNotice({ error, onRetry, message = 'Hindi ma-load ang ilang impormasyon. Pakisubukang muli.' }: { error: unknown; onRetry: () => void; message?: string }) {
  if (!error) return null;
  return <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"><p>{message}</p><button type="button" onClick={onRetry} className="mt-2 min-h-11 rounded-xl border border-red-400 bg-white px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2">Subukan muli</button></div>;
}
