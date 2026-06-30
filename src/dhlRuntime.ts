type Direction = "outbound" | "inbound";
type ShipmentType = "documents" | "parcel";
type RuntimeResult = {
  name: string;
  price: number | null;
  possible: boolean;
  details: string[];
  serviceType: "MBE Economy" | "MBE Express";
  status: "ok" | "surcharge" | "no";
  warning?: string;
};

let currentDirection: Direction = "outbound";
let currentCountry = "AL";
let currentShipmentType: ShipmentType = "parcel";

const DHL_ECONOMY_FUEL = 0.30;
const DHL_EXPRESS_FUEL = 0.4725;

const EXPRESS_ZONES: Record<string, number> = {
  GR: 1, IT: 2, DE: 2, AT: 2, HR: 3, FR: 3, ES: 3, GB: 3,
  US: 4, CA: 4, AE: 5, CN: 5, AU: 6,
};

const ECONOMY_ZONES: Record<string, number> = {
  GR: 1, IT: 2, DE: 2, AT: 2, HR: 3, FR: 3, ES: 3, GB: 3,
};

const ECONOMY_EXPORT: number[][] = [
  [21.43, 21.43, 21.43, 21.43, 21.43, 22.49, 23.55, 24.61, 25.67, 26.73, 27.6, 28.47, 29.34, 30.21, 31.08, 31.95, 32.82, 33.69, 34.56, 35.43, 35.88, 36.33, 36.78, 37.23, 37.68, 38.13, 38.58, 39.03, 39.48, 39.93, 40.96, 41.98, 43.01, 44.03, 45.06, 46.08, 47.11, 48.13, 49.16, 50.18, 51.21, 52.23, 53.26, 54.28, 55.31, 56.33, 57.36, 58.38, 59.41, 60.43, 61.46, 62.48, 63.51, 64.53, 65.56, 66.58, 67.61, 68.63, 69.66, 70.68, 71.71, 72.73, 73.76, 74.78, 75.81, 76.83, 77.86, 78.88, 79.91, 80.93],
  [23.58, 23.58, 23.58, 23.58, 23.58, 24.76, 25.94, 27.12, 28.3, 29.48, 30.44, 31.41, 32.37, 33.34, 34.3, 35.27, 36.23, 37.2, 38.16, 39.13, 39.61, 40.09, 40.57, 41.05, 41.53, 42.01, 42.49, 42.97, 43.45, 43.93, 45.06, 46.2, 47.33, 48.47, 49.6, 50.74, 51.87, 53.01, 54.14, 55.28, 56.41, 57.55, 58.68, 59.82, 60.95, 62.09, 63.22, 64.36, 65.49, 66.63, 67.76, 68.9, 70.03, 71.17, 72.3, 73.44, 74.57, 75.71, 76.84, 77.98, 79.11, 80.25, 81.38, 82.52, 83.65, 84.79, 85.92, 87.06, 88.19, 89.33],
  [27.1, 27.1, 27.1, 27.1, 27.1, 28.44, 29.78, 31.12, 32.46, 33.8, 34.92, 36.04, 37.16, 38.28, 39.4, 40.52, 41.64, 42.76, 43.88, 45, 45.56, 46.12, 46.68, 47.24, 47.8, 48.36, 48.92, 49.48, 50.04, 50.6, 51.9, 53.21, 54.51, 55.82, 57.12, 58.43, 59.73, 61.04, 62.34, 63.65, 64.95, 66.26, 67.56, 68.87, 70.17, 71.48, 72.78, 74.09, 75.39, 76.7, 78, 79.31, 80.61, 81.92, 83.22, 84.53, 85.83, 87.14, 88.44, 89.75, 91.05, 92.36, 93.66, 94.97, 96.27, 97.58, 98.88, 100.19, 101.49, 102.8]
];

