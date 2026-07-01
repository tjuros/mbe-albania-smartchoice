type RuntimeResult = {
  name: string;
  price: number | null;
  possible: boolean;
  details: string[];
  serviceType: "MBE Economy" | "MBE Express";
  status: "ok" | "surcharge" | "no";
  warning?: string;
};

type NumericData = { length: number; ranges: [number, number][] };
type RemoteDatabase = {
  version: string;
  numeric: Record<string, NumericData>;
  CA: [number, number][];
  GB: [string, string][];
};

type DataPart = {
  path: string;
  encoding: "base64" | "hex" | "decimal";
};

const REMOTE_RATE_PER_KG = 0.5;
const REMOTE_MINIMUM_EUR = 24;
const ECONOMY_FUEL_RATE = 0.3;
const EXPRESS_FUEL_RATE = 0.4725;
const CA_LETTERS = "ABCEGHJKLMNPRSTVWXYZ";
const CA_RADICES = [20, 10, 20, 10, 20, 10];
const NOT_CHECKED_WARNING = "Remote area not checked";

const DATA_PARTS: DataPart[] = [
  ...Array.from({ length: 12 }, (_, index) => ({
    path: `/remote/dhl-compact-${String(index + 1).padStart(2, "0")}.b64`,
    encoding: "base64" as const,
  })),
  { path: "/remote/dhl-compact-13-1.hex", encoding: "hex" },
  { path: "/remote/dhl-compact-13-2.hex", encoding: "hex" },
  { path: "/remote/dhl-compact-13-3.hex", encoding: "hex" },
  { path: "/remote/dhl-compact-13-4.hex", encoding: "hex" },
  { path: "/remote/dhl-compact-14-1.hex", encoding: "hex" },
  { path: "/remote/dhl-compact-14-2.dec", encoding: "decimal" },
];

let database: RemoteDatabase | null = null;
let databaseFailed = false;
let currentCountry = "AL";
let currentDirection: "outbound" | "inbound" = "outbound";
let currentZip = "";

const normalizeZip = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const euro = (value: number) => `€${value.toFixed(2)}`;

function isRuntimeResult(value: unknown): value is RuntimeResult {
  return !!value && typeof value === "object" && "name" in value && "serviceType" in value && "details" in value;
}

function isDhlResult(result: RuntimeResult) {
  return result.name === "DHL Economy Select" || result.name === "DHL Standard" ||
    result.name === "DHL Express Worldwide" || result.name === "DHL Express";
}

function inRanges(value: number, ranges: [number, number][]) {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const [start, end] = ranges[middle];
    if (value < start) high = middle - 1;
    else if (value > end) low = middle + 1;
    else return true;
  }
  return false;
}

function canadaIndex(zip: string) {
  if (zip.length !== 6) return null;
  let result = 0;
  for (let index = 0; index < zip.length; index += 1) {
    const item = index % 2 === 0 ? CA_LETTERS.indexOf(zip[index]) : Number(zip[index]);
    if (item < 0 || !Number.isFinite(item)) return null;
    result = result * CA_RADICES[index] + item;
  }
  return result;
}

function isRemote(country: string, zip: string) {
  if (!database || !zip) return false;
  if (country === "CA") {
    const value = canadaIndex(zip);
    return value !== null && inRanges(value, database.CA);
  }
  if (country === "GB") {
    return database.GB.some(([start, end]) => {
      const prefix = zip.slice(0, start.length);
      return prefix.length === start.length && prefix >= start && prefix <= end;
    });
  }
  const item = database.numeric[country];
  if (!item || zip.length !== item.length || !/^\d+$/.test(zip)) return false;
  return inRanges(Number(zip), item.ranges);
}

function getChargeableWeight(result: RuntimeResult) {
  for (const detail of result.details) {
    const match = detail.match(/Chargeable weight:\s*([\d.,]+)\s*kg/i);
    if (match) return Number(match[1].replace(",", ".")) || 0;
  }
  return 0;
}

function applyRemote(results: RuntimeResult[]) {
  const input = document.getElementById("dhl-zip-code") as HTMLInputElement | null;
  const zip = currentZip || normalizeZip(input?.value ?? "");

  for (const result of results) {
    if (!isDhlResult(result) || !result.possible || result.price === null) continue;

    if (!zip) {
      if (!result.warning) result.warning = NOT_CHECKED_WARNING;
      continue;
    }
    if (result.warning === NOT_CHECKED_WARNING) result.warning = undefined;
    if (!database || databaseFailed || !isRemote(currentCountry, zip)) continue;
    if (result.details.some((detail) => detail.startsWith("DHL remote area"))) continue;

    const isEconomy = result.name === "DHL Economy Select" || result.name === "DHL Standard";
    const weight = getChargeableWeight(result);
    const remoteFee = round2(Math.max(REMOTE_MINIMUM_EUR, weight * REMOTE_RATE_PER_KG));
    const fuelRate = isEconomy ? ECONOMY_FUEL_RATE : EXPRESS_FUEL_RATE;
    const remoteFuel = round2(remoteFee * fuelRate);

    result.price = round2(result.price + remoteFee + remoteFuel);
    result.status = "surcharge";
    result.warning = undefined;
    result.details.push(`DHL remote area ${currentDirection === "inbound" ? "pickup" : "delivery"}: ${zip}`);
    result.details.push(`Remote area surcharge: ${euro(remoteFee)}`);
    result.details.push(`Fuel on remote surcharge: ${euro(remoteFuel)}`);
  }
}

