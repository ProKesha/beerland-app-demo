import { Component, type ReactNode } from 'react';
import { StoreMap } from './StoreMap';
import type { StoreMapProps } from './types';
class MapBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function SafeStoreMap(props: StoreMapProps) {
  return (
    <MapBoundary onError={props.onError}>
      <StoreMap {...props} />
    </MapBoundary>
  );
}
