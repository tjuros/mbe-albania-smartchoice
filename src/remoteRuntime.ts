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

const REMOTE_RATE_PER_KG = 0.5;
const REMOTE_MINIMUM_EUR = 24;
const ECONOMY_FUEL_RATE = 0.3;
const EXPRESS_FUEL_RATE = 0.4725;
const CA_LETTERS = "ABCEGHJKLMNPRSTVWXYZ";
const CA_RADICES = [20, 10, 20, 10, 20, 10];

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
  const zip = currentZip || normalizeZip((document.getElementById("dhl-zip-code") as HTMLInputElement | null)?.value ?? "");
  if (!database || databaseFailed || !zip || !isRemote(currentCountry, zip)) return;

  for (const result of results) {
    const isEconomy = result.name === "DHL Economy Select" || result.name === "DHL Standard";
    const isExpress = result.name === "DHL Express Worldwide" || result.name === "DHL Express";
    if ((!isEconomy && !isExpress) || !result.possible || result.price === null) continue;
    if (result.details.some((detail) => detail.startsWith("DHL remote area"))) continue;

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

async function loadDatabase() {
  try {
    const response = await fetch("/dhl-remote-2026.json.gz", { cache: "force-cache" });
    if (!response.ok) throw new Error(`Remote database HTTP ${response.status}`);
    if (!("DecompressionStream" in window)) throw new Error("Gzip decompression is not supported");
    const stream = response.body?.pipeThrough(new DecompressionStream("gzip"));
    if (!stream) throw new Error("Remote database stream is unavailable");
    database = JSON.parse(await new Response(stream).text()) as RemoteDatabase;
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

void loadDatabase();
