// hooks/useUpload.ts
"use client";
import { useState, useCallback, useRef } from "react";

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export interface UploadedFile {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  result?: UploadedFile;
}

// Keep each request well under Next.js's 10 MB hard cap
const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB

export function useUpload(folderId?: string) {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const startedIds = useRef<Set<string>>(new Set());

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const uploadFile = useCallback(async (item: UploadItem) => {
    // StrictMode guard
    if (startedIds.current.has(item.id)) return;
    startedIds.current.add(item.id);

    updateItem(item.id, { status: "uploading", progress: 0 });

    const { file } = item;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const isSingle = totalChunks === 1;

    try {
      let dbFileId: string | undefined;

      for (let i = 0; i < totalChunks; i++) {
        const start  = i * CHUNK_SIZE;
        const end    = Math.min(start + CHUNK_SIZE, file.size);
        const chunk  = file.slice(start, end);
        const buffer = await chunk.arrayBuffer();

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Track per-chunk progress, map to overall progress
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const chunkDone   = i + e.loaded / e.total;
              const totalProgress = Math.round((chunkDone / totalChunks) * 100);
              updateItem(item.id, { progress: totalProgress });
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              // Save the DB file ID returned by the first chunk
              if (i === 0 && data.fileId) dbFileId = data.fileId;
              if (data.done && data.file) {
                updateItem(item.id, { status: "success", progress: 100, result: data.file });
              }
              resolve();
            } else {
              try {
                reject(new Error(JSON.parse(xhr.responseText).error ?? "Upload failed"));
              } catch {
                reject(new Error(`HTTP ${xhr.status}`));
              }
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Network error")));
          xhr.addEventListener("abort", () => reject(new Error("Aborted")));

          xhr.open("POST", "/api/files/upload");

          // ── Headers ──
          if (isSingle) {
            xhr.setRequestHeader("x-upload-mode",  "single");
          } else {
            xhr.setRequestHeader("x-upload-mode",  "chunk");
            xhr.setRequestHeader("x-chunk-index",  String(i));
            xhr.setRequestHeader("x-total-chunks", String(totalChunks));
            if (i > 0 && dbFileId) {
              xhr.setRequestHeader("x-file-id", dbFileId);
            }
          }

          // Send file metadata only on first chunk (or single)
          if (i === 0 || isSingle) {
            xhr.setRequestHeader("x-file-name",  encodeURIComponent(file.name));
            xhr.setRequestHeader("x-file-size",  String(file.size));
            xhr.setRequestHeader("x-mime-type",  file.type || "application/octet-stream");
            if (folderId) xhr.setRequestHeader("x-folder-id", folderId);
          }

          xhr.setRequestHeader("Content-Type", "application/octet-stream");
          xhr.send(buffer);
        });
      }

      // Ensure success state even if last-chunk response didn't include file object
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id && q.status !== "success"
            ? { ...q, status: "success" as UploadStatus, progress: 100 }
            : q
        )
      );

    } catch (err: any) {
      updateItem(item.id, { status: "error", error: err.message });
    }
  }, [folderId, updateItem]);

  const addFiles = useCallback((files: File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;

    const newItems: UploadItem[] = arr.map((file) => ({
      id:       `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status:   "idle" as UploadStatus,
    }));

    setQueue((prev) => [...prev, ...newItems]);        // pure state update
    newItems.forEach((item) => uploadFile(item));       // side effects outside updater
  }, [uploadFile]);

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((i) => i.status === "uploading" || i.status === "idle"));
  }, []);

  const reset = useCallback(() => {
    startedIds.current.clear();
    setQueue([]);
  }, []);

  const isUploading  = queue.some((i) => i.status === "uploading");
  const successCount = queue.filter((i) => i.status === "success").length;
  const errorCount   = queue.filter((i) => i.status === "error").length;

  return { queue, addFiles, clearCompleted, reset, isUploading, successCount, errorCount };
}