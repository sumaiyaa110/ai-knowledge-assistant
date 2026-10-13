import { ImageResponse } from "next/og";

// The preview image shown when a link to the app is shared.
export const alt = "AI Knowledge Assistant: chat with your documents, entirely on your machine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#fafafa",
              color: "#0a0a0a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            K
          </div>
          AI Knowledge Assistant
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1 }}>
            Chat with your documents, entirely on your machine
          </div>
          <div style={{ fontSize: 30, color: "#a3a3a3" }}>
            Local RAG with Next.js, PostgreSQL + pgvector and Ollama
          </div>
        </div>
      </div>
    ),
    size,
  );
}
