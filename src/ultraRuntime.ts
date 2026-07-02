type UltraRuntimeResult = {
  name: string;
  price: number | null;
  possible: boolean;
  details: string[];
  serviceType: "MBE Economy" | "MBE Express";
  status: "ok" | "surcharge" | "no";
  warning?: string;
};

type UltraArea = "tirana-city" | "tirana-rural" | "district-city" | "district-rural";

type AreaDefinition = {
  priceAll: number;
  deliveryEn: string;
  deliverySq: string;
  labelEn: string;
  labelSq: string;
};

type PostalClassification = {
  area: UltraArea;
  postalCode: string;
  districtEn: string;
  districtSq: string;
};

const EUR_TO_ALL = 93.9135;
const ULTRA_EXTRA_KG_ALL = 50;
const ULTRA_INCLUDED_WEIGHT_KG = 2;
const ULTRA_KOSOVO_BASE_EUR = 7;
const ULTRA_MARKER = "ULTRA contract tariff";

const ULTRA_AREAS: Record<UltraArea, AreaDefinition> = {
  "tirana-city": {
    priceAll: 200,
    deliveryEn: "24 hours",
    deliverySq: "24 orë",
    labelEn: "Tirana – city",
    labelSq: "Tiranë – qytet",
  },
  "tirana-rural": {
    priceAll: 250,
    deliveryEn: "24–48 hours",
    deliverySq: "24–48 orë",
    labelEn: "Tirana – surrounding / rural area",
    labelSq: "Tiranë – zonë përreth / rurale",
  },
  "district-city": {
    priceAll: 250,
    deliveryEn: "24 hours",
    deliverySq: "24 orë",
    labelEn: "Other district – city",
    labelSq: "Rrethe – qytet",
  },
  "district-rural": {
    priceAll: 250,
    deliveryEn: "24–72 hours",
    deliverySq: "24–72 orë",
    labelEn: "Other district – local / rural area",
    labelSq: "Rrethe – zonë lokale / rurale",
  },
};

function codeRange(prefix: number, first: number, last: number) {
  return Array.from({ length: last - first + 1 }, (_, index) =>
    `${prefix}${String(first + index).padStart(2, "0")}`,
  );
}

// Current Posta Shqiptare Tirana office list. Clear city-office codes are kept
// separate from Kamëz, Vorë and the surrounding administrative units.
const TIRANA_CITY_CODES = new Set([
  ...codeRange(10, 1, 28),
  "1031",
  "1046",
  "1055",
  "1057",
  "1058",
  ...codeRange(10, 60, 65),
]);

const TIRANA_SURROUNDING_CODES = new Set([
  "1029",
  "1030",
  ...codeRange(10, 32, 45),
  ...codeRange(10, 47, 54),
]);

// High-confidence urban postal-office codes outside Tirana. Any recognized
// Albanian district code not listed here is treated conservatively as a
// local/rural route, which only affects the displayed delivery estimate; the
// ULTRA price outside Tirana remains 250 ALL in either case.
const OTHER_CITY_CODES = new Set([
  ...codeRange(15, 1, 2),
  ...codeRange(20, 1, 9),
  ...codeRange(25, 1, 4),
  ...codeRange(30, 1, 8), "3031", "3034",
  "3301",
  ...codeRange(34, 1, 4),
  "3501",
  ...codeRange(40, 1, 8),
  "4301",
  ...codeRange(44, 1, 2),
  ...codeRange(45, 1, 3),
  "4601",
  ...codeRange(47, 1, 2),
  ...codeRange(50, 1, 4),
  ...codeRange(53, 1, 2),
  ...codeRange(54, 1, 2),
  ...codeRange(60, 1, 3),
  ...codeRange(63, 1, 2),
  ...codeRange(64, 1, 2),
  ...codeRange(70, 1, 4),
  ...codeRange(73, 1, 3),
  ...codeRange(74, 1, 2),
  ...codeRange(80, 1, 3),
  "8301",
  ...codeRange(84, 1, 3),
  "8501",
  "8601",
  "8701",
  ...codeRange(90, 1, 5),
  ...codeRange(93, 1, 8), "9314",
  ...codeRange(94, 1, 5),
  ...codeRange(97, 1, 4),
]);

