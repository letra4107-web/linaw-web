import { Component, type ReactNode } from 'react';
import { BrandedStatus } from './BrandedStatus';

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <BrandedStatus error="Hindi ma-load ang pahina. Suriin ang koneksyon at subukan muli." onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
