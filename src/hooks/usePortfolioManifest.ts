import { useEffect, useState } from "react";
import type {
  MediaFile,
  MediaFolder,
  PortfolioManifest,
} from "../data/media";

interface ManifestState {
  manifest: PortfolioManifest | null;
  error: string | null;
}

function normalizeFile(file: MediaFile): MediaFile {
  const src = file.src ?? file.url;
  return {
    ...file,
    src,
    url: src,
    alt: file.alt ?? file.name.replace(/\.[^.]+$/, ""),
    aspectRatio:
      file.aspectRatio ??
      (file.width && file.height ? file.width / file.height : undefined),
    originalPath: file.originalPath ?? src,
    optimizedPath: file.optimizedPath ?? null,
    optimizedFormat: file.optimizedFormat ?? null,
  };
}

function normalizeFolder(folder: MediaFolder): MediaFolder {
  return {
    ...folder,
    files: folder.files.map(normalizeFile),
    children: folder.children.map(normalizeFolder),
  };
}

function normalizeManifest(manifest: PortfolioManifest): PortfolioManifest {
  return {
    ...manifest,
    chapters: Object.fromEntries(
      Object.entries(manifest.chapters).map(([name, folder]) => [
        name,
        normalizeFolder(folder),
      ]),
    ),
  };
}

export function usePortfolioManifest(): ManifestState {
  const [state, setState] = useState<ManifestState>({
    manifest: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/portfolio/manifest.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<PortfolioManifest>;
      })
      .then((manifest) =>
        setState({ manifest: normalizeManifest(manifest), error: null }),
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          manifest: null,
          error: "素材清单读取失败，请先运行素材同步脚本。",
        });
      });

    return () => controller.abort();
  }, []);

  return state;
}
