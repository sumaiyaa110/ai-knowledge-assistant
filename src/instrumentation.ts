// Runs once when the Next.js server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { resumeInterruptedDocuments } = await import("@/lib/rag/queue");
  await resumeInterruptedDocuments().catch((error) =>
    console.error("Could not resume interrupted documents", error),
  );
}