const ECONOMY_IMPORT: number[][] = [
  [23.58, 23.58, 23.58, 23.58, 23.58, 24.74, 25.91, 27.07, 28.24, 29.4, 30.36, 31.31, 32.27, 33.22, 34.18, 35.13, 36.09, 37.04, 38, 38.95, 39.45, 39.94, 40.44, 40.93, 41.43, 41.92, 42.42, 42.91, 43.41, 43.9, 45.03, 46.16, 47.29, 48.42, 49.55, 50.68, 51.81, 52.94, 54.07, 55.2, 56.33, 57.46, 58.59, 59.72, 60.85, 61.98, 63.11, 64.24, 65.37, 66.5, 67.63, 68.76, 69.89, 71.02, 72.15, 73.28, 74.41, 75.54, 76.67, 77.8, 78.93, 80.06, 81.19, 82.32, 83.45, 84.58, 85.71, 86.84, 87.97, 89.1],
  [25.94, 25.94, 25.94, 25.94, 25.94, 27.24, 28.54, 29.84, 31.14, 32.44, 33.5, 34.56, 35.62, 36.68, 37.74, 38.8, 39.86, 40.92, 41.98, 43.04, 43.57, 44.1, 44.63, 45.16, 45.69, 46.22, 46.75, 47.28, 47.81, 48.34, 49.59, 50.84, 52.09, 53.34, 54.59, 55.84, 57.09, 58.34, 59.59, 60.84, 62.09, 63.34, 64.59, 65.84, 67.09, 68.34, 69.59, 70.84, 72.09, 73.34, 74.59, 75.84, 77.09, 78.34, 79.59, 80.84, 82.09, 83.34, 84.59, 85.84, 87.09, 88.34, 89.59, 90.84, 92.09, 93.34, 94.59, 95.84, 97.09, 98.34],
  [29.81, 29.81, 29.81, 29.81, 29.81, 31.28, 32.76, 34.23, 35.71, 37.18, 38.41, 39.64, 40.87, 42.1, 43.33, 44.56, 45.79, 47.02, 48.25, 49.48, 50.1, 50.71, 51.33, 51.94, 52.56, 53.17, 53.79, 54.4, 55.02, 55.63, 57.07, 58.5, 59.94, 61.37, 62.81, 64.24, 65.68, 67.11, 68.55, 69.98, 71.42, 72.85, 74.29, 75.72, 77.16, 78.59, 80.03, 81.46, 82.9, 84.33, 85.77, 87.2, 88.64, 90.07, 91.51, 92.94, 94.38, 95.81, 97.25, 98.68, 100.12, 101.55, 102.99, 104.42, 105.86, 107.29, 108.73, 110.16, 111.6, 113.03]
];

