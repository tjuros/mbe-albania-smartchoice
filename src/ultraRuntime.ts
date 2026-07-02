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
type Area = { price: number; en: string; sq: string; etaEn: string; etaSq: string };
type Classification = { area: UltraArea; code: string; districtEn: string; districtSq: string };

const EUR_TO_ALL = 93.9135;
const EXTRA_KG_ALL = 50;
const INCLUDED_KG = 2;
const KOSOVO_BASE_EUR = 7;
const MARKER = "ULTRA contract tariff";

const AREAS: Record<UltraArea, Area> = {
  "tirana-city": { price: 200, en: "Tirana – city", sq: "Tiranë – qytet", etaEn: "24 hours", etaSq: "24 orë" },
  "tirana-rural": { price: 250, en: "Tirana – surrounding / rural area", sq: "Tiranë – zonë përreth / rurale", etaEn: "24–48 hours", etaSq: "24–48 orë" },
  "district-city": { price: 250, en: "Other district – city", sq: "Rrethe – qytet", etaEn: "24 hours", etaSq: "24 orë" },
  "district-rural": { price: 250, en: "Other district – local / rural area", sq: "Rrethe – zonë lokale / rurale", etaEn: "24–72 hours", etaSq: "24–72 orë" },
};

const range = (prefix: number, first: number, last: number) =>
  Array.from({ length: last - first + 1 }, (_, i) => `${prefix}${String(first + i).padStart(2, "0")}`);

const TIRANA_CITY = new Set([...range(10, 1, 28), "1031", "1046", "1055", "1057", "1058", ...range(10, 60, 65)]);
const TIRANA_SURROUNDING = new Set(["1029", "1030", ...range(10, 32, 45), ...range(10, 47, 54)]);
const OTHER_CITY = new Set([
  ...range(15, 1, 2), ...range(20, 1, 9), ...range(25, 1, 4), ...range(30, 1, 8), "3031", "3034",
  "3301", ...range(34, 1, 4), "3501", ...range(40, 1, 8), "4301", ...range(44, 1, 2),
  ...range(45, 1, 3), "4601", ...range(47, 1, 2), ...range(50, 1, 4), ...range(53, 1, 2),
  ...range(54, 1, 2), ...range(60, 1, 3), ...range(63, 1, 2), ...range(64, 1, 2), ...range(70, 1, 4),
  ...range(73, 1, 3), ...range(74, 1, 2), ...range(80, 1, 3), "8301", ...range(84, 1, 3), "8501",
  "8601", "8701", ...range(90, 1, 5), ...range(93, 1, 8), "9314", ...range(94, 1, 5), ...range(97, 1, 4),
]);

const DISTRICTS: Record<string, [string, string]> = {
  "10": ["Tirana", "Tiranë"], "15": ["Krujë", "Krujë"], "20": ["Durrës", "Durrës"], "25": ["Kavajë", "Kavajë"],
  "30": ["Elbasan", "Elbasan"], "33": ["Gramsh", "Gramsh"], "34": ["Librazhd", "Librazhd"], "35": ["Peqin", "Peqin"],
  "40": ["Shkodër", "Shkodër"], "43": ["Malësi e Madhe", "Malësi e Madhe"], "44": ["Pukë", "Pukë"], "45": ["Lezhë", "Lezhë"],
  "46": ["Mirditë", "Mirditë"], "47": ["Kurbin", "Kurbin"], "50": ["Berat", "Berat"], "53": ["Kuçovë", "Kuçovë"],
  "54": ["Skrapar", "Skrapar"], "60": ["Gjirokastër", "Gjirokastër"], "63": ["Tepelenë", "Tepelenë"], "64": ["Përmet", "Përmet"],
  "70": ["Korçë", "Korçë"], "73": ["Pogradec", "Pogradec"], "74": ["Kolonjë", "Kolonjë"], "80": ["Mat", "Mat"],
  "83": ["Dibër", "Dibër"], "84": ["Bulqizë", "Bulqizë"], "85": ["Kukës", "Kukës"], "86": ["Has", "Has"],
  "87": ["Tropojë", "Tropojë"], "90": ["Lushnjë", "Lushnjë"], "93": ["Fier", "Fier"], "94": ["Vlorë", "Vlorë"],
  "97": ["Sarandë", "Sarandë"],
};

