import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary Caught Error]:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={styles.heading}>Something went wrong</h2>
            <p style={styles.message}>
              {this.state.error?.message || "An unexpected error occurred. Please try again."}
            </p>
            <button style={styles.button} onClick={this.handleReset}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    padding: "20px",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "32px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    textAlign: "center",
    maxWidth: "480px",
    width: "100%",
  },
  heading: {
    color: "#e53e3e",
    marginBottom: "12px",
  },
  message: {
    color: "#4a5568",
    marginBottom: "24px",
    lineHeight: "1.5",
  },
  button: {
    backgroundColor: "#3182ce",
    color: "#ffffff",
    padding: "10px 24px",
    borderRadius: "6px",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default ErrorBoundary;
