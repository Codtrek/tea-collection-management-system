import NetInfo from '@react-native-community/netinfo';

import { evidenceSyncService } from '@/services';

// Flushes the offline evidence-upload queue whenever the device transitions from
// offline -> online. Not unit tested: the DI-testable logic lives in evidenceSyncService
// (see evidenceSyncService.test.ts); this file is a thin wiring layer around a native module.
export function startConnectivitySync(): () => void {
  let wasOffline = false;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected);
    if (online && wasOffline) {
      evidenceSyncService.flushQueue().catch(() => {
        // Retried on the next reconnect event; failed items stay queued in sync_queue.
      });
    }
    wasOffline = !online;
  });

  return unsubscribe;
}
