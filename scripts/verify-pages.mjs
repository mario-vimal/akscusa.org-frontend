import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const routes = new Map([
  ["/", "Educate. Agitate. Organize."],
  ["/anti-caste-helpline/", "Anti-Caste Helpline"],
  [
    "/testimonies-of-practice-of-caste-in-the-usa/",
    "Testimonies of Caste in the USA",
  ],
  ["/blog/", "Blog"],
  [
    "/blog/caste-discrimination-where-is-it/",
    "Caste discrimination, where is it?",
  ],
  ["/blog/category/ambedkarite-thought/", "Ambedkarite Thought"],
  ["/press-releases/", "Press Releases and Statements"],
  [
    "/press-releases/aksc-condemns-the-killing-of-george-floyd/",
    "For immediate release",
  ],
  ["/interventions/", "Interventions"],
  ["/interventions/yes-on-sb-403/", "YES on SB 403"],
  ["/interventions/kind/legislative/", "Legislative"],
  ["/book-readings/", "Book Readings"],
  ["/conferences/", "Conferences"],
  ["/conferences/aksc-6th-annual-conference-2025/", "Forging Indian Diasporic"],
  ["/organization/", "Organization"],
  ["/donate/", "Donate"],
  ["/admin/", "AKSC USA Content Manager"],
  ["/admin/config.yml", `repo: ${process.env.CMS_REPO ?? "OWNER/REPOSITORY"}`],
]);

async function findAvailablePort() {
  const server = createServer();
  server.listen(0, host);
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not allocate a port for Wrangler.");
  }

  const { port } = address;
  server.close();
  await once(server, "close");
  return port;
}

async function waitForWrangler(url, process) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error("Wrangler exited before its Pages server was ready.");
    }

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2_000),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Wrangler may still be starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Timed out waiting for the Wrangler Pages server.");
}

async function stopProcess(process) {
  if (process.exitCode !== null) {
    return;
  }

  process.kill("SIGTERM");

  await Promise.race([
    once(process, "exit"),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);

  if (process.exitCode === null) {
    process.kill("SIGKILL");
    await once(process, "exit");
  }
}

const port = await findAvailablePort();
const origin = `http://${host}:${port}`;
const wranglerPath = fileURLToPath(
  new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
const wrangler = spawn(
  process.execPath,
  [wranglerPath, "pages", "dev", "dist", "--ip", host, "--port", String(port)],
  {
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let output = "";
const captureOutput = (chunk) => {
  output = `${output}${chunk}`.slice(-20_000);
};

wrangler.stdout.on("data", captureOutput);
wrangler.stderr.on("data", captureOutput);

try {
  await waitForWrangler(origin, wrangler);

  for (const [route, marker] of routes) {
    const response = await fetch(`${origin}${route}`, {
      signal: AbortSignal.timeout(5_000),
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`${route} returned HTTP ${response.status}.`);
    }

    if (!body.includes(marker)) {
      throw new Error(`${route} did not contain its expected content.`);
    }
  }

  console.log(`Wrangler Pages verified ${routes.size} routes.`);
} catch (error) {
  console.error(output);
  throw error;
} finally {
  await stopProcess(wrangler);
}