const EXPRESS_EXPORT_DOC = [
  [16.8, 19.77, 20.65, 21.35, 23.1, 26.95],
  [20.39, 23.81, 24.69, 25.39, 28.35, 32.56],
  [23.99, 27.86, 28.73, 29.43, 33.25, 37.64],
  [27.58, 31.9, 32.77, 33.47, 38.15, 42.71]
];
const EXPRESS_IMPORT_DOC = [
  [19.32, 22.74, 23.75, 24.55, 26.56, 30.99],
  [23.45, 27.39, 28.39, 29.2, 32.6, 37.45],
  [27.59, 32.04, 33.04, 33.84, 38.24, 43.29],
  [31.72, 36.68, 37.69, 38.49, 43.87, 49.13]
];
const EXPRESS_EXPORT_NON_DOC = [
  [24.65, 26.7, 28.35, 29.22, 32.22, 37.46],
  [29.11, 31.6, 33.42, 34.54, 38.1, 43.75],
  [33.58, 36.54, 38.38, 40.09, 43.98, 50.03],
  [38.05, 41.47, 43.33, 45.64, 49.86, 56.32],
  [42.51, 45.94, 47.81, 50.59, 55.74, 62.6],
  [46.98, 50.39, 52.32, 55.6, 61.15, 68.02],
  [51.45, 54.83, 56.84, 60.6, 66.57, 73.43],
  [55.92, 59.28, 61.35, 65.61, 71.98, 78.84],
  [60.39, 63.72, 65.87, 70.61, 77.4, 84.25],
  [64.86, 68.17, 70.38, 75.62, 82.81, 89.66],
  [67.78, 71.14, 73.73, 78.96, 87.08, 93.93],
  [70.7, 74.12, 77.07, 82.3, 91.34, 98.19],
  [73.62, 77.09, 80.41, 85.64, 95.61, 102.46],
  [76.54, 80.07, 83.75, 88.99, 99.88, 106.73],
  [79.46, 83.04, 87.1, 92.33, 104.14, 110.99],
  [82.38, 86.02, 90.44, 95.67, 108.41, 115.26],
  [85.29, 88.99, 93.78, 99.01, 112.68, 119.52],
  [88.21, 91.97, 97.12, 102.36, 116.94, 123.79],
  [91.13, 94.94, 100.47, 105.7, 121.21, 128.06],
  [94.05, 97.92, 103.81, 109.04, 125.47, 132.32]
];
const EXPRESS_IMPORT_NON_DOC = [
  [28.34, 30.71, 32.6, 33.61, 37.05, 43.08],
  [33.48, 36.35, 38.44, 39.73, 43.81, 50.31],
  [38.62, 42.02, 44.13, 46.11, 50.57, 57.53],
  [43.76, 47.7, 49.83, 52.49, 57.34, 64.76],
  [48.89, 52.84, 54.98, 58.18, 64.1, 71.99],
  [54.03, 57.96, 60.18, 63.94, 70.33, 78.21],
  [59.17, 63.07, 65.37, 69.7, 76.55, 84.43],
  [64.32, 68.18, 70.56, 75.46, 82.78, 90.66],
  [69.46, 73.3, 75.76, 81.21, 89, 96.88],
  [74.6, 78.41, 80.95, 86.97, 95.23, 103.1],
  [77.96, 81.83, 84.79, 90.81, 100.14, 108.01],
  [81.31, 85.26, 88.64, 94.65, 105.05, 112.92],
  [84.67, 88.68, 92.48, 98.49, 109.95, 117.82],
  [88.02, 92.1, 96.32, 102.33, 114.86, 122.73],
  [91.38, 95.53, 100.17, 106.17, 119.77, 127.64],
  [94.74, 98.95, 104.01, 110.01, 124.67, 132.54],
  [98.09, 102.37, 107.85, 113.85, 129.58, 137.45],
  [101.45, 105.79, 111.7, 117.69, 134.49, 142.36],
  [104.81, 109.22, 115.54, 121.53, 139.39, 147.27],
  [108.16, 112.64, 119.38, 125.37, 144.3, 152.17]
];

const EXPRESS_EXPORT_BASE20 = [146.34, 151.40, 165.55, 171.20, 206.25, 222.13];
const EXPRESS_EXPORT_BASE30 = [198.63, 204.74, 227.85, 233.50, 287.03, 311.80];
const EXPRESS_EXPORT_BASE70 = [377.41, 387.16, 426.51, 453.86, 544.77, 595.58];
const EXPRESS_IMPORT_BASE20 = [168.29, 174.17, 190.36, 196.91, 237.19, 255.42];
const EXPRESS_IMPORT_BASE30 = [228.42, 235.42, 262.04, 268.66, 330.08, 358.53];
const EXPRESS_IMPORT_BASE70 = [433.80, 446.82, 488.84, 522.06, 626.46, 684.87];

const EXPRESS_EXPORT_INC_10_20 = [2.61, 2.67, 3.09, 3.11, 4.04, 4.49];
const EXPRESS_EXPORT_INC_20_30 = [2.61, 2.67, 3.11, 3.11, 4.04, 4.48];
const EXPRESS_EXPORT_INC_30_70 = [4.47, 4.56, 4.97, 5.51, 6.44, 7.09];
const EXPRESS_EXPORT_INC_70_300 = [4.47, 4.56, 5.02, 6.56, 6.44, 7.09];
const EXPRESS_EXPORT_INC_300 = [5.35, 5.45, 5.95, 6.68, 7.52, 8.23];

const EXPRESS_IMPORT_INC_10_20 = [3.01, 3.08, 3.55, 3.58, 4.64, 5.16];
const EXPRESS_IMPORT_INC_20_30 = [3.01, 3.06, 3.58, 3.59, 4.64, 5.16];
const EXPRESS_IMPORT_INC_30_70 = [5.13, 5.28, 5.67, 6.33, 7.41, 8.16];
const EXPRESS_IMPORT_INC_70_300 = [5.13, 5.25, 5.79, 7.51, 7.41, 8.16];
const EXPRESS_IMPORT_INC_300 = [6.16, 6.27, 6.85, 7.69, 8.65, 9.47];