const POSTAL_DISTRICTS: Record<string, { en: string; sq: string }> = {
  "10": { en: "Tirana", sq: "Tiranë" },
  "15": { en: "Krujë", sq: "Krujë" },
  "20": { en: "Durrës", sq: "Durrës" },
  "25": { en: "Kavajë", sq: "Kavajë" },
  "30": { en: "Elbasan", sq: "Elbasan" },
  "33": { en: "Gramsh", sq: "Gramsh" },
  "34": { en: "Librazhd", sq: "Librazhd" },
  "35": { en: "Peqin", sq: "Peqin" },
  "40": { en: "Shkodër", sq: "Shkodër" },
  "43": { en: "Malësi e Madhe", sq: "Malësi e Madhe" },
  "44": { en: "Pukë", sq: "Pukë" },
  "45": { en: "Lezhë", sq: "Lezhë" },
  "46": { en: "Mirditë", sq: "Mirditë" },
  "47": { en: "Kurbin", sq: "Kurbin" },
  "50": { en: "Berat", sq: "Berat" },
  "53": { en: "Kuçovë", sq: "Kuçovë" },
  "54": { en: "Skrapar", sq: "Skrapar" },
  "60": { en: "Gjirokastër", sq: "Gjirokastër" },
  "63": { en: "Tepelenë", sq: "Tepelenë" },
  "64": { en: "Përmet", sq: "Përmet" },
  "70": { en: "Korçë", sq: "Korçë" },
  "73": { en: "Pogradec", sq: "Pogradec" },
  "74": { en: "Kolonjë", sq: "Kolonjë" },
  "80": { en: "Mat", sq: "Mat" },
  "83": { en: "Dibër", sq: "Dibër" },
  "84": { en: "Bulqizë", sq: "Bulqizë" },
  "85": { en: "Kukës", sq: "Kukës" },
  "86": { en: "Has", sq: "Has" },
  "87": { en: "Tropojë", sq: "Tropojë" },
  "90": { en: "Lushnjë", sq: "Lushnjë" },
  "93": { en: "Fier", sq: "Fier" },
  "94": { en: "Vlorë", sq: "Vlorë" },
  "97": { en: "Sarandë", sq: "Sarandë" },
};

let currentDirection: "outbound" | "inbound" = "outbound";
let currentCountry = "AL";
let currentPostalCode = "";

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const toNumber = (value: string) => Number(value.replace(/,/g, ".")) || 0;
const allToEur = (value: number) => value / EUR_TO_ALL;
const formatAll = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const normalizePostalCode = (value: string) => value.replace(/\D/g, "").slice(0, 4);

function isRuntimeResult(value: unknown): value is UltraRuntimeResult {
  return !!value && typeof value === "object" && "name" in value && "details" in value && "serviceType" in value;
}

function isAlbanian() {
  return document.body.textContent?.includes("Rivendos") ?? false;
}

function inputValues(placeholder: string) {
  return Array.from(document.querySelectorAll<HTMLInputElement>(`input[placeholder="${placeholder}"]`))
    .map((input) => toNumber(input.value));
}

function totalActualWeight() {
  return round2(inputValues("kg").reduce((sum, value) => sum + value, 0));
}

function codEnabled() {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
    .some((input) => input.checked);
}

function additionalWeightFeeAll(weight: number) {
  return round2(Math.max(0, weight - ULTRA_INCLUDED_WEIGHT_KG) * ULTRA_EXTRA_KG_ALL);
}

function classifyPostalCode(value: string): PostalClassification | null {
  const postalCode = normalizePostalCode(value);
  if (!/^\d{4}$/.test(postalCode)) return null;

  if (TIRANA_CITY_CODES.has(postalCode)) {
    return { area: "tirana-city", postalCode, districtEn: "Tirana", districtSq: "Tiranë" };
  }
  if (TIRANA_SURROUNDING_CODES.has(postalCode)) {
    return { area: "tirana-rural", postalCode, districtEn: "Tirana", districtSq: "Tiranë" };
  }

  const district = POSTAL_DISTRICTS[postalCode.slice(0, 2)];
  if (!district || postalCode.endsWith("00")) return null;

  return {
    area: OTHER_CITY_CODES.has(postalCode) ? "district-city" : "district-rural",
    postalCode,
    districtEn: district.en,
    districtSq: district.sq,
  };
}

function isFullCarrierResultSet(results: UltraRuntimeResult[]) {
  const names = new Set(results.map((result) => result.name));
  return names.has("Posta Shqiptare (EMS)") && names.has("FedEx");
}

