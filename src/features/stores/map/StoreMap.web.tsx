import { useStoreClock } from '../useStoreClock';
import { isStoreOpenNow } from '../hours';
import { useEffect, useMemo, useRef } from 'react';
import { mapDocument } from './document';
import type { StoreMapProps } from './types';
import { radius } from '@/theme/tokens';
export function StoreMap({
  stores,
  selectedStoreId,
  highlightedStoreId,
  onSelectStore,
  onError,
}: StoreMapProps) {
  const now = useStoreClock();
  const statuses = JSON.stringify(
    Object.fromEntries(
      stores.map((store) => [store.id, isStoreOpenNow(store, now)]),
    ),
  );
  const ready = useRef(false);
  const failure = useRef(onError);
  useEffect(() => {
    failure.current = onError;
  }, [onError]);
  useEffect(() => {
    ready.current = false;
    const timer = setTimeout(() => {
      if (!ready.current) failure.current();
    }, 20_000);
    return () => clearTimeout(timer);
  }, [stores]);
  const frame = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => mapDocument({ stores }), [stores]);
  useEffect(() => {
    const update = () =>
      frame.current?.contentWindow?.postMessage(
        JSON.stringify({
          type: 'selection',
          selected: selectedStoreId,
          highlighted: highlightedStoreId,
          statuses: JSON.parse(statuses),
        }),
        '*',
      );
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'error') onError();
        if (message.type === 'ready') {
          ready.current = true;
          update();
        }
        if (
          message.type === 'select' &&
          stores.some((s) => s.id === message.id)
        )
          onSelectStore(message.id);
      } catch {
        /* Ignore unrelated messages. */
      }
    };
    update();
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [
    stores,
    selectedStoreId,
    highlightedStoreId,
    onError,
    onSelectStore,
    statuses,
  ]);
  return (
    <iframe
      ref={frame}
      title="Карта магазинів Beerland"
      srcDoc={html}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      onError={onError}
      style={{
        width: '100%',
        height: 320,
        border: 0,
        borderRadius: radius.lg,
        display: 'block',
      }}
    />
  );
}
