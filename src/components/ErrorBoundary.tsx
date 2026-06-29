import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

/** Catches unhandled React render errors and shows them with a copy button. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null, copied: false };

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  private buildErrorText(): string {
    const { error, errorInfo } = this.state;
    const lines: string[] = [];
    if (error) {
      lines.push(`${error.name}: ${error.message}`);
      if (error.stack) lines.push(error.stack);
    }
    if (errorInfo?.componentStack) {
      lines.push("\nComponent stack:" + errorInfo.componentStack);
    }
    return lines.join("\n");
  }

  private handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(this.buildErrorText());
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const ta = document.createElement("textarea");
      ta.value = this.buildErrorText();
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error, errorInfo, copied } = this.state;

    if (!error) return this.props.children;

    const errorText = this.buildErrorText();

    return (
      <div className="error-boundary">
        <div className="error-boundary-card">
          <div className="error-boundary-icon">💥</div>
          <h2 className="error-boundary-title">Something crashed</h2>
          <p className="error-boundary-subtitle">
            {error.name}: {error.message}
          </p>

          <pre className="error-boundary-stack">{errorText}</pre>

          {errorInfo?.componentStack && (
            <details className="error-boundary-details">
              <summary>Component stack</summary>
              <pre>{errorInfo.componentStack}</pre>
            </details>
          )}

          <div className="error-boundary-actions">
            <button className="btn btn-primary" onClick={this.handleReload}>
              Reload app
            </button>
            <button
              className="btn btn-ghost"
              onClick={this.handleCopy}
            >
              {copied ? "✓ Copied!" : "Copy error"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
