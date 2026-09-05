import type { Identified } from "./collection-policy";

/**
 * Referenced authors and speakers retain the credited order, regardless of
 * collection ordering. A known but unpublished target is omitted; a typo
 * remains an error. Publication itself is decided only by `isPublished`.
 */
export function resolvePublishedReferences<E extends Identified>(
  ids: readonly string[],
  known: ReadonlySet<string>,
  published: ReadonlyMap<string, E>,
  missing: (id: string) => Error,
): E[] {
  const resolved: E[] = [];
  for (const id of ids) {
    if (!known.has(id)) throw missing(id);
    const entry = published.get(id);
    if (entry) resolved.push(entry);
  }
  return resolved;
}
