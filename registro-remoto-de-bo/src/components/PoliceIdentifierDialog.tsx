import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/** Exemplos aceitos pelo mock do backend (services/police.ts) — para testes. */
const EXAMPLE_POLICE_IDENTIFIERS = [
  'PM-0001',
  'PM-1234',
  'PM-9999',
  '100001',
  '200123',
] as const;

interface PoliceIdentifierDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (policeIdentifier: string, clearInput: () => void, reason?: string) => void;
  title?: string;
  description?: string;
  showReason?: boolean;
}

export function PoliceIdentifierDialog({ 
  open, 
  onClose, 
  onConfirm, 
  title = 'Identificação do Policial', 
  description = 'Informe o número de identificação do policial para confirmar a ação.',
  showReason = false
}: PoliceIdentifierDialogProps) {
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) {
      setValue('');
      setReason('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (!value.trim()) return; // exige não vazio
    if (showReason && reason.trim().length < 5) return; // validação básica motivo

    const clearInput = () => {
      setValue('');
      setReason('');
    };
    onConfirm(value.trim(), clearInput, reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 py-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="police_identifier" className="text-sm font-medium">
                Número de identificação
              </label>
              <Input
                id="police_identifier"
                placeholder="Ex.: PM-0001"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">
                  Exemplos para teste:
                </p>
                <div className="flex flex-wrap gap-1">
                  {EXAMPLE_POLICE_IDENTIFIERS.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setValue(example)}
                      className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Obrigatório. Apenas confirme se o policial está autorizado.
              </p>
            </div>

            {showReason && (
              <div className="space-y-2">
                <label htmlFor="reason" className="text-sm font-medium">
                  Motivo da Exclusão
                </label>
                <Input
                  id="reason"
                  placeholder="Ex.: Duplicidade, Erro de digitação..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Obrigatório (mín. 5 caracteres).
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!value.trim() || (showReason && reason.trim().length < 5)}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}