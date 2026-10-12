"use client";

import { AlertCircle, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadDocument } from "@/lib/api/upload";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ACCEPT_ATTRIBUTE,
  getFileType,
  type DocumentDTO,
  type StorageUsage,
} from "@/models/document";

type UploadItem = {
  id: number;
  name: string;
  size: number;
  progress: number;
  error?: string;
};

type DocumentUploaderProps = {
  maxFileBytes: number;
  storage: StorageUsage;
  onUploaded: (document: DocumentDTO) => void;
};

/** Checks that can be done before sending anything. The server repeats them. */
function validate(file: File, maxFileBytes: number, remainingBytes: number): string | null {
  if (!getFileType(file.name)) return "Unsupported file type. Use PDF, TXT or Markdown.";
  if (file.size === 0) return "The file is empty.";
  if (file.size > maxFileBytes) {
    return `Too large (${formatBytes(file.size)}). The limit is ${formatBytes(maxFileBytes)}.`;
  }
  if (file.size > remainingBytes) return "Not enough storage left for this file.";
  return null;
}

export function DocumentUploader({ maxFileBytes, storage, onUploaded }: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);

  const update = (id: number, patch: Partial<UploadItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const remove = (id: number) => setItems((current) => current.filter((item) => item.id !== id));

  async function handleFiles(files: File[]) {
    let remaining = storage.quotaBytes - storage.usedBytes;
    const queued = files.map((file) => {
      const error = validate(file, maxFileBytes, remaining);
      if (!error) remaining -= file.size;
      return { file, item: { id: nextId.current++, name: file.name, size: file.size, progress: 0, error: error ?? undefined } };
    });
    setItems((current) => [...current, ...queued.map(({ item }) => item)]);

    // One at a time, so progress is easy to follow and the quota check on the
    // server always sees the previous file.
    for (const { file, item } of queued) {
      if (item.error) continue;
      const result = await uploadDocument(file, (progress) => update(item.id, { progress }));
      if (result.ok) {
        remove(item.id);
        onUploaded(result.data.document);
      } else {
        update(item.id, { error: result.error });
      }
    }
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload documents"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFiles([...event.dataTransfer.files]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-4 py-10 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          dragging ? "border-primary bg-muted" : "hover:bg-muted/50",
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Upload className="size-5 text-muted-foreground" />
        </span>
        <p className="mt-3 text-sm font-medium">
          {dragging ? "Drop to upload" : "Drag files here, or click to browse"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          PDF, TXT or Markdown, up to {formatBytes(maxFileBytes)} each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            void handleFiles([...(event.target.files ?? [])]);
            event.target.value = ""; // allow choosing the same file again
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="space-y-2" aria-label="Uploads in progress">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border bg-card px-3 py-2.5">
              <div className="flex items-center gap-3">
                {item.error && <AlertCircle className="size-4 shrink-0 text-destructive" />}
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</p>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {item.error ? formatBytes(item.size) : `${item.progress}%`}
                </span>
                {item.error && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Dismiss ${item.name}`}
                    onClick={() => remove(item.id)}
                  >
                    <X />
                  </Button>
                )}
              </div>
              {item.error ? (
                <p role="alert" className="mt-1 text-sm text-destructive">
                  {item.error}
                </p>
              ) : (
                <div
                  role="progressbar"
                  aria-label={`Uploading ${item.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.progress}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
