import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class RootErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Error inesperado en la interfaz',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('VORA TV OS ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#080A0E] text-white flex flex-col items-center justify-center p-8 text-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">VORA TV OS</h1>
          <p className="text-sm text-zinc-400 max-w-md">{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full bg-white text-zinc-950 text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Reiniciar launcher
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