const ECONOMY_EXPORT_BLOCK_70_300 = [5.80, 6.38, 7.34];
const ECONOMY_EXPORT_BLOCK_300 = [17.42, 19.15, 22.01];
const ECONOMY_IMPORT_BLOCK_70_300 = [6.38, 7.02, 8.07];
const ECONOMY_IMPORT_BLOCK_300 = [19.16, 21.06, 24.21];

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const eur = (value: number) => `€${value.toFixed(2)}`;

function isRuntimeResult(value: unknown): value is RuntimeResult {
  return !!value && typeof value === "object" && "name" in value && "serviceType" in value && "details" in value;
}

function parseNumber(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getChargeableWeight(results: RuntimeResult[]) {
  for (const result of results) {
    for (const detail of result.details ?? []) {
      const match = detail.match(/([0-9]+(?:[.,][0-9]+)?)\s*kg/i);
      if (match) return parseNumber(match[1]);
    }
  }

  const kgInput = document.querySelector<HTMLInputElement>('input[placeholder="kg"]');
  return parseNumber(kgInput?.value);
}

function readPackages() {
  if (currentShipmentType !== "parcel") return [] as Array<{ weight: number; length: number; width: number; height: number }>;

  const fields = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[placeholder="kg"], input[placeholder="cm"]'),
  );

  const packages: Array<{ weight: number; length: number; width: number; height: number }> = [];
  for (let index = 0; index + 3 < fields.length; index += 4) {
    packages.push({
      weight: parseNumber(fields[index]?.value),
      length: parseNumber(fields[index + 1]?.value),
      width: parseNumber(fields[index + 2]?.value),
      height: parseNumber(fields[index + 3]?.value),
    });
  }
  return packages;
}

function pieceSurcharges() {
  let total = 0;
  let overweight = 0;
  let oversize = 0;
  let nonConveyable = 0;
  let invalidExpress = false;
  let invalidEconomy = false;

  for (const item of readPackages()) {
    const dimensional = item.length * item.width * item.height / 5000;
    const billablePiece = Math.max(item.weight, dimensional);
    const sortedSides = [item.length, item.width, item.height].sort((a, b) => b - a);

    if (billablePiece > 1000 || sortedSides[0] > 300) invalidExpress = true;
    if (billablePiece > 300 || sortedSides[0] > 300) invalidEconomy = true;

    if (billablePiece > 70) {
      total += 100;
      overweight += 1;
    } else if (sortedSides[0] > 100 || sortedSides[1] > 80) {
      total += 20;
      oversize += 1;
    } else if (item.weight >= 25 && item.weight <= 70) {
      total += 20;
      nonConveyable += 1;
    }
  }

  return { total, overweight, oversize, nonConveyable, invalidExpress, invalidEconomy };
}

function economyTransport(direction: Direction, zone: number, weight: number) {
  const zoneIndex = zone - 1;
  if (zoneIndex < 0 || zoneIndex > 2) return null;

  const table = direction === "outbound" ? ECONOMY_EXPORT : ECONOMY_IMPORT;
  const firstBlock = direction === "outbound" ? ECONOMY_EXPORT_BLOCK_70_300 : ECONOMY_IMPORT_BLOCK_70_300;
  const secondBlock = direction === "outbound" ? ECONOMY_EXPORT_BLOCK_300 : ECONOMY_IMPORT_BLOCK_300;

  const billable = Math.max(1, weight);
  if (billable <= 70) {
    const row = Math.ceil(billable) - 1;
    return table[zoneIndex][row];
  }

  const base70 = table[zoneIndex][69];
  if (billable <= 300) {
    return round2(base70 + Math.ceil((billable - 70) / 5) * firstBlock[zoneIndex]);
  }

  const base300 = base70 + 46 * firstBlock[zoneIndex];
  return round2(base300 + Math.ceil((billable - 300) / 5) * secondBlock[zoneIndex]);
}

