type UpsRemoteResult = {
  name: string;
  price: number | null;
  possible: boolean;
  details: string[];
  serviceType: "MBE Economy" | "MBE Express";
  status: "ok" | "surcharge" | "no";
  warning?: string;
};

type Direction = "outbound" | "inbound";
type AreaType = "remote" | "extended";
type AreaRow = {
  country: string;
  low: string;
  high: string;
  origin: string;
  destination: string;
};

const UPS_REMOTE_MARKER = "UPS remote/extended area check";
const UPS_REMOTE_MINIMUM_EUR = 26.55;
const UPS_REMOTE_PER_KG_EUR = 0.54;
const UPS_FUEL_RATE = 0.4075;
const UPS_FUEL_EFFECTIVE = "29/06/2026";

let currentDirection: Direction = "outbound";
let currentCountry = "AL";
let areaRowsByCountry = new Map<string, AreaRow[]>();
let databaseReady = false;
let databaseFailed = false;
let refreshRequested = false;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const euro = (value: number) => `€${value.toFixed(2)}`;
const normalizePostal = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
const isAlbanian = () => document.body.textContent?.includes("Rivendos") ?? false;

function isRuntimeResult(value: unknown): value is UpsRemoteResult {
  return !!value && typeof value === "object" && "name" in value && "details" in value && "serviceType" in value;
}

function textValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function field(object: Record<string, unknown>, names: string[]) {
  const normalized = new Map(Object.entries(object).map(([key, value]) => [key.toLowerCase().replace(/[^a-z]/g, ""), value]));
  for (const name of names) {
    const found = normalized.get(name.toLowerCase().replace(/[^a-z]/g, ""));
    if (found !== undefined) return textValue(found);
  }
  return "";
}

function rowFromUnknown(value: unknown): AreaRow | null {
  if (Array.isArray(value)) {
    if (value.length >= 7) {
      return {
        country: textValue(value[1]),
        low: textValue(value[2]),
        high: textValue(value[3]),
        origin: textValue(value[5]),
        destination: textValue(value[6]),
      };
    }
    if (value.length >= 5) {
      return {
        country: textValue(value[0]),
        low: textValue(value[1]),
        high: textValue(value[2]),
        origin: textValue(value[3]),
        destination: textValue(value[4]),
      };
    }
    return null;
  }

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return {
      country: field(object, ["iata code", "iata", "country code", "countryCode", "code"]),
      low: field(object, ["postal code low", "postalLow", "low", "from"]),
      high: field(object, ["postal code high", "postalHigh", "high", "to"]),
      origin: field(object, ["origin surcharge", "originSurcharge", "origin"]),
      destination: field(object, ["destination surcharge", "destinationSurcharge", "destination"]),
    };
  }

  return null;
}

function parseDelimited(text: string): AreaRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes("|") ? "|" : ",";
  const rows: AreaRow[] = [];

  for (const line of lines) {
    const columns = line.split(delimiter).map((part) => part.trim().replace(/^"|"$/g, ""));
    const lower = columns.map((part) => part.toLowerCase());
    if (lower.includes("country") || lower.includes("iata code") || lower.includes("low")) continue;

    let row: AreaRow | null = null;
    if (columns.length >= 7) {
      row = {
        country: columns[1],
        low: columns[2],
        high: columns[3],
        origin: columns[5],
        destination: columns[6],
      };
    } else if (columns.length >= 5) {
      row = {
        country: columns[0],
        low: columns[1],
        high: columns[2],
        origin: columns[3],
        destination: columns[4],
      };
    }
    if (row) rows.push(row);
  }

  return rows;
}

function parseDatabase(text: string): AreaRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as unknown;
    const source = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? Object.values(parsed as Record<string, unknown>).flatMap((value) => Array.isArray(value) ? value : [value])
        : [];
    return source.map(rowFromUnknown).filter((row): row is AreaRow => !!row);
  }

  return parseDelimited(trimmed);
}

function indexRows(rows: AreaRow[]) {
  const next = new Map<string, AreaRow[]>();
  for (const row of rows) {
    const country = row.country.toUpperCase();
    const low = normalizePostal(row.low);
    const high = normalizePostal(row.high || row.low);
    if (!/^[A-Z]{2}$/.test(country) || !low) continue;
    const normalized = { ...row, country, low, high: high || low };
    const list = next.get(country) ?? [];
    list.push(normalized);
    next.set(country, list);
  }
  areaRowsByCountry = next;
  databaseReady = next.size > 0;
}

