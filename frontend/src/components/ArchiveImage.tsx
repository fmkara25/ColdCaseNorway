import { isArchiveImagePath } from "./imagePath";
import { useState } from "react";

export function ArchiveImage({ src, name, landscape = false, compact = false }: {
  src?: string | null; name: string; landscape?: boolean; compact?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  const available = typeof src === "string" && isArchiveImagePath(src) && failed !== src;
  return <figure className={`archive-image ${landscape ? "landscape" : "portrait"} ${compact ? "compact" : ""}`}>
    {available ? <img src={src} alt={compact ? "" : `Illustrasjon: ${name}`} loading="lazy" width={landscape ? 1536 : 1064} height={landscape ? 1024 : 1478} onError={() => setFailed(src)} /> :
      <span className="image-fallback" aria-label={compact ? undefined : `Ingen illustrasjon av ${name}`} aria-hidden={compact || undefined}>{landscape ? "SAKSARKIV" : name.split(" ").map(part => part[0]).join("")}</span>}
    {available && !compact && <figcaption>Illustrasjon – ikke et bevis</figcaption>}
  </figure>;
}
