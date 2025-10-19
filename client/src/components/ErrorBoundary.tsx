import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Suppress Google Translate DOM manipulation errors
    const isGoogleTranslateError = 
      error.name === 'NotFoundError' && 
      (error.message.includes('removeChild') || 
       error.message.includes('insertBefore'));

    if (isGoogleTranslateError) {
      console.warn('Google Translate DOM error suppressed:', error.message);
      // Reset error state to allow app to continue
      this.setState({ hasError: false });
      return;
    }

    // Log other errors normally
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}