function expressTransport(direction: Direction, shipmentType: ShipmentType, zone: number, weight: number) {
  const zoneIndex = zone - 1;
  if (zoneIndex < 0 || zoneIndex > 5) return null;

  const billable = Math.max(0.5, Math.ceil(weight * 2) / 2);
  const docTable = direction === "outbound" ? EXPRESS_EXPORT_DOC : EXPRESS_IMPORT_DOC;
  const nonDocTable = direction === "outbound" ? EXPRESS_EXPORT_NON_DOC : EXPRESS_IMPORT_NON_DOC;

  if (shipmentType === "documents" && billable <= 2) {
    return docTable[Math.ceil(billable * 2) - 1][zoneIndex];
  }

  if (billable <= 10) {
    return nonDocTable[Math.ceil(billable * 2) - 1][zoneIndex];
  }

  const base10 = nonDocTable[19][zoneIndex];
  const base20 = (direction === "outbound" ? EXPRESS_EXPORT_BASE20 : EXPRESS_IMPORT_BASE20)[zoneIndex];
  const base30 = (direction === "outbound" ? EXPRESS_EXPORT_BASE30 : EXPRESS_IMPORT_BASE30)[zoneIndex];
  const base70 = (direction === "outbound" ? EXPRESS_EXPORT_BASE70 : EXPRESS_IMPORT_BASE70)[zoneIndex];
  const inc10 = (direction === "outbound" ? EXPRESS_EXPORT_INC_10_20 : EXPRESS_IMPORT_INC_10_20)[zoneIndex];
  const inc20 = (direction === "outbound" ? EXPRESS_EXPORT_INC_20_30 : EXPRESS_IMPORT_INC_20_30)[zoneIndex];
  const inc30 = (direction === "outbound" ? EXPRESS_EXPORT_INC_30_70 : EXPRESS_IMPORT_INC_30_70)[zoneIndex];
  const inc70 = (direction === "outbound" ? EXPRESS_EXPORT_INC_70_300 : EXPRESS_IMPORT_INC_70_300)[zoneIndex];
  const inc300 = (direction === "outbound" ? EXPRESS_EXPORT_INC_300 : EXPRESS_IMPORT_INC_300)[zoneIndex];

  if (billable < 20) return round2(base10 + Math.ceil((billable - 10) / 0.5) * inc10);
  if (billable === 20) return base20;
  if (billable < 30) return round2(base20 + Math.ceil((billable - 20) / 0.5) * inc20);
  if (billable === 30) return base30;
  if (billable < 70) return round2(base30 + Math.ceil(billable - 30) * inc30);
  if (billable === 70) return base70;
  if (billable <= 300) return round2(base70 + Math.ceil(billable - 70) * inc70);

  const base300 = base70 + 230 * inc70;
  return round2(base300 + Math.ceil(billable - 300) * inc300);
}

function setUnavailable(result: RuntimeResult, name: string, reason: string) {
  result.name = name;
  result.price = null;
  result.possible = false;
  result.status = "no";
  result.details = [reason];
  result.warning = undefined;
}

function setCalculated(
  result: RuntimeResult,
  name: string,
  zone: number,
  weight: number,
  transport: number,
  fuelRate: number,
  extra: ReturnType<typeof pieceSurcharges>,
) {
  const fuelBase = transport + extra.total;
  const fuel = round2(fuelBase * fuelRate);
  const total = round2(fuelBase + fuel);

  const details = [
    "DHL 2026 contract rate",
    `Zone: ${zone}`,
    `Chargeable weight: ${weight.toFixed(2)} kg`,
    `Transport: ${eur(transport)}`,
  ];

  if (extra.total > 0) details.push(`Automatic piece surcharges: ${eur(extra.total)}`);
  if (extra.overweight) details.push(`Overweight pieces: ${extra.overweight} × €100`);
  if (extra.oversize) details.push(`Oversize pieces: ${extra.oversize} × €20`);
  if (extra.nonConveyable) details.push(`Non-conveyable 25–70 kg: ${extra.nonConveyable} × €20`);
  details.push(`Fuel ${(fuelRate * 100).toFixed(2)}%: ${eur(fuel)}`);
  details.push("Remote area, customs and optional services excluded");

  result.name = name;
  result.price = total;
  result.possible = true;
  result.status = extra.total > 0 ? "surcharge" : "ok";
  result.details = details;
  result.warning = fuelRate === DHL_EXPRESS_FUEL
    ? "Express fuel is set to the latest published DHL value available and can be updated."
    : undefined;
}

