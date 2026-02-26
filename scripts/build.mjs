import { build, context } from "esbuild";
import { rm } from "node:fs/promises";

const isWatch = process.argv.includes("--watch");

async function cleanOutDir() {
  await rm("out", { recursive: true, force: true });
}

const extensionConfig = {
  entryPoints: ["src/extension.ts"],
  outfile: "out/extension.js",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node16",
  sourcemap: true,
  external: ["vscode"],
  logLevel: "info",
};

const webviewConfig = {
  entryPoints: ["src/webview/main.ts"],
  outfile: "out/webview/main.js",
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2020",
  sourcemap: false,
  logLevel: "info",
};

async function runBuild() {
  await cleanOutDir();

  if (isWatch) {
    const extensionCtx = await context(extensionConfig);
    const webviewCtx = await context(webviewConfig);
    await extensionCtx.watch();
    await webviewCtx.watch();
    console.log("Watching with esbuild: extension + webview");
    return;
  }

  await build(extensionConfig);
  await build(webviewConfig);
  console.log("Build complete: out/extension.js and out/webview/main.js");
}

runBuild().catch((error) => {
  console.error(error);
  process.exit(1);
});