async function decodeGzipBase64(encoded: string) {
  const clean = encoded.replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

  if (!("DecompressionStream" in window)) {
    throw new Error("This browser does not support gzip decompression.");
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

async function loadDatabase() {
  try {
    const response = await fetch("/remote/ups-area-2026.b64", { cache: "force-cache" });
    if (!response.ok) throw new Error(`UPS area database HTTP ${response.status}`);
    const decoded = await decodeGzipBase64(await response.text());
    indexRows(parseDatabase(decoded));
    if (!databaseReady) throw new Error("UPS area database contained no readable rows.");
  } catch (error) {
    console.error("UPS remote database failed to load", error);
    databaseFailed = true;
  } finally {
    if (!refreshRequested) {
      refreshRequested = true;
      document.querySelector<HTMLInputElement>('input[placeholder="kg"]')
        ?.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
}

function category(value: string): AreaType | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "no") return null;
  if (normalized.includes("remote")) return "remote";
  return "extended";
}

function inRange(postalCode: string, low: string, high: string) {
  if (/^\d+$/.test(postalCode) && /^\d+$/.test(low) && /^\d+$/.test(high)) {
    const width = Math.max(postalCode.length, low.length, high.length);
    const value = BigInt(postalCode.padStart(width, "0"));
    return value >= BigInt(low.padStart(width, "0")) && value <= BigInt(high.padStart(width, "0"));
  }

  const width = Math.max(postalCode.length, low.length, high.length);
  const value = postalCode.padEnd(width, " ");
  return value >= low.padEnd(width, " ") && value <= high.padEnd(width, " ");
}

function lookupArea(country: string, postalCode: string): AreaType | null {
  const rows = areaRowsByCountry.get(country.toUpperCase()) ?? [];
  let match: AreaType | null = null;

  for (const row of rows) {
    if (!inRange(postalCode, row.low, row.high)) continue;
    const found = category(currentDirection === "outbound" ? row.destination : row.origin);
    if (found === "remote") return "remote";
    if (found === "extended") match = "extended";
  }

  return match;
}

function chargeableWeight(result: UpsRemoteResult) {
  for (const detail of result.details) {
    const match = detail.match(/(?:Chargeable weight|Pesha e faturueshme):\s*([0-9]+(?:[.,][0-9]+)?)\s*kg/i);
    if (match) return Number(match[1].replace(",", "."));
  }
  return 0;
}

function applyRemoteArea(result: UpsRemoteResult) {
  if (result.name !== "UPS Express Saver" || !result.possible || result.price === null) return;
  if (result.details.some((detail) => detail.startsWith(UPS_REMOTE_MARKER))) return;

  const albanian = isAlbanian();
  const postalInput = document.querySelector<HTMLInputElement>("#dhl-zip-code");
  const postalCode = normalizePostal(postalInput?.value ?? "");

  if (!postalCode) {
    result.details.push(
      `${UPS_REMOTE_MARKER}: ${albanian ? "vendosni kodin postar për kontroll automatik" : "enter a postal code for automatic checking"}.`,
    );
    return;
  }

  if (!databaseReady) {
    result.details.push(
      `${UPS_REMOTE_MARKER}: ${databaseFailed
        ? (albanian ? "baza nuk mund të ngarkohej; kërkohet kontroll manual" : "database could not be loaded; manual checking is required")
        : (albanian ? "baza po ngarkohet" : "database is loading")}.`,
    );
    return;
  }

  const area = lookupArea(currentCountry, postalCode);
  if (!area) {
    result.details.push(
      `${UPS_REMOTE_MARKER}: ${albanian ? "nuk u gjet nadoplata për këtë kod postar" : "no surcharge match was found for this postal code"}.`,
    );
    return;
  }

  const weight = chargeableWeight(result);
  if (!weight) return;

  const base = round2(Math.max(UPS_REMOTE_MINIMUM_EUR, weight * UPS_REMOTE_PER_KG_EUR));
  const fuel = round2(base * UPS_FUEL_RATE);
  const surcharge = round2(base + fuel);
  result.price = round2(result.price + surcharge);
  result.status = "surcharge";

  const label = area === "remote" ? "Remote Area" : "Extended Area";
  result.details.push(
    `${UPS_REMOTE_MARKER}: ${label}`,
    albanian
      ? `Nadoplata: MAX(${euro(UPS_REMOTE_MINIMUM_EUR)}, ${weight.toFixed(2)} kg × ${euro(UPS_REMOTE_PER_KG_EUR)}) = ${euro(base)}`
      : `Surcharge: MAX(${euro(UPS_REMOTE_MINIMUM_EUR)}, ${weight.toFixed(2)} kg × ${euro(UPS_REMOTE_PER_KG_EUR)}) = ${euro(base)}`,
    albanian
      ? `Karburanti ${(UPS_FUEL_RATE * 100).toFixed(2)}% mbi nadoplatën (nga ${UPS_FUEL_EFFECTIVE}): ${euro(fuel)}`
      : `Fuel ${(UPS_FUEL_RATE * 100).toFixed(2)}% on surcharge (effective ${UPS_FUEL_EFFECTIVE}): ${euro(fuel)}`,
    albanian
      ? `Nadoplata totale ${label}: ${euro(surcharge)}; zbritja nuk aplikohet.`
      : `Total ${label} surcharge: ${euro(surcharge)}; discount is not applied.`,
  );
}

function applyUpsRemote(results: UpsRemoteResult[]) {
  const result = results.find((item) => item.name === "UPS Express Saver");
  if (result) applyRemoteArea(result);
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement && /^[A-Z]{2}$/.test(target.value)) currentCountry = target.value;
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
  }
}, true);

const previousFilter = Array.prototype.filter;
const upsRemoteFilter = function <T>(
  this: T[],
  callbackfn: (value: T, index: number, array: T[]) => unknown,
  thisArg?: unknown,
): T[] {
  const filtered = previousFilter.call(this, callbackfn, thisArg) as T[];
  if (this.some(isRuntimeResult)) applyUpsRemote(this as unknown as UpsRemoteResult[]);
  return filtered;
};
Array.prototype.filter = upsRemoteFilter as typeof Array.prototype.filter;

void loadDatabase();