function applyDhlRates(results: RuntimeResult[]) {
  const weight = getChargeableWeight(results);
  if (!weight || currentCountry === "AL") return;

  const extras = pieceSurcharges();

  for (const result of results) {
    if (result.name === "DHL Standard" || result.name === "DHL Economy Select") {
      const zone = ECONOMY_ZONES[currentCountry];
      if (currentShipmentType === "documents") {
        setUnavailable(result, "DHL Economy Select", "Economy Select is available for parcels / non-documents only.");
        continue;
      }
      if (!zone) {
        setUnavailable(result, "DHL Economy Select", "Economy Select is not available for this country.");
        continue;
      }
      if (weight > 3000 || extras.invalidEconomy) {
        setUnavailable(result, "DHL Economy Select", "DHL Economy Select network limits exceeded.");
        continue;
      }
      const transport = economyTransport(currentDirection, zone, weight);
      if (transport === null) {
        setUnavailable(result, "DHL Economy Select", "No Economy Select tariff available.");
        continue;
      }
      setCalculated(result, "DHL Economy Select", zone, weight, transport, DHL_ECONOMY_FUEL, extras);
    }

    if (result.name === "DHL Express" || result.name === "DHL Express Worldwide") {
      const zone = EXPRESS_ZONES[currentCountry];
      if (!zone) {
        setUnavailable(result, "DHL Express Worldwide", "No DHL Express zone available.");
        continue;
      }
      if (weight > 3000 || extras.invalidExpress) {
        setUnavailable(result, "DHL Express Worldwide", "DHL Express network limits exceeded.");
        continue;
      }
      const transport = expressTransport(currentDirection, currentShipmentType, zone, weight);
      if (transport === null) {
        setUnavailable(result, "DHL Express Worldwide", "No DHL Express tariff available.");
        continue;
      }
      setCalculated(result, "DHL Express Worldwide", zone, weight, transport, DHL_EXPRESS_FUEL, extras);
    }
  }
}

document.addEventListener(
  "change",
  (event) => {
    const target = event.target;
    if (target instanceof HTMLSelectElement) currentCountry = target.value;
  },
  true,
);

document.addEventListener(
  "click",
  (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button");
    if (!button) return;
    const label = button.textContent?.trim() ?? "";

    if (label.includes("Import") || label.includes("Hyrëse")) currentDirection = "inbound";
    if (label.includes("Export") || label.includes("Eksport") || label.includes("Dalëse")) currentDirection = "outbound";
    if (label.includes("Documents") || label.includes("Dokumente") || label.includes("Envelope") || label.includes("Zarf")) currentShipmentType = "documents";
    if (label === "Parcel" || label === "Pako" || label.includes("📦")) currentShipmentType = "parcel";

    if (label === "Reset" || label === "Rivendos") {
      currentDirection = "outbound";
      currentCountry = "AL";
      currentShipmentType = "parcel";
    }
  },
  true,
);

const previousFilter = Array.prototype.filter;
const dhlFilter = function <T>(
  this: T[],
  callbackfn: (value: T, index: number, array: T[]) => unknown,
  thisArg?: unknown,
): T[] {
  if (this.some(isRuntimeResult)) applyDhlRates(this as unknown as RuntimeResult[]);
  return previousFilter.call(this, callbackfn, thisArg);
};

Array.prototype.filter = dhlFilter as typeof Array.prototype.filter;

function styleDhlBadges() {
  document.querySelectorAll<HTMLElement>("div").forEach((element) => {
    const text = element.textContent?.trim();
    if (text !== "DHL Economy Select" && text !== "DHL Express Worldwide") return;
    if (element.style.borderRadius !== "999px" && element.style.minHeight !== "34px") return;

    element.style.background = "#ffcc00";
    element.style.color = "#d40511";
    element.style.border = "1px solid #e6b800";
    element.style.textShadow = "none";
    element.style.boxShadow = "0 1px 2px rgba(15,23,42,.12)";
    element.style.fontWeight = "800";

    const duplicate = element.nextElementSibling;
    if (duplicate instanceof HTMLElement && duplicate.textContent?.trim() === text) {
      duplicate.style.display = "none";
    }
  });
}

new MutationObserver(styleDhlBadges).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});

queueMicrotask(styleDhlBadges);
