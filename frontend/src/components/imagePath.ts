// Only bundled, same-origin illustrations are allowed; never load remote tracking URLs.
export function isArchiveImagePath(value: unknown): value is string | null | undefined {
  return value == null || (typeof value === "string" && /^\/images\/[a-z0-9]+(?:[-/][a-z0-9]+)*\.webp$/.test(value));
}

