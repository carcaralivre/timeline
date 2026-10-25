import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PALETTE_SIZE, fromInputDate, toInputDate, type TimelineItem } from "@/lib/timeline";

type Props = {
  item: TimelineItem | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (item: TimelineItem) => void;
  onDelete: (id: string) => void;
};

export function EventDialog({ item, isNew, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<TimelineItem | null>(item);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setDraft(item);
    setConfirming(false);
  }, [item]);

  if (!draft) return null;
  const valid = draft.label.trim().length > 0 && draft.end > draft.start;

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "Novo evento" : "Editar evento"}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onSave({ ...draft, label: draft.label.trim() });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted-foreground">Nome</span>
            <input
              autoFocus
              className="tl-input"
              placeholder="Ex.: Mudança para Suíça"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[13px] text-muted-foreground">Início</span>
              <input
                type="date"
                className="tl-input"
                value={toInputDate(draft.start)}
                onChange={(e) => e.target.value && setDraft({ ...draft, start: fromInputDate(e.target.value) })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[13px] text-muted-foreground">Fim</span>
              <input
                type="date"
                className="tl-input"
                value={toInputDate(draft.end)}
                onChange={(e) => e.target.value && setDraft({ ...draft, end: fromInputDate(e.target.value) })}
              />
            </label>
          </div>
          {draft.end <= draft.start && (
            <span className="text-[13px] text-destructive">O fim precisa ser depois do início.</span>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-muted-foreground">Cor</span>
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: PALETTE_SIZE }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Cor ${i + 1}`}
                  data-active={draft.color === i}
                  className="tl-swatch"
                  style={{ background: `var(--ev-${i})` }}
                  onClick={() => setDraft({ ...draft, color: i })}
                />
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            {!isNew ? (
              confirming ? (
                <div className="flex items-center gap-2">
                  <button type="button" className="tl-btn-danger" onClick={() => onDelete(draft.id)}>
                    Confirmar exclusão
                  </button>
                  <button type="button" className="tl-btn-ghost" onClick={() => setConfirming(false)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button type="button" className="tl-btn-danger" onClick={() => setConfirming(true)}>
                  <Trash2 size={16} strokeWidth={1.5} /> Excluir
                </button>
              )
            ) : (
              <span />
            )}
            {!confirming && (
              <button type="submit" className="tl-btn-primary disabled:opacity-40" disabled={!valid}>
                Salvar
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