function triggerRecalculation() {
  const input = document.querySelector<HTMLInputElement>('input[placeholder="kg"]');
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, input.value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function neutralizeZipUi() {
  const input = document.getElementById("dhl-zip-code") as HTMLInputElement | null;
  const wrapper = input?.closest<HTMLElement>(".smart-zip-field");
  if (!wrapper) return;
  if (wrapper.hidden) wrapper.hidden = false;

  const help = wrapper.querySelector<HTMLElement>(".smart-zip-help");
  if (!help) return;
  const albanian = document.documentElement.lang === "sq" || document.body.textContent?.includes("Rivendos");
  const text = albanian
    ? "Përdoret për kontrollin e itinerarit, zonës dhe tarifave shtesë."
    : "Used for route, zone and surcharge checks.";
  if (help.textContent !== text) help.textContent = text;
}

function decodeBase64(value: string) {
  const binary = atob(value.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeHex(value: string) {
  const clean = value.replace(/\s+/g, "");
  if (clean.length % 2 !== 0) throw new Error("Invalid hexadecimal remote-data part");
  const bytes = new Uint8Array(clean.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function decodeDecimal(value: string) {
  const values = value.split(",").map((item) => item.trim()).filter(Boolean).map(Number);
  if (values.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) {
    throw new Error("Invalid decimal remote-data part");
  }
  return Uint8Array.from(values);
}

function decodeRanges(payload: string): [number, number][] {
  let previousEnd = -1;
  return payload.split(",").filter(Boolean).map((token) => {
    const [deltaRaw, spanRaw] = token.split(".");
    const delta = Number.parseInt(deltaRaw, 36);
    const span = spanRaw ? Number.parseInt(spanRaw, 36) : 0;
    if (!Number.isFinite(delta) || !Number.isFinite(span)) throw new Error("Invalid remote range");
    const start = previousEnd + 1 + delta;
    const end = start + span;
    previousEnd = end;
    return [start, end];
  });
}

function parseDatabase(text: string): RemoteDatabase {
  const parsed: RemoteDatabase = { version: "2026-01-04", numeric: {}, CA: [], GB: [] };

  for (const line of text.trim().split("\n")) {
    const firstSeparator = line.indexOf("|");
    const secondSeparator = line.indexOf("|", firstSeparator + 1);
    if (firstSeparator < 0 || secondSeparator < 0) continue;

    const country = line.slice(0, firstSeparator);
    const length = Number(line.slice(firstSeparator + 1, secondSeparator));
    const payload = line.slice(secondSeparator + 1);

    if (country === "GB") {
      parsed.GB = payload.split(",").filter(Boolean).map((item) => {
        const separator = item.indexOf("-");
        return separator < 0
          ? [item, item]
          : [item.slice(0, separator), item.slice(separator + 1)];
      });
      continue;
    }

    const ranges = decodeRanges(payload);
    if (country === "CA") parsed.CA = ranges;
    else parsed.numeric[country] = { length, ranges };
  }

  if (!parsed.numeric.HR?.ranges.length || !parsed.numeric.IT?.ranges.length || !parsed.CA.length || !parsed.GB.length) {
    throw new Error("DHL remote database is incomplete");
  }
  return parsed;
}

async function fetchDataPart(part: DataPart) {
  const response = await fetch(part.path, { cache: "force-cache" });
  if (!response.ok) throw new Error(`${part.path} HTTP ${response.status}`);
  const text = await response.text();
  if (part.encoding === "base64") return decodeBase64(text);
  if (part.encoding === "hex") return decodeHex(text);
  return decodeDecimal(text);
}

async function loadDatabase() {
  try {
    const parts = await Promise.all(DATA_PARTS.map(fetchDataPart));
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const compressed = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      compressed.set(part, offset);
      offset += part.length;
    }

    if (!("DecompressionStream" in window)) throw new Error("Gzip decompression is not supported");
    const compressedBuffer = compressed.buffer.slice(0) as ArrayBuffer;
    const stream = new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream("gzip"));
    database = parseDatabase(await new Response(stream).text());
    databaseFailed = false;
    triggerRecalculation();
  } catch (error) {
    databaseFailed = true;
    console.error("DHL remote-area database failed to load", error);
  }
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement) {
    currentCountry = target.value;
    currentZip = "";
  }
}, true);

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.id === "dhl-zip-code") {
    currentZip = normalizeZip(target.value);
  }
}, true);

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const label = target.closest("button")?.textContent?.trim() ?? "";
  if (label.includes("Import") || label.includes("Hyrëse")) currentDirection = "inbound";
  if (label.includes("Export") || label.includes("Eksport") || label.includes("Dalëse")) currentDirection = "outbound";
  if (label === "Reset" || label === "Rivendos") {
    currentDirection = "outbound";
    currentCountry = "AL";
    currentZip = "";
  }
}, true);

const previousFilter = Array.prototype.filter;
const remoteFilter = function <T>(
  this: T[],
  callbackfn: (value: T, index: number, array: T[]) => unknown,
  thisArg?: unknown,
): T[] {
  const filtered = previousFilter.call(this, callbackfn, thisArg);
  if (this.some(isRuntimeResult)) applyRemote(this as unknown as RuntimeResult[]);
  return filtered;
};
Array.prototype.filter = remoteFilter as typeof Array.prototype.filter;

const zipUiObserver = new MutationObserver(neutralizeZipUi);
zipUiObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ["hidden"],
});
queueMicrotask(neutralizeZipUi);
void loadDatabase();
