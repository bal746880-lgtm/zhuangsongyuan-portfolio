import type { MediaFile, MediaFolder } from "../data/media";
import { sortByLeadingNumber } from "./mediaSort";

export function imagesIn(folder?: MediaFolder): MediaFile[] {
  return sortByLeadingNumber(
    folder?.files.filter((file) => file.kind === "image") ?? [],
  );
}

export function videosIn(folder?: MediaFolder): MediaFile[] {
  return sortByLeadingNumber(
    folder?.files.filter((file) => file.kind === "video") ?? [],
  );
}

export function imageTitle(file: MediaFile, index: number): string {
  const base = file.name.replace(/\.[^.]+$/, "");
  if (/^\d+$/.test(base)) return `图 ${String(index + 1).padStart(2, "0")}`;
  return base.replace(/^\d+[-_\s]*/, "").replaceAll("_", " ");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}
