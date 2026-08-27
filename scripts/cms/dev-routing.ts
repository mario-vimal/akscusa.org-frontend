import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const publicDir = new URL("../../cms/public/", import.meta.url);
const publicDirPath = fileURLToPath(publicDir);

function publicFileExists(pathname: string): boolean {
  let file: URL;

  try {
    file = new URL(`.${pathname}`, publicDir);
  } catch {
    return false;
  }

  if (!fileURLToPath(file).startsWith(publicDirPath)) {
    return false;
  }

  return existsSync(file);
}

export type CmsDirectoryResolution =
  | { type: "rewrite"; url: string }
  | { type: "redirect"; location: string }
  | undefined;

/**
 * Mirror Cloudflare Pages directory routing for files served from `cms/`.
 * Pages serves `/admin/` from `cms/admin/index.html` and redirects `/admin`,
 * while Vite only matches public files by their exact path.
 */
export function resolveCmsDirectory(
  requestUrl: string,
): CmsDirectoryResolution {
  const [pathname = "/", query] = requestUrl.split("?");
  const suffix = query ? `?${query}` : "";

  if (pathname.endsWith("/")) {
    const indexPath = `${pathname}index.html`;

    return publicFileExists(indexPath)
      ? { type: "rewrite", url: `${indexPath}${suffix}` }
      : undefined;
  }

  return publicFileExists(`${pathname}/index.html`)
    ? { type: "redirect", location: `${pathname}/${suffix}` }
    : undefined;
}