let direction: "outbound" | "inbound" = "outbound";
let country = "AL";
let postalCode = "";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (s: string) => Number(s.replace(/,/g, ".")) || 0;
const toEur = (all: number) => all / EUR_TO_ALL;
const allText = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
const normalizeZip = (s: string) => s.replace(/\D/g, "").slice(0, 4);
const isSq = () => document.body.textContent?.includes("Rivendos") ?? false;
const values = (placeholder: string) => Array.from(document.querySelectorAll<HTMLInputElement>(`input[placeholder="${placeholder}"]`)).map(i => num(i.value));
const totalWeight = () => round2(values("kg").reduce((sum, n) => sum + n, 0));
const cod = () => Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).some(i => i.checked);
const extraAll = (weight: number) => round2(Math.max(0, weight - INCLUDED_KG) * EXTRA_KG_ALL);

function isResult(value: unknown): value is UltraRuntimeResult {
  return !!value && typeof value === "object" && "name" in value && "details" in value && "serviceType" in value;
}

function classify(raw: string): Classification | null {
  const code = normalizeZip(raw);
  if (!/^\d{4}$/.test(code)) return null;
  if (TIRANA_CITY.has(code)) return { area: "tirana-city", code, districtEn: "Tirana", districtSq: "Tiranë" };
  if (TIRANA_SURROUNDING.has(code)) return { area: "tirana-rural", code, districtEn: "Tirana", districtSq: "Tiranë" };
  const district = DISTRICTS[code.slice(0, 2)];
  if (!district || code.endsWith("00")) return null;
  return { area: OTHER_CITY.has(code) ? "district-city" : "district-rural", code, districtEn: district[0], districtSq: district[1] };
}

function ensureKosovo(results: UltraRuntimeResult[]) {
  if (direction !== "outbound" || country !== "XK" || results.some(r => r.name === "Ultra")) return;
  const names = new Set(results.map(r => r.name));
  if (!names.has("Posta Shqiptare (EMS)") || !names.has("FedEx")) return;
  results.push({ name: "Ultra", price: null, possible: false, details: [], serviceType: "MBE Express", status: "no" });
}

function domestic(result: UltraRuntimeResult, weight: number, sq: boolean) {
  const found = classify(postalCode);
  result.serviceType = "MBE Express";
  if (!found) {
    result.price = null;
    result.possible = false;
    result.status = "no";
    result.warning = sq ? "Vendosni një kod postar shqiptar të vlefshëm me 4 shifra." : "Enter a valid four-digit Albanian destination postal code.";
    result.details = [MARKER, sq ? "Zona dhe çmimi përcaktohen automatikisht nga kodi postar." : "The area and price are determined automatically from the postal code."];
    return;
  }

  const area = AREAS[found.area];
  const extra = extraAll(weight);
  const total = round2(area.price + extra);
  const details = sq ? [
    `${MARKER}: çmimet përfshijnë TVSH`, `Kodi postar: ${found.code}`, `Filiali / rrethi: ${found.districtSq}`,
    `Zona: ${area.sq}`, `Koha normale e dorëzimit: ${area.etaSq}`, `Pesha reale totale e dërgesës: ${weight.toFixed(2)} kg`,
    `Tarifa 0–2 kg: ${area.price} ALL`, "Llogaritet një herë për të gjithë dërgesën, edhe kur ka disa pako.",
    cod() ? "COD: nuk është përcaktuar tarifë e veçantë në aneks" : "COD: —",
  ] : [
    `${MARKER}: prices include VAT`, `Postal code: ${found.code}`, `Postal branch / district: ${found.districtEn}`,
    `Area: ${area.en}`, `Normal delivery time: ${area.etaEn}`, `Total actual shipment weight: ${weight.toFixed(2)} kg`,
    `0–2 kg tariff: ${area.price} ALL`, "Charged once for the complete shipment, including multi-package shipments.",
    cod() ? "COD: no separate fee is stated in the annex" : "COD: —",
  ];
  if (extra > 0) details.splice(7, 0, sq ? `Mbi 2 kg: ${EXTRA_KG_ALL} ALL/kg (+${allText(extra)} ALL)` : `Above 2 kg: ${EXTRA_KG_ALL} ALL/kg (+${allText(extra)} ALL)`);
  result.price = round2(toEur(total));
  result.possible = true;
  result.status = "ok";
  result.warning = undefined;
  result.details = details;
}

