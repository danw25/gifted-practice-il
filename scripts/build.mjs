import { mkdir, copyFile } from "node:fs/promises";

const output = new URL("../_site/", import.meta.url);
await mkdir(output, { recursive: true });
for (const name of ["index.html", "styles.css", "app.js", "engine.js", "questions.js", "favicon.svg"]) {
  await copyFile(new URL(`../${name}`, import.meta.url), new URL(name, output));
}
console.log("Static site copied to _site.");
