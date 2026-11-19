
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WEB_DIR = path.join(ROOT, "www");

const EXCLUDED = new Set([
  ".git",
  "node_modules",
  "android",
  "www"
]);

function copyProject(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const item of fs.readdirSync(source, {
    withFileTypes: true
  })) {
    if (EXCLUDED.has(item.name)) continue;

    const from = path.join(source, item.name);
    const to = path.join(destination, item.name);

    if (item.isDirectory()) {
      copyProject(from, to);
    } else if (item.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

if (!fs.existsSync(path.join(ROOT, "index.html"))) {
  throw new Error("ملف index.html غير موجود في جذر المشروع");
}

fs.rmSync(WEB_DIR, {
  recursive: true,
  force: true
});

copyProject(ROOT, WEB_DIR);

console.log("Yaqeen Android web files prepared successfully.");