function ensureKosovoResult(results: UltraRuntimeResult[]) {
  if (currentDirection !== "outbound" || currentCountry !== "XK") return;
  if (!isFullCarrierResultSet(results) || results.some((result) => result.name === "Ultra")) return;

  results.push({
    name: "Ultra",
    price: null,
    possible: false,
    details: [],
    serviceType: "MBE Express",
    status: "no",
  });
}

function applyDomesticOffer(result: UltraRuntimeResult, weight: number, albanian: boolean) {
  result.serviceType = "MBE Express";

  const classification = classifyPostalCode(currentPostalCode);
  if (!classification) {
    result.price = null;
    result.possible = false;
    result.status = "no";
    result.warning = albanian
      ? "Vendosni një kod postar shqiptar të vlefshëm me 4 shifra."
      : "Enter a valid four-digit Albanian destination postal code.";
    result.details = [
      ULTRA_MARKER,
      albanian
        ? "Zona dhe çmimi përcaktohen automatikisht nga kodi postar."
        : "The delivery area and price are determined automatically from the postal code.",
      albanian
        ? "Tarifa llogaritet për dërgesë, jo për çdo pako."
        : "The tariff is calculated per shipment, not per package.",
    ];
    return;
  }

  const area = ULTRA_AREAS[classification.area];
  const extraAll = additionalWeightFeeAll(weight);
  const totalAll = round2(area.priceAll + extraAll);
  const details = albanian
    ? [
        `${ULTRA_MARKER}: çmimet përfshijnë TVSH`,
        `Kodi postar: ${classification.postalCode}`,
        `Filiali / rrethi: ${classification.districtSq}`,
        `Zona: ${area.labelSq}`,
        `Koha normale e dorëzimit: ${area.deliverySq}`,
        `Pesha reale totale e dërgesës: ${weight.toFixed(2)} kg`,
        `Tarifa 0–2 kg: ${area.priceAll} ALL`,
        "Llogaritet një herë për të gjithë dërgesën, edhe kur ka disa pako.",
        codEnabled() ? "COD: nuk është përcaktuar tarifë e veçantë në aneks" : "COD: —",
      ]
    : [
        `${ULTRA_MARKER}: prices include VAT`,
        `Postal code: ${classification.postalCode}`,
        `Postal branch / district: ${classification.districtEn}`,
        `Area: ${area.labelEn}`,
        `Normal delivery time: ${area.deliveryEn}`,
        `Total actual shipment weight: ${weight.toFixed(2)} kg`,
        `0–2 kg tariff: ${area.priceAll} ALL`,
        "Charged once for the complete shipment, including multi-package shipments.",
        codEnabled() ? "COD: no separate fee is stated in the annex" : "COD: —",
      ];

  if (extraAll > 0) {
    details.splice(7, 0, albanian
      ? `Mbi 2 kg: ${ULTRA_EXTRA_KG_ALL} ALL/kg (+${formatAll(extraAll)} ALL)`
      : `Above 2 kg: ${ULTRA_EXTRA_KG_ALL} ALL/kg (+${formatAll(extraAll)} ALL)`);
  }

  result.price = round2(allToEur(totalAll));
  result.possible = true;
  result.status = "ok";
  result.warning = undefined;
  result.details = details;
}

function applyKosovoOffer(result: UltraRuntimeResult, weight: number, albanian: boolean) {
  result.serviceType = "MBE Express";

  const extraAll = additionalWeightFeeAll(weight);
  const totalEur = round2(ULTRA_KOSOVO_BASE_EUR + allToEur(extraAll));
  const details = albanian
    ? [
        `${ULTRA_MARKER}: çmimet përfshijnë TVSH`,
        "Destinacioni: Kosovë",
        "Koha normale e dorëzimit: 4 ditë pune",
        `Pesha reale totale e dërgesës: ${weight.toFixed(2)} kg`,
        `Tarifa 0–2 kg: ${ULTRA_KOSOVO_BASE_EUR} EUR`,
        "Llogaritet një herë për të gjithë dërgesën, edhe kur ka disa pako.",
      ]
    : [
        `${ULTRA_MARKER}: prices include VAT`,
        "Destination: Kosovo",
        "Normal delivery time: 4 working days",
        `Total actual shipment weight: ${weight.toFixed(2)} kg`,
        `0–2 kg tariff: €${ULTRA_KOSOVO_BASE_EUR.toFixed(2)}`,
        "Charged once for the complete shipment, including multi-package shipments.",
      ];

  if (extraAll > 0) {
    details.splice(5, 0, albanian
      ? `Mbi 2 kg: ${ULTRA_EXTRA_KG_ALL} ALL/kg (+${formatAll(extraAll)} ALL)`
      : `Above 2 kg: ${ULTRA_EXTRA_KG_ALL} ALL/kg (+${formatAll(extraAll)} ALL)`);
  }

  result.price = totalEur;
  result.possible = true;
  result.status = "ok";
  result.warning = undefined;
  result.details = details;
}

