import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return <main className="app-shell"><section className="panel single-panel"><h1>Companion could not open</h1><p>Your campaign data may be malformed. Exported saves remain safe; reload the extension and try importing a previous backup.</p><button onClick={() => location.reload()}>Reload companion</button></section></main>;
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(<AppErrorBoundary><React.StrictMode><App /></React.StrictMode></AppErrorBoundary>);
