type EliteRuntimeResult = {
  name: string;
  price: number | null;
  possible: boolean;
  details: string[];
  serviceType: "MBE Economy" | "MBE Express";
  status: "ok" | "surcharge" | "no";
  warning?: string;
};

const EUR_TO_ALL = 93.9135;
const ELITE_BASE_ALL = 200;
const ELITE_STANDARD_WEIGHT_KG = 5;
const ELITE_MAX_WEIGHT_KG = 20;
const ELITE_STANDARD_DIMENSION_CM = 30;
const HIGH_VALUE_THRESHOLD_ALL = 100000;
const HIGH_VALUE_RATE = 0.02;
const ELITE_MARKER = "Elite Poste Mailbox tariff";

let currentShipmentType: "documents" | "parcel" = "parcel";

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const toNumber = (value: string) => Number(value.replace(/,/g, ".")) || 0;
const allToEur = (value: number) => value / EUR_TO_ALL;

function isRuntimeResult(value: unknown): value is EliteRuntimeResult {
  return !!value && typeof value === "object" && "name" in value && "details" in value && "serviceType" in value;
}

function isAlbanian() {
  return document.body.textContent?.includes("Rivendos") ?? false;
}

function inputValues(placeholder: string) {
  return Array.from(document.querySelectorAll<HTMLInputElement>(`input[placeholder="${placeholder}"]`))
    .map((input) => toNumber(input.value));
}

function codData() {
  const checked = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
    .some((input) => input.checked);
  if (!checked) return { enabled: false, amount: 0 };

  const amountLabel = Array.from(document.querySelectorAll<HTMLLabelElement>("label")).find((label) =>
    /COD amount|Shuma COD/i.test(label.textContent ?? ""),
  );
  const input = amountLabel?.parentElement?.querySelector<HTMLInputElement>('input[type="text"]');
  return { enabled: true, amount: toNumber(input?.value ?? "") };
}

function chargeableWeight(result: EliteRuntimeResult) {
  for (const detail of result.details) {
    const match = detail.match(/(?:Chargeable weight|Pesha e faturueshme):\s*([\d.,]+)\s*kg/i);
    if (match) return toNumber(match[1]);
  }
  return inputValues("kg").reduce((sum, value) => sum + value, 0);
}

function applyEliteOffer(results: EliteRuntimeResult[]) {
  const result = results.find((item) => item.name === "Elite Post");
  if (!result || result.details.some((detail) => detail.startsWith(ELITE_MARKER))) return;

  const albanian = isAlbanian();
  const actualWeight = inputValues("kg").reduce((sum, value) => sum + value, 0);
  const chargeable = chargeableWeight(result);
  const dimensions = currentShipmentType === "parcel" ? inputValues("cm") : [];
  const oversized = dimensions.some((value) => value > ELITE_STANDARD_DIMENSION_CM);
  const aboveStandardWeight = Math.max(actualWeight, chargeable) > ELITE_STANDARD_WEIGHT_KG;
  const aboveMaximumWeight = actualWeight > ELITE_MAX_WEIGHT_KG;
  const cod = codData();
  const highValueFeeAll = cod.amount >= HIGH_VALUE_THRESHOLD_ALL ? round2(cod.amount * HIGH_VALUE_RATE) : 0;

  const details = albanian
    ? [
        `${ELITE_MARKER}: ${ELITE_BASE_ALL} ALL pa TVSH`,
        "Tiranë dhe rrethe: i njëjti çmim",
        `Pesha e faturueshme: ${chargeable.toFixed(2)} kg`,
        cod.enabled ? "COD: pa tarifë të veçantë në ofertë" : "COD: —",
        "Refuzimet brenda Shqipërisë: pa kosto shtesë",
      ]
    : [
        `${ELITE_MARKER}: ${ELITE_BASE_ALL} ALL excl. VAT`,
        "Tirana and districts: same price",
        `Chargeable weight: ${chargeable.toFixed(2)} kg`,
        cod.enabled ? "COD: no separate fee stated in the offer" : "COD: —",
        "Domestic refusals: no extra charge",
      ];

  if (aboveMaximumWeight) {
    result.price = null;
    result.possible = false;
    result.status = "no";
    result.warning = albanian
      ? "Elite Poste lejon maksimumi 20 kg për dërgesë."
      : "Elite Poste allows a maximum of 20 kg per shipment.";
    result.details = [...details, albanian ? "Maksimumi: 20 kg" : "Maximum: 20 kg"];
    return;
  }

  if (oversized || aboveStandardWeight) {
    result.price = null;
    result.possible = false;
    result.status = "surcharge";
    result.warning = albanian
      ? "Kërkohet ofertë manuale: tarifa 200 ALL vlen për dërgesa standarde deri në 5 kg dhe 30×30×30 cm."
      : "Manual quote required: the 200 ALL tariff applies to standard shipments up to 5 kg and 30×30×30 cm.";
    result.details = [
      ...details,
      oversized
        ? (albanian ? "Përmasa jashtë standardit" : "Dimensions outside standard")
        : (albanian ? "Peshë mbi tarifën standarde" : "Weight above standard tariff"),
    ];
    return;
  }

  const totalAll = ELITE_BASE_ALL + highValueFeeAll;
  result.price = round2(allToEur(totalAll));
  result.possible = true;
  result.status = highValueFeeAll > 0 ? "surcharge" : "ok";
  result.warning = highValueFeeAll > 0
    ? (albanian
        ? `Për vlerë nga 100,000 ALL aplikohet 2%: +${highValueFeeAll.toFixed(0)} ALL.`
        : `For values from 100,000 ALL, a 2% surcharge applies: +${highValueFeeAll.toFixed(0)} ALL.`)
    : undefined;
  result.details = highValueFeeAll > 0
    ? [...details, `High-value surcharge: ${highValueFeeAll.toFixed(0)} ALL`]
    : details;
}

function updateCodUi() {
  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>("label"));
  const label = labels.find((item) => /COD amount|Shuma COD/i.test(item.textContent ?? ""));
  if (!label) return;

  const albanian = isAlbanian();
  const nextLabel = albanian ? "Shuma COD (ALL)" : "COD amount (ALL)";
  if (label.textContent !== nextLabel) label.textContent = nextLabel;

  const input = label.parentElement?.querySelector<HTMLInputElement>('input[type="text"]');
  if (input && input.placeholder !== "10000") input.placeholder = "10000";
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const label = target.closest("button")?.textContent?.trim() ?? "";
  if (label.includes("Documents") || label.includes("Dokumente")) currentShipmentType = "documents";
  if (label === "Parcel" || label === "Pako" || label.includes("📦")) currentShipmentType = "parcel";
  if (label === "Reset" || label === "Rivendos") currentShipmentType = "parcel";
}, true);

const previousFilter = Array.prototype.filter;
const eliteFilter = function <T>(
  this: T[],
  callbackfn: (value: T, index: number, array: T[]) => unknown,
  thisArg?: unknown,
): T[] {
  const filtered = previousFilter.call(this, callbackfn, thisArg);
  if (this.some(isRuntimeResult)) applyEliteOffer(this as unknown as EliteRuntimeResult[]);
  return filtered;
};
Array.prototype.filter = eliteFilter as typeof Array.prototype.filter;

const uiObserver = new MutationObserver(updateCodUi);
uiObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
queueMicrotask(updateCodUi);
