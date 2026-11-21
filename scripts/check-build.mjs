import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import path from "node:path";
import { root } from "./lib.mjs";
import { validateDataset } from "../src/schema.mjs";

// Exercise a repository subdirectory rather than assuming deployment at '/'.
const mount = "/market-indicator-dashboard/";
const dist = path.join(root, "dist");
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (!pathname.startsWith(mount)) throw new Error("Wrong deployment base");
    const relative =
      decodeURIComponent(pathname.slice(mount.length)) || "index.html";
    const file = path.resolve(dist, relative);
    if (!file.startsWith(dist + path.sep)) throw new Error("Outside dist");
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
try {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const page = new URL(mount, origin);
  const response = await fetch(page);
  assert.equal(response.status, 200);
  const html = await response.text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
    (m) => m[1],
  );
  assert(assets.length >= 2, "Expected built JavaScript and CSS");
  for (const asset of assets) {
    const url = new URL(asset, page);
    assert(
      url.pathname.startsWith(mount),
      `Asset escapes deployment path: ${asset}`,
    );
    assert.equal((await fetch(url)).status, 200, `Missing asset: ${asset}`);
  }
  const dataResponse = await fetch(new URL("data/history.json", page));
  assert.equal(dataResponse.status, 200);
  const data = validateDataset(await dataResponse.json());
  assert(data.observations.length > 0, "Missing historical observations");
  console.log(
    `GitHub Pages 子目錄檢查通過：${assets.length} 個資產與 ${data.observations.length} 筆觀測。`,
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}
