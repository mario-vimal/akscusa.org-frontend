// @ts-check
import { readFile, writeFile } from "node:fs/promises";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

import { resolveCmsDirectory } from "./scripts/cms/dev-routing";
import {
  applyCmsRepo,
  cmsRepoOverride,
  cmsRepoSetupHint,
} from "./scripts/cms/repo";

const cmsConfigFile = new URL("./cms/public/admin/config.yml", import.meta.url);
const cmsConfigPathname = "/admin/config.yml";

// `CMS_REPO` is read from the shell and from `.env`, so a contributor can point
// the CMS at their own fork once instead of exporting it on every command.
const cmsRepo = cmsRepoOverride({
  ...loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "CMS_"),
  ...process.env,
});

/**
 * Serve the Sveltia CMS at `/admin/` during development, matching how
 * Cloudflare Pages resolves directory paths in the deployed site, and apply the
 * same `CMS_REPO` override the build applies.
 * @returns {import("vite").Plugin}
 */
function cmsDevServer() {
  return {
    name: "cms-dev-server",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const [pathname = "/"] = (request.url ?? "/").split("?");

        if (pathname === cmsConfigPathname) {
          readFile(cmsConfigFile, "utf8")
            .then((config) => {
              response.setHeader("content-type", "application/yaml");
              response.end(applyCmsRepo(config, cmsRepo));
            })
            .catch(next);
          return;
        }

        const resolution = resolveCmsDirectory(request.url ?? "/");

        if (resolution?.type === "rewrite") {
          request.url = resolution.url;
        } else if (resolution?.type === "redirect") {
          response.writeHead(308, { location: resolution.location });
          response.end();
          return;
        }

        next();
      });
    },
  };
}

/**
 * Point the built CMS at the repository named by `CMS_REPO`, leaving the
 * placeholder in `cms/public/admin/config.yml` in place when it is unset.
 * @returns {import("astro").AstroIntegration}
 */
function cmsBackendRepo() {
  return {
    name: "cms-backend-repo",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        if (!cmsRepo) {
          const visible = Object.keys(process.env)
            .filter((key) => key.startsWith("CMS_"))
            .sort();

          logger.warn(
            "CMS_REPO is not set, so /admin/ keeps its placeholder backend " +
              "repository and GitHub sign-in will not work in this build. " +
              `CMS_* variables visible to this build: ${
                visible.length ? visible.join(", ") : "none"
              }. ` +
              cmsRepoSetupHint(),
          );
          return;
        }

        const builtConfig = new URL("./admin/config.yml", dir);

        await writeFile(
          builtConfig,
          applyCmsRepo(await readFile(builtConfig, "utf8"), cmsRepo),
        );

        logger.info(`CMS backend repository: ${cmsRepo}`);
      },
    },
  };
}

export default defineConfig({
  site: "https://akscusa.org",
  output: "static",
  srcDir: "./app",
  publicDir: "./cms/public",
  integrations: [sitemap(), cmsBackendRepo()],
  vite: {
    plugins: [tailwindcss(), cmsDevServer()],
  },
});