function kosovo(result: UltraRuntimeResult, weight: number, sq: boolean) {
  const extra = extraAll(weight);
  result.serviceType = "MBE Express";
  result.price = round2(KOSOVO_BASE_EUR + toEur(extra));
  result.possible = true;
  result.status = "ok";
  result.warning = undefined;
  result.details = sq ? [
    `${MARKER}: çmimet përfshijnë TVSH`, "Destinacioni: Kosovë", "Koha normale e dorëzimit: 4 ditë pune",
    `Pesha reale totale e dërgesës: ${weight.toFixed(2)} kg`, `Tarifa 0–2 kg: ${KOSOVO_BASE_EUR} EUR`,
    ...(extra > 0 ? [`Mbi 2 kg: ${EXTRA_KG_ALL} ALL/kg (+${allText(extra)} ALL)`] : []),
    "Llogaritet një herë për të gjithë dërgesën, edhe kur ka disa pako.",
  ] : [
    `${MARKER}: prices include VAT`, "Destination: Kosovo", "Normal delivery time: 4 working days",
    `Total actual shipment weight: ${weight.toFixed(2)} kg`, `0–2 kg tariff: €${KOSOVO_BASE_EUR.toFixed(2)}`,
    ...(extra > 0 ? [`Above 2 kg: ${EXTRA_KG_ALL} ALL/kg (+${allText(extra)} ALL)`] : []),
    "Charged once for the complete shipment, including multi-package shipments.",
  ];
}

function apply(results: UltraRuntimeResult[]) {
  ensureKosovo(results);
  const result = results.find(r => r.name === "Ultra");
  if (!result || result.details.some(d => d.startsWith(MARKER))) return;
  result.serviceType = "MBE Express";
  if (direction === "outbound" && country === "AL") domestic(result, totalWeight(), isSq());
  else if (direction === "outbound" && country === "XK") kosovo(result, totalWeight(), isSq());
}

function recalculate() {
  const input = document.querySelector<HTMLInputElement>('input[placeholder="kg"]');
  if (!input) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, input.value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function updateZipUi() {
  document.querySelector<HTMLElement>('[data-ultra-area="true"]')?.remove();
  const input = document.getElementById("dhl-zip-code");
  const wrapper = input?.closest<HTMLElement>('[data-smart-zip="true"], .smart-zip-wrap');
  if (!(input instanceof HTMLInputElement) || !wrapper) return;
  const domesticRoute = direction === "outbound" && country === "AL";
  if (!domesticRoute) {
    input.maxLength = 12;
    input.inputMode = "text";
    if (input.placeholder === "1001") input.placeholder = "e.g. 1001";
    return;
  }
  wrapper.hidden = false;
  input.maxLength = 4;
  input.inputMode = "numeric";
  input.placeholder = "1001";
  const label = wrapper.querySelector<HTMLElement>(".smart-zip-label");
  const help = wrapper.querySelector<HTMLElement>(".smart-zip-help");
  const sq = isSq();
  const labelText = sq ? "Kodi postar i destinacionit" : "Destination postal code";
  const helpText = sq ? "ULTRA përcakton automatikisht zonën, çmimin dhe afatin nga kodi postar." : "ULTRA automatically determines the area, price and delivery time from the postal code.";
  if (label && label.textContent !== labelText) label.textContent = labelText;
  if (help && help.textContent !== helpText) help.textContent = helpText;
}

function updateEconomyUi() {
  const domesticRoute = direction === "outbound" && country === "AL";
  document.querySelectorAll<HTMLDetailsElement>("details").forEach(section => {
    const text = section.querySelector(":scope > summary")?.textContent?.toLowerCase() ?? "";
    if (text.includes("economy") && section.hidden !== domesticRoute) section.hidden = domesticRoute;
  });
}

const updateUi = () => { updateZipUi(); updateEconomyUi(); };

document.addEventListener("change", event => {
  if (!(event.target instanceof HTMLSelectElement)) return;
  country = event.target.value;
  if (country !== "AL") postalCode = "";
  queueMicrotask(updateUi);
}, true);

document.addEventListener("input", event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.id !== "dhl-zip-code") return;
  const next = country === "AL" ? normalizeZip(input.value) : input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (input.value !== next) input.value = next;
  postalCode = next;
  recalculate();
}, true);

document.addEventListener("click", event => {
  if (!(event.target instanceof Element)) return;
  const label = event.target.closest("button")?.textContent?.trim() ?? "";
  if (label.includes("Import") || label.includes("Hyrëse")) direction = "inbound";
  if (label.includes("Export") || label.includes("Eksport") || label.includes("Dalëse")) direction = "outbound";
  if (label === "Reset" || label === "Rivendos") { direction = "outbound"; country = "AL"; postalCode = ""; }
  queueMicrotask(updateUi);
}, true);

const previousFilter = Array.prototype.filter;
Array.prototype.filter = function <T>(this: T[], callback: (value: T, index: number, array: T[]) => unknown, thisArg?: unknown) {
  if (this.some(isResult)) apply(this as unknown as UltraRuntimeResult[]);
  return previousFilter.call(this, callback, thisArg);
} as typeof Array.prototype.filter;

new MutationObserver(updateUi).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
queueMicrotask(updateUi);
