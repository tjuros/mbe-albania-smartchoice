import { writeFile, readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const SOURCE_URL = [
  "https://mydhl.express.dhl/content/dam/downloads/",
  "g0/remote-areas/",
  "dhl_express_remote_areas_en.pdf.coredownload.pdf",
].join("");

const SUPPORTED = new Set(["IT", "GR", "HR", "DE", "AT", "FR", "ES", "GB", "US", "CA", "CN", "AU"]);
const NUMERIC_LENGTHS = { IT: 5, GR: 5, HR: 5, DE: 5, AT: 4, FR: 5, ES: 5, US: 5, CN: 6, AU: 4 };
const CA_LETTERS = "ABCEGHJKLMNPRSTVWXYZ";
const CA_RADICES = [20, 10, 20, 10, 20, 10];

const normalize = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

function canadaIndex(value) {
  const zip = normalize(value);
  if (zip.length !== 6) throw new Error(`Invalid Canadian postal code: ${value}`);
  let result = 0;
  for (let index = 0; index < zip.length; index += 1) {
    const item = index % 2 === 0 ? CA_LETTERS.indexOf(zip[index]) : Number(zip[index]);
    if (item < 0 || !Number.isFinite(item)) throw new Error(`Invalid Canadian postal code: ${value}`);
    result = result * CA_RADICES[index] + item;
  }
  return result;
}

function mergeRanges(ranges) {
  if (!ranges.length) return [];
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  let [start, end] = ranges[0];
  for (const [nextStart, nextEnd] of ranges.slice(1)) {
    if (nextStart <= end + 1) end = Math.max(end, nextEnd);
    else {
      merged.push([start, end]);
      [start, end] = [nextStart, nextEnd];
    }
  }
  merged.push([start, end]);
  return merged;
}

function pageLines(items) {
  const rows = [];
  for (const item of items) {
    if (!("str" in item) || !item.str?.trim() || !item.transform) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    let row = rows.find((candidate) => Math.abs(candidate.y - y) < 1.5);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push({ x, text: item.str.trim() });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(" "));
}

function parseLine(line, numeric, canada, gb) {
  const tokens = line.split(/\s+/).filter(Boolean);
  const codePosition = tokens.findIndex((token) => SUPPORTED.has(token));
  if (codePosition < 0) return;
  const code = tokens[codePosition];
  const tail = tokens.slice(codePosition + 1);

  if (code === "CA" || code === "GB") {
    if (tail.length < 4) return;
    const start = normalize(tail.at(-4) + tail.at(-3));
    const end = normalize(tail.at(-2) + tail.at(-1));
    if (code === "CA") {
      try {
        const a = canadaIndex(start);
        const b = canadaIndex(end);
        canada.push([Math.min(a, b), Math.max(a, b)]);
      } catch {
        // City-only rows and malformed headers are intentionally ignored.
      }
    } else if (/\d/.test(start) && /\d/.test(end)) {
      gb.push([start, end]);
    }
    return;
  }

  const expected = NUMERIC_LENGTHS[code];
  if (!expected || tail.length < 2) return;
  let start = normalize(tail.at(-2));
  let end = normalize(tail.at(-1));
  if ((start.length !== expected || end.length !== expected) && tail.length >= 4) {
    start = normalize(tail.at(-4) + tail.at(-3));
    end = normalize(tail.at(-2) + tail.at(-1));
  }
  if (start.length !== expected || end.length !== expected || !/^\d+$/.test(start + end)) return;
  const a = Number(start);
  const b = Number(end);
  numeric[code].push([Math.min(a, b), Math.max(a, b)]);
}

async function buildDatabase() {
  const response = await fetch(SOURCE_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`DHL list download failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const document = await getDocument({ data: bytes, disableWorker: true, useSystemFonts: true }).promise;

  const numeric = Object.fromEntries(Object.keys(NUMERIC_LENGTHS).map((code) => [code, []]));
  const canada = [];
  const gb = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    for (const line of pageLines(content.items)) parseLine(line, numeric, canada, gb);
    if (pageNumber % 100 === 0) console.log(`Parsed ${pageNumber}/${document.numPages} pages`);
  }

  const database = {
    version: "2026-01-04",
    numeric: Object.fromEntries(Object.entries(numeric).map(([code, ranges]) => [code, {
      length: NUMERIC_LENGTHS[code],
      ranges: mergeRanges(ranges),
    }])),
    CA: mergeRanges(canada),
    GB: [...new Map(gb.map((range) => [`${range[0]}|${range[1]}`, range])).values()].sort(),
  };

  const missing = [
    ...Object.entries(database.numeric).filter(([, item]) => !item.ranges.length).map(([code]) => code),
    ...(database.CA.length ? [] : ["CA"]),
    ...(database.GB.length ? [] : ["GB"]),
  ];
  if (missing.length) throw new Error(`DHL remote data missing for: ${missing.join(", ")}`);
  return database;
}

async function patchSource() {
  const mainPath = new URL("../src/main.tsx", import.meta.url);
  let mainSource = await readFile(mainPath, "utf8");
  if (!mainSource.includes('import "./remoteRuntime";')) {
    mainSource = mainSource.replace('import "./dhlRuntime";', 'import "./dhlRuntime";\nimport "./remoteRuntime";');
    await writeFile(mainPath, mainSource);
  }
}

const database = await buildDatabase();
await writeFile(new URL("../public/dhl-remote-2026.json", import.meta.url), JSON.stringify(database));
await patchSource();
console.log("DHL 2026 remote-area database created.");
