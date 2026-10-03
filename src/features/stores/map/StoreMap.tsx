import { useStoreClock } from '../useStoreClock';
import { isStoreOpenNow } from '../hours';
import { useEffect, useMemo, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { mapDocument } from './document';
import type { StoreMapProps } from './types';
/** Native adapter: Expo-compatible WebView hosts the replaceable open-map provider. */
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
  const webview = useRef<WebView>(null);
  const source = useMemo(() => ({ html: mapDocument({ stores }) }), [stores]);
  const script = `window.updateSelection && window.updateSelection(${JSON.stringify(selectedStoreId)},${JSON.stringify(highlightedStoreId)},${statuses});true;`;
  useEffect(() => {
    webview.current?.injectJavaScript(script);
  }, [script]);
  return (
    <WebView
      ref={webview}
      source={source}
      originWhitelist={['*']}
      style={{ height: 320, flex: 0 }}
      scrollEnabled={false}
      onError={onError}
      onHttpError={onError}
      onContentProcessDidTerminate={onError}
      onRenderProcessGone={onError}
      onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data);
          if (message.type === 'error') onError();
          if (message.type === 'ready') {
            ready.current = true;
            webview.current?.injectJavaScript(script);
          }
          if (
            message.type === 'select' &&
            stores.some((s) => s.id === message.id)
          )
            onSelectStore(message.id);
        } catch {
          onError();
        }
      }}
    />
  );
}
