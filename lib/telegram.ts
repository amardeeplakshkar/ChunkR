// lib/telegram.ts
// Core Telegram storage service
// Telegram bot API limits: 50MB per file via sendDocument
// For larger files, we split into 45MB chunks

import { Readable } from "stream";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const FILE_URL = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

const CHUNK_SIZE = 45 * 1024 * 1024; // 45MB per chunk (safe under 50MB limit)

export interface TelegramUploadResult {
  telegramFileId: string;
  telegramMsgId: number;
  chatId: string;
  size: number;
}

export interface TelegramMultipartUploadResult {
  parts: TelegramUploadResult[];
  totalSize: number;
}

// ─── Upload ────────────────────────────────────────────────────────────────

/**
 * Upload a single file buffer to Telegram.
 * Returns the file_id, message_id, and chat_id.
 */
export async function uploadToTelegram(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<TelegramUploadResult> {
  const formData = new FormData();
  formData.append("chat_id", CHAT_ID);
  formData.append(
    "document",
    new Blob([new Uint8Array(buffer)], { type: mimeType }),
    filename
  );
  // Hide caption so the channel looks clean
  formData.append("caption", `📦 ${filename}`);

  const res = await fetch(`${BASE_URL}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram upload failed: ${err}`);
  }

  const data = await res.json();
  const msg = data.result;

  // Telegram returns different fields depending on the media type.
  // We always use sendDocument, but for safety extract from whichever field exists.
  const media =
    msg.document ??
    msg.video    ??
    msg.audio    ??
    msg.photo?.[msg.photo.length - 1] ?? // photo is an array of sizes
    msg.animation ??
    msg.voice ??
    msg.video_note;

  if (!media) {
    throw new Error(
      `Telegram upload succeeded but returned no media object. Full response: ${JSON.stringify(msg)}`
    );
  }

  return {
    telegramFileId: media.file_id,
    telegramMsgId: msg.message_id,
    chatId: String(CHAT_ID),
    size: media.file_size ?? buffer.byteLength,
  };
}

/**
 * Upload a large file by splitting it into chunks.
 * Each chunk is uploaded separately and stored as a FilePart.
 */
export async function uploadMultipart(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<TelegramMultipartUploadResult> {
  const parts: TelegramUploadResult[] = [];
  let offset = 0;
  let partNumber = 0;

  while (offset < buffer.byteLength) {
    const chunk = Buffer.from(buffer.subarray(offset, offset + CHUNK_SIZE));
    const partName = `${filename}.part${String(partNumber).padStart(4, "0")}`;
    const result = await uploadToTelegram(chunk, partName, "application/octet-stream");
    parts.push(result);
    offset += CHUNK_SIZE;
    partNumber++;
  }

  return { parts, totalSize: buffer.byteLength };
}

// ─── Download ──────────────────────────────────────────────────────────────

/**
 * Get a temporary download URL for a Telegram file.
 * Telegram file links expire after ~1 hour.
 */
export async function getTelegramFileUrl(telegramFileId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/getFile?file_id=${telegramFileId}`);
  if (!res.ok) {
    throw new Error(`Failed to get file info: ${await res.text()}`);
  }
  const data = await res.json();
  const filePath = data.result.file_path;
  return `${FILE_URL}/${filePath}`;
}

/**
 * Download a file from Telegram as a Buffer.
 */
export async function downloadFromTelegram(telegramFileId: string): Promise<Buffer> {
  const url = await getTelegramFileUrl(telegramFileId);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download from Telegram: ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Download and reassemble a multipart file from Telegram.
 */
export async function downloadMultipart(
  parts: { telegramFileId: string; partNumber: number }[]
): Promise<Buffer> {
  const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  const buffers = await Promise.all(
    sorted.map((p) => downloadFromTelegram(p.telegramFileId))
  );
  return Buffer.concat(buffers);
}

// ─── Delete ────────────────────────────────────────────────────────────────

/**
 * Delete a message (and its file) from Telegram.
 */
export async function deleteFromTelegram(telegramMsgId: number, chatId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: telegramMsgId }),
  });

  if (!res.ok) {
    // Silently fail — message may already be deleted
    console.warn(`Telegram delete warning: ${await res.text()}`);
  }
}

/**
 * Delete all parts of a multipart file.
 */
export async function deleteMultipartFromTelegram(
  parts: { telegramMsgId: number; chatId: string }[]
): Promise<void> {
  await Promise.allSettled(
    parts.map((p) => deleteFromTelegram(p.telegramMsgId, p.chatId))
  );
}

// ─── Utility ───────────────────────────────────────────────────────────────

export function isMultipart(sizeBytes: number): boolean {
  return sizeBytes > CHUNK_SIZE;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}