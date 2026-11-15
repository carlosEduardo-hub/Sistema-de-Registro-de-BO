import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { listPendingBos, buildSyncPayload, removePendingBo, markFailed } from '@/lib/offlineStore';

import { syncBoletins } from '@/api/registerBoAPI';
import { toast } from 'sonner';

export function useBoSync() {
  const { isOnline } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);
  const queryClient = useQueryClient();

  const triggerSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const items = await listPendingBos();
      if (!items.length) return;
      const payload = await buildSyncPayload(items);
      const res = await syncBoletins(payload);
      // Process synced
      for (const ok of res.synced) {
        // Save mapping localId -> serverId for later edits
        // Mapeamento de ID removido
        await removePendingBo(ok.localId);
      }
      if (res.synced.length) {
        toast.success(`Sincronizados: ${res.synced.length}`);
        // Atualiza lista de registros
        queryClient.invalidateQueries({ queryKey: ['registerBos'] });
      }
      // Process failed
      for (const fail of res.failed) {
        await markFailed(fail.localId, fail.error || 'Erro desconhecido');
      }
      if (res.failed.length) {
        toast.warning(`Falhas: ${res.failed.length} — verifique a fila no Histórico.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar pendentes. Nova tentativa ao reconectar.';
      toast.error(msg);
      console.error(err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [queryClient]);

  useEffect(() => {
    if (isOnline) {
      // Pequena espera para garantir que a rede estabilizou
      const t = setTimeout(() => {
        triggerSync();
      }, 800);
      return () => clearTimeout(t);
    }
  }, [isOnline, triggerSync]);

  return { isSyncing, triggerSync };
}