type EmsRuntimeResult = {
  name: string;
  price: number | null;
  possible: boolean;
  details: string[];
  serviceType: "MBE Economy" | "MBE Express";
  status: "ok" | "surcharge" | "no";
  warning?: string;
};

type EmsZone = 1 | 2 | 3 | 4;

const EUR_TO_ALL = 93.9135;
const EMS_MARKER = "Posta Shqiptare EMS official tariff";
const MAX_WEIGHT_KG = 20;
const MAX_SINGLE_DIMENSION_CM = 150;

const WEIGHT_LIMITS_GRAMS = [
  250, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000,
  5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000,
];

const RATES_ALL: Record<EmsZone, number[]> = {
  1: [3500, 3600, 4500, 5000, 6000, 6500, 7000, 7600, 8400, 8600, 9000, 9500, 9800, 10000, 10600, 11000, 11300, 11700, 12200, 12800, 13800],
  2: [4000, 4500, 5000, 5500, 6000, 7300, 8000, 8500, 9400, 10100, 10800, 11600, 12000, 12600, 13200, 14000, 14300, 15000, 15500, 16000, 17000],
  3: [4500, 5000, 5800, 6900, 7600, 8300, 9000, 9800, 11300, 12000, 12800, 13500, 14500, 15000, 15800, 17000, 17300, 18000, 18800, 19500, 20300],
  4: [6000, 7500, 8250, 9750, 10800, 12750, 14700, 16350, 17700, 19350, 20850, 21750, 23250, 24750, 26250, 27000, 27750, 28500, 29250, 30000, 30750],
};

const EXTRA_KG_ALL: Record<EmsZone, number> = {
  1: 1000,
  2: 1300,
  3: 1700,
  4: 2240,
};

const ZONE_1 = new Set([
  "AT", "GB", "BE", "BA", "BG", "CZ", "DK", "FI", "FR", "DE", "GI", "GR", "NL", "HU", "IE", "IS", "IT", "RS", "HR", "LV", "LT", "LU", "MT", "MK", "MD", "NO", "PL", "PT", "CY", "RO", "RU", "SK", "SI", "ES", "SE", "TR", "UA", "CH", "XK",
]);

const ZONE_2 = new Set([
  "DZ", "BY", "EG", "EE", "GE", "IL", "LB", "MA", "SY", "SD", "TJ", "UZ",
]);

const ZONE_3 = new Set([
  "ZA", "CF", "AO", "AD", "SA", "AM", "AW", "AZ", "BS", "AE", "ET", "HK", "IN", "IQ", "IR", "JP", "YE", "JO", "KH", "CA", "KZ", "KE", "CN", "KG", "CG", "CD", "KR", "KW", "LA", "LS", "LR", "MG", "MY", "MN", "MZ", "NA", "NP", "NE", "NG", "OM", "PK", "RW", "SN", "SL", "SG", "SO", "LK", "SZ", "SR", "PM", "TW", "TH", "TZ", "TG", "TT", "TM", "UG", "US", "VN", "JM", "ZM", "ZW",
]);

const ZONE_4 = new Set([
  "AR", "AU", "BH", "BD", "BB", "BJ", "BM", "BT", "BO", "CI", "BW", "BR", "BN", "BF", "BI", "TD", "DO", "EC", "SV", "ER", "PH", "FJ", "GA", "GM", "GH", "GP", "GY", "GF", "GU", "GT", "GW", "GQ", "GN", "HT", "HN", "ID", "NC", "CM", "QA", "CV", "CL", "CO", "CR", "CU", "MO", "MW", "ML", "MH", "MQ", "MR", "MU", "MX", "NR", "NI", "PA", "PY", "PG", "PE", "PR", "RE", "AS", "SC", "SB", "UY", "VU", "VE", "VI", "DJ", "NZ",
]);

let currentDirection: "outbound" | "inbound" = "outbound";
let currentCountry = "AL";

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const toNumber = (value: string) => Number(value.replace(/,/g, ".")) || 0;
const allToEur = (value: number) => value / EUR_TO_ALL;
const formatAll = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

function isRuntimeResult(value: unknown): value is EmsRuntimeResult {
  return !!value && typeof value === "object" && "name" in value && "details" in value && "serviceType" in value;
}

function isAlbanian() {
  return document.body.textContent?.includes("Rivendos") ?? false;
}

function zoneForCountry(code: string): EmsZone | null {
  if (ZONE_1.has(code)) return 1;
  if (ZONE_2.has(code)) return 2;
  if (ZONE_3.has(code)) return 3;
  if (ZONE_4.has(code)) return 4;
  return null;
}

function inputValues(placeholder: string) {
  return Array.from(document.querySelectorAll<HTMLInputElement>(`input[placeholder="${placeholder}"]`))
    .map((input) => toNumber(input.value));
}

