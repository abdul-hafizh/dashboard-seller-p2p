"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

interface Model3DViewerProps {
  src: string;
  alt?: string;
  className?: string;
}

/** Interactive, draggable-to-rotate 3D preview — same `<model-viewer>` web
 * component the mobile app uses. `src` must come from our own API proxy
 * (Meshy's CDN sends no CORS headers, so the browser can't fetch it directly).
 *
 * `@google/model-viewer` touches `Document`/`HTMLElement` at import time to
 * register the custom element, which crashes Next's server-side render of
 * this "use client" component — so it's imported lazily inside an effect,
 * never at module scope, and only ever runs in the browser after mount. */
export function Model3DViewer({ src, alt, className }: Model3DViewerProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@google/model-viewer").then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className={className} style={{ width: "100%", height: "100%" }}>
        <div className="flex size-full items-center justify-center">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <model-viewer
      src={src}
      alt={alt ?? "Model 3D"}
      auto-rotate
      camera-controls
      exposure="0.75"
      shadow-intensity="1"
      shadow-softness="1"
      background-color="transparent"
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
