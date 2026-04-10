import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      message: ""
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unknown renderer error"
    };
  }

  componentDidCatch(error) {
    console.error("Renderer crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            minHeight: "100vh",
            margin: 0,
            display: "grid",
            placeItems: "center",
            padding: "32px",
            background:
              "linear-gradient(135deg, #f6f4ef 0%, #ece7df 45%, #f7f5f1 100%)",
            color: "#242426",
            fontFamily: "\"Segoe UI\", system-ui, sans-serif"
          }}
        >
          <section
            style={{
              width: "min(720px, 100%)",
              padding: "28px",
              borderRadius: "24px",
              border: "1px solid rgba(36, 36, 38, 0.08)",
              background: "rgba(255,255,255,0.82)",
              boxShadow: "0 24px 80px rgba(28, 27, 25, 0.12)"
            }}
          >
            <p style={{ margin: "0 0 12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#6e675f" }}>
              Renderer error
            </p>
            <h1 style={{ margin: "0 0 12px", fontSize: "2rem", lineHeight: 1 }}>
              The app hit a startup error.
            </h1>
            <p style={{ margin: 0, lineHeight: 1.7 }}>
              {this.state.message || "The interface crashed before it could finish loading."}
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
