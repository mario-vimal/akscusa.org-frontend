/**
 * The Sveltia CMS backend commits to a single Git repository, and it does so
 * from a local dev server just as readily as from the deployed site. So
 * `cms/public/admin/config.yml` ships a placeholder rather than a real repository,
 * and `CMS_REPO` names the repository to publish to. Sveltia's local repository
 * workflow performs no Git operations, so the placeholder does not affect it.
 */
export const CMS_REPO_PLACEHOLDER = "OWNER/REPOSITORY";

const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

const REPO_LINE_PATTERN = /^([^\S\n]*repo:[^\S\n]*)\S.*$/gm;

/** Read the `CMS_REPO` setting, if one is present. */
export function cmsRepoOverride(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const repo = env.CMS_REPO?.trim();

  if (!repo) {
    return undefined;
  }

  if (!REPO_PATTERN.test(repo)) {
    throw new Error(
      `CMS_REPO must be an "owner/name" repository path, received "${repo}".`,
    );
  }

  return repo;
}

/**
 * Name where the current build should set `CMS_REPO`. A build can be driven by
 * Cloudflare Pages or by GitHub Actions, and a variable set in one has no
 * effect on the other, so an unset variable should point at the right one.
 */
export function cmsRepoSetupHint(
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.CF_PAGES) {
    return (
      "Set it in the Cloudflare build command: " +
      "`CMS_REPO=owner/name npm run build`, under Settings > Build. If it is " +
      "already there, the deployment likely reused a cached build: clear the " +
      "build cache under Settings > Build and retry."
    );
  }

  if (env.GITHUB_ACTIONS) {
    return (
      "Set it as a GitHub repository variable: `gh variable set CMS_REPO --body owner/name`. " +
      "A Cloudflare build variable does not apply, because this build runs on Actions."
    );
  }

  return "Set it in `.env`, or export it in your shell.";
}

/** Replace the placeholder repository in the CMS configuration file contents. */
export function applyCmsRepo(config: string, repo: string | undefined): string {
  if (!repo) {
    return config;
  }

  const matches = config.match(REPO_LINE_PATTERN) ?? [];

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one "repo:" entry in the CMS configuration, found ${matches.length}.`,
    );
  }

  return config.replace(REPO_LINE_PATTERN, `$1${repo}`);
}
