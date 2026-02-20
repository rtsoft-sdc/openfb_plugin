#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Move webview files from out/webview/webview to out/webview and fix imports
const webviewSrcDir = path.join(__dirname, 'out', 'webview', 'webview');
const webviewOutDir = path.join(__dirname, 'out', 'webview');

/**
 * Recursively copy and fix imports in files and directories
 */
function copyAndFixRecursive(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(srcDir);
  
  entries.forEach(entry => {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      // Recursively copy subdirectories
      copyAndFixRecursive(srcPath, destPath);
    } else if (stat.isFile()) {
      let content = fs.readFileSync(srcPath, 'utf8');

      // Fix imports to go up one level for domain files
      // e.g., "./domain/fbtModel.js" -> "../domain/fbtModel.js"
      content = content.replace(/from ["']\.\/domain\//g, 'from "../domain/');
      content = content.replace(/import ["']\.\/domain\//g, 'import "../domain/');

      // Add .js extension to relative imports that don't have an extension
      // e.g., from "./editorState" -> from "./editorState.js"
      // but skip if already has .js or other extension
      content = content.replace(/from ["'](\.[^"']*?)(?<!\.js)["']/g, 'from "$1.js"');

      // Rewrite colorScheme import paths to use ESM module in out/webview
      const relativePath = path.relative(webviewOutDir, destPath);
      const inRoot = !relativePath.includes(path.sep);
      if (inRoot) {
        content = content.replace(/from ["']\.\.\/colorScheme\.js["']/g, 'from "./colorScheme.js"');
      } else {
        content = content.replace(/from ["']\.\.\/\.\.\/colorScheme\.js["']/g, 'from "../colorScheme.js"');
      }

      fs.writeFileSync(destPath, content, 'utf8');
      console.log(`Moved and fixed: ${entry}`);
    }
  });
}

if (fs.existsSync(webviewSrcDir)) {
  copyAndFixRecursive(webviewSrcDir, webviewOutDir);

  // Clean up nested directory
  fs.rmSync(webviewSrcDir, { recursive: true });
  console.log('Cleaned up nested webview directory');
} else {
  console.log('Webview source directory not found, skipping post-process');
}


