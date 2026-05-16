import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Caught in ErrorBoundary:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '8px', margin: '20px' }}>
                    <h2 style={{ color: '#cf1322' }}>Something went wrong in this section.</h2>
                    <p style={{ color: '#5c2018' }}>The rest of the app is still working. Please refresh the page or contact support.</p>
                    <pre style={{ fontSize: '12px', textAlign: 'left', background: '#ffe6e6', padding: '10px', overflowX: 'auto', borderRadius: '4px' }}>
                        {this.state.errorInfo?.componentStack || "Unknown Component Error"}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
