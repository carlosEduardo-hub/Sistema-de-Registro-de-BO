import { Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function NetworkStatusIndicator() {
  const { isOnline } = useNetworkStatus();

  const styles = isOnline
    ? {
        iconColor: 'text-emerald-600',
        ring: 'ring-emerald-300',
        bg: 'bg-emerald-50',
        label: 'Conectado',
        description: 'Envios e sincronização automática habilitados.',
        Icon: Wifi,
      }
    : {
        iconColor: 'text-amber-600',
        ring: 'ring-amber-300',
        bg: 'bg-amber-50',
        label: 'Sem conexão',
        description: 'Registros serão salvos localmente e enviados ao reconectar.',
        Icon: WifiOff,
      };

  const { Icon } = styles;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          title={`${styles.label} — ${styles.description}`}
          aria-label={styles.label}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 ${styles.bg} ${styles.ring} ring-1 transition-colors`}
        >
          <Icon className={`h-4 w-4 ${styles.iconColor}`} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="text-sm">
        <div className="flex items-start gap-2">
          <Icon className={`h-4 w-4 ${styles.iconColor}`} aria-hidden="true" />
          <div>
            <div className="font-medium">{styles.label}</div>
            <div className="text-muted-foreground text-xs">{styles.description}</div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}