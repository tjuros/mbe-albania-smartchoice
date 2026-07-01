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
    labelEn: "Tirana – rural area",
    labelSq: "Tiranë – zonë rurale",
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
    labelEn: "Other district – rural area",
    labelSq: "Rrethe – zonë rurale",
  },
};

let currentDirection: "outbound" | "inbound" = "outbound";
let currentCountry = "AL";
let currentArea: UltraArea | null = null;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const toNumber = (value: string) => Number(value.replace(/,/g, ".")) || 0;
const allToEur = (value: number) => value / EUR_TO_ALL;
const formatAll = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

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

  if (!currentArea) {
    result.price = null;
    result.possible = false;
    result.status = "no";
    result.warning = albanian
      ? "Zgjidhni zonën e dorëzimit për të llogaritur çmimin ULTRA."
      : "Select the delivery area to calculate the ULTRA price.";
    result.details = [
      ULTRA_MARKER,
      albanian ? "Tarifa llogaritet për dërgesë, jo për çdo pako." : "The tariff is calculated per shipment, not per package.",
    ];
    return;
  }

  const area = ULTRA_AREAS[currentArea];
  const extraAll = additionalWeightFeeAll(weight);
  const totalAll = round2(area.priceAll + extraAll);
  const details = albanian
    ? [
        `${ULTRA_MARKER}: çmimet përfshijnë TVSH`,
        `Zona: ${area.labelSq}`,
        `Koha normale e dorëzimit: ${area.deliverySq}`,
        `Pesha reale totale e dërgesës: ${weight.toFixed(2)} kg`,
        `Tarifa 0–2 kg: ${area.priceAll} ALL`,
        "Llogaritet një herë për të gjithë dërgesën, edhe kur ka disa pako.",
        codEnabled() ? "COD: nuk është përcaktuar tarifë e veçantë në aneks" : "COD: —",
      ]
    : [
        `${ULTRA_MARKER}: prices include VAT`,
        `Area: ${area.labelEn}`,
        `Normal delivery time: ${area.deliveryEn}`,
        `Total actual shipment weight: ${weight.toFixed(2)} kg`,
        `0–2 kg tariff: ${area.priceAll} ALL`,
        "Charged once for the complete shipment, including multi-package shipments.",
        codEnabled() ? "COD: no separate fee is stated in the annex" : "COD: —",
      ];

  if (extraAll > 0) {
    details.splice(5, 0, albanian
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

function updateAreaButtons(wrapper: HTMLElement) {
  const albanian = isAlbanian();
  const title = wrapper.querySelector<HTMLElement>("[data-ultra-area-title]");
  const help = wrapper.querySelector<HTMLElement>("[data-ultra-area-help]");
  const nextTitle = albanian ? "Zona e dorëzimit ULTRA" : "ULTRA delivery area";
  const nextHelp = albanian
    ? "Kërkohet për çmimin dhe afatin e saktë të dorëzimit."
    : "Required for the exact price and delivery time.";
  if (title && title.textContent !== nextTitle) title.textContent = nextTitle;
  if (help && help.textContent !== nextHelp) help.textContent = nextHelp;

  wrapper.querySelectorAll<HTMLButtonElement>("button[data-ultra-area-option]").forEach((button) => {
    const areaKey = button.dataset.ultraAreaOption as UltraArea;
    const area = ULTRA_AREAS[areaKey];
    const selected = currentArea === areaKey;
    const nextLabel = albanian ? area.labelSq : area.labelEn;
    if (button.textContent !== nextLabel) button.textContent = nextLabel;
    const nextPressed = selected ? "true" : "false";
    if (button.getAttribute("aria-pressed") !== nextPressed) button.setAttribute("aria-pressed", nextPressed);
    button.style.border = selected ? "1px solid #0284c7" : "1px solid #cbd5e1";
    button.style.background = selected ? "#e0f2fe" : "#ffffff";
    button.style.color = selected ? "#075985" : "#334155";
    button.style.fontWeight = selected ? "800" : "700";
  });
}

function ensureAreaUi() {
  const select = document.querySelector<HTMLSelectElement>('select[aria-hidden="true"]') ?? document.querySelector("select");
  const countryContainer = select?.parentElement;
  if (!countryContainer) return;

  let wrapper = countryContainer.querySelector<HTMLElement>('[data-ultra-area="true"]');
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.dataset.ultraArea = "true";
    wrapper.style.marginTop = "12px";
    wrapper.style.padding = "12px";
    wrapper.style.border = "1px solid #bae6fd";
    wrapper.style.borderRadius = "12px";
    wrapper.style.background = "#f0f9ff";

    const title = document.createElement("div");
    title.dataset.ultraAreaTitle = "true";
    title.style.fontWeight = "800";
    title.style.marginBottom = "8px";

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    grid.style.gap = "8px";

    (Object.keys(ULTRA_AREAS) as UltraArea[]).forEach((areaKey) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.ultraAreaOption = areaKey;
      button.style.minHeight = "44px";
      button.style.padding = "9px 10px";
      button.style.borderRadius = "10px";
      button.style.cursor = "pointer";
      button.style.lineHeight = "1.25";
      button.addEventListener("click", () => {
        currentArea = areaKey;
        updateAreaButtons(wrapper!);
        triggerRecalculation();
      });
      grid.append(button);
    });

    const help = document.createElement("div");
    help.dataset.ultraAreaHelp = "true";
    help.style.marginTop = "7px";
    help.style.color = "#64748b";
    help.style.fontSize = "12px";
    help.style.lineHeight = "1.4";

    wrapper.append(title, grid, help);
    countryContainer.append(wrapper);
  }

  wrapper.hidden = !(currentDirection === "outbound" && currentCountry === "AL");
  updateAreaButtons(wrapper);
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
  ensureAreaUi();
  updateDomesticEconomySection();
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  currentCountry = target.value;
  if (currentCountry !== "AL") currentArea = null;
  queueMicrotask(updateUi);
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
    currentArea = null;
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
