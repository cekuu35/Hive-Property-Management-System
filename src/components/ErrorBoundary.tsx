import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Something went wrong</p>
                  <p className="text-sm">
                    An error occurred while rendering this component. Please try refreshing the page.
                  </p>
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Error Details (Development)
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {this.state.error.toString()}
                        {this.state.errorInfo?.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                className="flex-1"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