function applyUltraOffer(results: UltraRuntimeResult[]) {
  ensureKosovoResult(results);

  const result = results.find((item) => item.name === "Ultra");
  if (!result) return;

  result.serviceType = "MBE Express";
  if (result.details.some((detail) => detail.startsWith(ULTRA_MARKER))) return;

  const weight = totalActualWeight();
  const albanian = isAlbanian();

  if (currentDirection === "outbound" && currentCountry === "AL") {
    applyDomesticOffer(result, weight, albanian);
    return;
  }

  if (currentDirection === "outbound" && currentCountry === "XK") {
    applyKosovoOffer(result, weight, albanian);
  }
}

function triggerRecalculation() {
  const input = document.querySelector<HTMLInputElement>('input[placeholder="kg"]');
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, input.value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function removeLegacyAreaUi() {
  document.querySelector<HTMLElement>('[data-ultra-area="true"]')?.remove();
}

function updatePostalCodeUi() {
  removeLegacyAreaUi();

  const input = document.getElementById("dhl-zip-code");
  const wrapper = input?.closest<HTMLElement>('[data-smart-zip="true"], .smart-zip-wrap');
  if (!(input instanceof HTMLInputElement) || !wrapper) return;

  const domestic = currentDirection === "outbound" && currentCountry === "AL";
  if (!domestic) return;

  wrapper.hidden = false;
  input.maxLength = 4;
  input.inputMode = "numeric";
  input.placeholder = "1001";

  const albanian = isAlbanian();
  const label = wrapper.querySelector<HTMLElement>(".smart-zip-label");
  const help = wrapper.querySelector<HTMLElement>(".smart-zip-help");
  const nextLabel = albanian ? "Kodi postar i destinacionit" : "Destination postal code";
  const nextHelp = albanian
    ? "ULTRA përcakton automatikisht zonën, çmimin dhe afatin nga kodi postar."
    : "ULTRA automatically determines the area, price and delivery time from the postal code.";

  if (label && label.textContent !== nextLabel) label.textContent = nextLabel;
  if (help && help.textContent !== nextHelp) help.textContent = nextHelp;
}

function updateDomesticEconomySection() {
  const domestic = currentDirection === "outbound" && currentCountry === "AL";
  document.querySelectorAll<HTMLDetailsElement>("details").forEach((section) => {
    const summary = section.querySelector(":scope > summary");
    const text = summary?.textContent?.toLowerCase() ?? "";
    if (text.includes("economy") && section.hidden !== domestic) section.hidden = domestic;
  });
}

function updateUi() {
  updatePostalCodeUi();
  updateDomesticEconomySection();
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  currentCountry = target.value;
  if (currentCountry !== "AL") currentPostalCode = "";
  queueMicrotask(updateUi);
}, true);

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.id !== "dhl-zip-code") return;

  const normalized = currentCountry === "AL"
    ? normalizePostalCode(target.value)
    : target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (target.value !== normalized) target.value = normalized;
  currentPostalCode = normalized;
  triggerRecalculation();
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
    currentPostalCode = "";
  }

  queueMicrotask(updateUi);
}, true);

const previousFilter = Array.prototype.filter;
const ultraFilter = function <T>(
  this: T[],
  callbackfn: (value: T, index: number, array: T[]) => unknown,
  thisArg?: unknown,
): T[] {
  if (this.some(isRuntimeResult)) applyUltraOffer(this as unknown as UltraRuntimeResult[]);
  return previousFilter.call(this, callbackfn, thisArg);
};
Array.prototype.filter = ultraFilter as typeof Array.prototype.filter;

const uiObserver = new MutationObserver(updateUi);
uiObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
queueMicrotask(updateUi);
