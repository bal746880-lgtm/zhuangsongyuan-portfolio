import { useEffect, useState } from "react";
import type { PortfolioManifest } from "../data/media";

interface ManifestState {
  manifest: PortfolioManifest | null;
  error: string | null;
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
      .then((manifest) => setState({ manifest, error: null }))
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
