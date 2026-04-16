import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#fafafa] text-center">
                    <h1 className="text-3xl font-bold text-[#1a1a1a] mb-4">Something went wrong.</h1>
                    <p className="text-gray-600 mb-8 max-w-md">
                        We're sorry for the inconvenience. Please try refreshing the page or come back later.
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-[#D4AF37] text-white rounded-full font-bold hover:bg-[#b8962d] transition-colors"
                    >
                        Refresh Page
                    </button>
                </div>
            );
        }

        return this.props.children; 
    }
}

export default ErrorBoundary;