function priceForPackage(weightKg: number, zone: EmsZone) {
  if (!(weightKg > 0) || weightKg > MAX_WEIGHT_KG) return null;
  const grams = weightKg * 1000;
  if (grams <= 10000) {
    const index = WEIGHT_LIMITS_GRAMS.findIndex((limit) => grams <= limit + 1e-9);
    return index >= 0 ? RATES_ALL[zone][index] : null;
  }
  const additionalKg = Math.ceil(weightKg - 10 - 1e-9);
  return RATES_ALL[zone][RATES_ALL[zone].length - 1] + additionalKg * EXTRA_KG_ALL[zone];
}

function unavailable(result: EmsRuntimeResult, reason: string, details: string[] = []) {
  result.name = "Posta Shqiptare (EMS)";
  result.serviceType = "MBE Economy";
  result.price = null;
  result.possible = false;
  result.status = "no";
  result.warning = reason;
  result.details = [EMS_MARKER, ...details];
}

function applyEmsRate(result: EmsRuntimeResult) {
  result.name = "Posta Shqiptare (EMS)";
  result.serviceType = "MBE Economy";
  if (result.details.some((detail) => detail.startsWith(EMS_MARKER))) return;

  const sq = isAlbanian();
  if (currentDirection !== "outbound") {
    unavailable(
      result,
      sq ? "EMS është i disponueshëm vetëm për eksport nga Shqipëria." : "EMS is available for export from Albania only.",
    );
    return;
  }

  const zone = zoneForCountry(currentCountry);
  if (!zone) {
    unavailable(
      result,
      sq ? "Destinacioni nuk figuron në listën zyrtare të zonave EMS." : "The destination is not listed in the official EMS zone table.",
    );
    return;
  }

  const weights = inputValues("kg");
  if (!weights.length || weights.some((weight) => !(weight > 0))) {
    unavailable(result, sq ? "Vendosni peshën reale të çdo pakoje." : "Enter the actual weight of every package.");
    return;
  }

  const overweightIndex = weights.findIndex((weight) => weight > MAX_WEIGHT_KG);
  if (overweightIndex >= 0) {
    unavailable(
      result,
      sq ? `Pakoja ${overweightIndex + 1} tejkalon kufirin EMS prej 20 kg.` : `Package ${overweightIndex + 1} exceeds the EMS limit of 20 kg.`,
      [sq ? "Maksimumi: 20 kg për pako" : "Maximum: 20 kg per package"],
    );
    return;
  }

  const dimensions = inputValues("cm");
  const oversizedIndex = dimensions.findIndex((dimension) => dimension > MAX_SINGLE_DIMENSION_CM);
  if (oversizedIndex >= 0) {
    unavailable(
      result,
      sq ? "Të paktën një përmasë tejkalon kufirin EMS prej 150 cm." : "At least one dimension exceeds the EMS limit of 150 cm.",
      [sq ? "Maksimumi i një ane: 150 cm" : "Maximum single dimension: 150 cm"],
    );
    return;
  }

  const packagePrices = weights.map((weight) => priceForPackage(weight, zone));
  if (packagePrices.some((price) => price === null)) {
    unavailable(result, sq ? "Nuk u gjet tarifa EMS për peshën e vendosur." : "No EMS tariff was found for the entered weight.");
    return;
  }

  const totalAll = (packagePrices as number[]).reduce((sum, price) => sum + price, 0);
  const weightsText = weights.map((weight, index) => `${index + 1}: ${weight.toFixed(2)} kg`).join(", ");
  const packagePriceText = (packagePrices as number[]).map((price, index) => `${index + 1}: ${formatAll(price)} ALL`).join(", ");

  result.price = round2(allToEur(totalAll));
  result.possible = true;
  result.status = "ok";
  result.warning = undefined;
  result.details = sq
    ? [
        `${EMS_MARKER} · Eksport`,
        `Zona EMS: ${zone}`,
        `Pakot / pesha reale: ${weightsText}`,
        `Tarifa sipas pakos: ${packagePriceText}`,
        `Totali: ${formatAll(totalAll)} ALL`,
        "EMS llogaritet sipas peshës reale, jo peshës vëllimore.",
        "Maksimumi: 20 kg për pako dhe 150 cm për një anë.",
      ]
    : [
        `${EMS_MARKER} · Export`,
        `EMS zone: ${zone}`,
        `Packages / actual weight: ${weightsText}`,
        `Tariff by package: ${packagePriceText}`,
        `Total: ${formatAll(totalAll)} ALL`,
        "EMS is calculated using actual weight, not volumetric weight.",
        "Maximum: 20 kg per package and 150 cm for one dimension.",
      ];
}

function applyEmsRates(results: EmsRuntimeResult[]) {
  const result = results.find((item) => item.name === "Posta Shqiptare (EMS)");
  if (result) applyEmsRate(result);
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement) currentCountry = target.value;
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
const emsFilter = function <T>(
  this: T[],
  callbackfn: (value: T, index: number, array: T[]) => unknown,
  thisArg?: unknown,
): T[] {
  if (this.some(isRuntimeResult)) applyEmsRates(this as unknown as EmsRuntimeResult[]);
  return previousFilter.call(this, callbackfn, thisArg);
};

Array.prototype.filter = emsFilter as typeof Array.prototype.filter;
