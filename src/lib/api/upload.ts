import type { ApiError } from "@/models/auth";
import type { DocumentDTO } from "@/models/document";
import { describeHttpFailure, type ApiResult } from "./client";

/**
 * Upload one file to /api/documents. Uses XMLHttpRequest because fetch cannot
 * report upload progress.
 */
export function uploadDocument(
  file: File,
  onProgress: (percent: number) => void,
): Promise<ApiResult<{ document: DocumentDTO }>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const fail = (error: string) => resolve({ ok: false, error, fieldErrors: {} });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => fail("Could not reach the server");
    xhr.onabort = () => fail("Upload cancelled");
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON response, e.g. the server rejected the request body outright.
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve({ ok: true, data: body as { document: DocumentDTO } });
      } else if (xhr.status === 413) {
        fail((body as ApiError | null)?.error ?? "The file is too large.");
      } else {
        fail((body as ApiError | null)?.error ?? describeHttpFailure(xhr.status));
      }
    };

    const form = new FormData();
    form.append("file", file);
    xhr.open("POST", "/api/documents");
    xhr.send(form);
  });
}
