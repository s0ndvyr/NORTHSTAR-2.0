import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const assetsDirectory = new URL("../dist/assets/", import.meta.url);
const budgets = {
  javascriptRawKiB: 650,
  javascriptGzipKiB: 200,
  cssRawKiB: 100,
  cssGzipKiB: 30,
  totalGzipKiB: 230,
};

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory.pathname, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(new URL(entry.name + "/", directory)));
    else files.push(path);
  }
  return files;
}

const files = await collectFiles(assetsDirectory);
const javascript = files.filter(file => file.endsWith(".js"));
const stylesheets = files.filter(file => file.endsWith(".css"));

if (!javascript.length || !stylesheets.length) {
  console.error("Bundle budget check could not find both JavaScript and CSS assets in dist/assets.");
  process.exit(1);
}

async function measure(paths) {
  let raw = 0;
  let gzip = 0;
  for (const path of paths) {
    const bytes = await readFile(path);
    raw += bytes.byteLength;
    gzip += gzipSync(bytes).byteLength;
  }
  return { rawKiB: raw / 1024, gzipKiB: gzip / 1024 };
}

const js = await measure(javascript);
const css = await measure(stylesheets);
const totalGzipKiB = js.gzipKiB + css.gzipKiB;
const results = [
  ["JavaScript raw", js.rawKiB, budgets.javascriptRawKiB],
  ["JavaScript gzip", js.gzipKiB, budgets.javascriptGzipKiB],
  ["CSS raw", css.rawKiB, budgets.cssRawKiB],
  ["CSS gzip", css.gzipKiB, budgets.cssGzipKiB],
  ["Total gzip", totalGzipKiB, budgets.totalGzipKiB],
];

for (const [label, actual, budget] of results) {
  console.log(label + ": " + actual.toFixed(2) + " KiB / " + budget + " KiB budget");
}

const failures = results.filter(([, actual, budget]) => actual > budget);
if (failures.length) {
  console.error("Production bundle budget exceeded: " + failures.map(([label]) => label).join(", "));
  process.exit(1);
}
console.log("Production bundle budgets passed.");
