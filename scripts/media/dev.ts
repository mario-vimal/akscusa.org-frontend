import { resolveContentMedia, type ContentMediaOptions } from "#content-media";
import { normalizePath, type Plugin } from "vite";

function isMediaRequest(src: string): boolean {
  const pathname = src.split(/[?#]/, 1)[0];
  const inNamespace = (path: string) => {
    const normalized = path.replaceAll("\\", "/").replace(/^\/+/, "/");
    return normalized === "/media" || normalized.startsWith("/media/");
  };
  try {
    return inNamespace(decodeURIComponent(pathname));
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    // A malformed later segment must not let a publicDir fallback handle a
    // request whose namespace is still recognizable as media.
    try {
      const prefix = pathname.replace(/^[/\\]+/, "").split(/[/\\]/, 1)[0];
      return inNamespace(`/${decodeURIComponent(prefix)}`);
    } catch (error) {
      if (error instanceof URIError) return false;
      throw error;
    }
  }
}

export function contentMediaDevPlugin(
  options: ContentMediaOptions = {},
): Plugin {
  return {
    name: "colocated-content-media",
    apply: "serve",
    configureServer(server) {
      const root = options.root ?? server.config.root;
      server.middlewares.use((request, response, next) => {
        const src = request.url ?? "/";
        if (!isMediaRequest(src)) return next();
        response.setHeader("X-Content-Type-Options", "nosniff");
        if (request.method !== "GET" && request.method !== "HEAD") {
          response.writeHead(405, { Allow: "GET, HEAD" });
          response.end();
          return;
        }
        resolveContentMedia(src, { root })
          .then((asset) => {
            if (!asset) {
              response.writeHead(404, {
                "Content-Type": "text/plain; charset=utf-8",
              });
              response.end("Not found.");
              return;
            }
            response.setHeader("Content-Type", asset.contentType);
            // Delegate HTTP streaming, HEAD, ranges and ETags to Vite's existing
            // static middleware. Do not forward ?raw/?import as module requests.
            request.url = `/@fs/${encodeURI(normalizePath(asset.filePath))}`;
            next();
          })
          .catch(next);
      });
    },
  };
}
