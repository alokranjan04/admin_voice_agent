import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        const { hasError, error } = this.state;

        if (hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
                        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
                            <p className="text-slate-500 text-sm">
                                The application encountered an unexpected error. Please try refreshing the page.
                            </p>
                        </div>
                        {error && (
                            <div className="bg-slate-50 p-4 rounded-lg text-left overflow-auto max-h-32 border border-slate-100">
                                <code className="text-[10px] text-rose-700 whitespace-pre">
                                    {(error as any).message}
                                </code>
                            </div>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
