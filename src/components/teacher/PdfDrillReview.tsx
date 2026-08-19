import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { IconLabel } from '../a11y/IconLabel';

interface DrillItem {
  id?: string;
  band_index: number;
  item_order: number;
  syllable_pattern: string;
  word: string;
  image_url: string | null;
  xp_value: number;
}

interface DrillItemsResponse {
  material: { id: string; title: string; drill_status: string | null };
  items: DrillItem[];
}

interface PdfDrillReviewProps {
  materialId: string;
  onPublished: () => void;
}

// Mandatory review step for every parsed drill -- table parsing from a PDF is
// never 100% reliable, so nothing reaches students until a teacher confirms
// (or fixes) every row here and explicitly publishes.
export function PdfDrillReview({ materialId, onPublished }: PdfDrillReviewProps) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<DrillItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useQuery({
    queryKey: ['pdf-drill-items', materialId],
    queryFn: async () => {
      const res = await api<DrillItemsResponse>(`/teacher/pdf-drill/${materialId}/items`, { auth: true });
      setItems(res.items.map((i) => ({ ...i, image_url: i.image_url ?? null })));
      return res;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!items) return;
      await api(`/teacher/pdf-drill/${materialId}/items`, {
        method: 'PATCH',
        auth: true,
        body: { items },
      });
    },
    onError: (err: Error) => setError(err.message),
  });

  const publish = useMutation({
    mutationFn: async () => {
      await save.mutateAsync();
      await api(`/teacher/pdf-drill/${materialId}/publish`, { method: 'POST', auth: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-materials'] });
      onPublished();
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!items) return <p>Naglo-load...</p>;

  const updateItem = (index: number, patch: Partial<DrillItem>) => {
    setItems((prev) => prev!.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev!.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [
      ...(prev ?? []),
      { band_index: prev?.length ?? 0, item_order: prev?.length ?? 0, syllable_pattern: '', word: '', image_url: null, xp_value: 25 },
    ]);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[var(--color-text-muted)]">
        Suriin at itama ang bawat salita bago i-publish. Ang mga gumagana lang dito ang makikita ng mga mag-aaral.
      </p>

      {items.length === 0 && (
        <p className="rounded-lg bg-[var(--color-danger-soft)] px-4 py-2.5 text-sm text-[var(--color-danger)]">
          Walang na-detect na salita mula sa PDF na ito. Manu-manong magdagdag ng row sa ibaba.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={item.id ?? i} className="grid grid-cols-[1fr_1fr_5rem_auto] items-center gap-2 rounded-lg border border-white bg-white/60 p-2">
            <input
              value={item.syllable_pattern}
              onChange={(e) => updateItem(i, { syllable_pattern: e.target.value })}
              placeholder="pantig (hal. sa-ma)"
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
            />
            <input
              value={item.word}
              onChange={(e) => updateItem(i, { word: e.target.value })}
              placeholder="salita (hal. sama)"
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
            />
            <input
              type="number"
              min={1}
              value={item.xp_value}
              onChange={(e) => updateItem(i, { xp_value: Number(e.target.value) || 25 })}
              className="rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              aria-label="Alisin ang row na ito"
              className="rounded-full p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="self-start rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm hover:border-[var(--color-primary)]"
      >
        <IconLabel icon="➕" label="Magdagdag ng row" />
      </button>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-60"
        >
          {save.isPending ? 'Sine-save...' : 'I-save ang mga pagbabago'}
        </button>
        <button
          type="button"
          onClick={() => publish.mutate()}
          disabled={publish.isPending || items.length === 0}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {publish.isPending ? 'Nilalathala...' : 'I-publish'}
        </button>
      </div>
    </div>
  );
}
