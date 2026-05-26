import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-lg font-semibold text-gray-700">Something went wrong.</p>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
          >
            Go to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
