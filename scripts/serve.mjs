import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
const port = Number(process.env.PORT ?? 3000);
const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Invalid URL");
    return;
  }
  const path = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  if (!path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`) ||
      pathname.split("/").some((part) => part.startsWith("."))) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  if (!types[extname(path)]) {
    response.writeHead(404).end("Not found");
    return;
  }
  try {
    const body = await readFile(path);
    response.writeHead(200, { "Content-Type": `${types[extname(path)]}; charset=utf-8`, "Cache-Control": "no-store" });
    response.end(body);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") response.writeHead(404).end("Not found");
    else {
      console.error("Could not serve file.", error);
      response.writeHead(500).end("Server error");
    }
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Practice site: http://127.0.0.1:${port}`));
