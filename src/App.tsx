import { useEffect, useMemo, useState, type CSSProperties, type FocusEvent } from "react";

type Direction = "outbound" | "inbound";
type ShipmentType = "documents" | "parcel";
type ServiceType = "MBE Economy" | "MBE Express";
type CarrierStatus = "ok" | "surcharge" | "no";
type Language = "en" | "sq";

type PackageItem = {
  weight: string;
  length: string;
  width: string;
  height: string;
};

type NumericPackageItem = {
  weight: number;
  length: number;
  width: number;
  height: number;
};

type Country = {
  code: string;
  nameEn: string;
  nameSq: string;
  outboundZone: number;
  inboundZone: number;
};

type PriceResult = {
  name: string;
  price: number | null;
  possible: boolean;
  details: string[];
  serviceType: ServiceType;
  status: CarrierStatus;
  warning?: string;
};

const DEFAULT_FIRST_PACKAGE: PackageItem = {
  weight: "2",
  length: "30",
  width: "20",
  height: "10",
};

const DEFAULT_NEW_PACKAGE: PackageItem = {
  weight: "1",
  length: "20",
  width: "15",
  height: "10",
};

const COUNTRIES: Country[] = [
  { code: "AL", nameEn: "Albania", nameSq: "Shqipëri", outboundZone: 0, inboundZone: 0 },
  { code: "IT", nameEn: "Italy", nameSq: "Itali", outboundZone: 1, inboundZone: 1 },
  { code: "GR", nameEn: "Greece", nameSq: "Greqi", outboundZone: 1, inboundZone: 1 },
  { code: "HR", nameEn: "Croatia", nameSq: "Kroaci", outboundZone: 2, inboundZone: 2 },
  { code: "DE", nameEn: "Germany", nameSq: "Gjermani", outboundZone: 2, inboundZone: 2 },
  { code: "AT", nameEn: "Austria", nameSq: "Austri", outboundZone: 2, inboundZone: 2 },
  { code: "FR", nameEn: "France", nameSq: "Francë", outboundZone: 3, inboundZone: 3 },
  { code: "ES", nameEn: "Spain", nameSq: "Spanjë", outboundZone: 3, inboundZone: 3 },
  { code: "GB", nameEn: "United Kingdom", nameSq: "Mbretëria e Bashkuar", outboundZone: 4, inboundZone: 4 },
  { code: "US", nameEn: "United States", nameSq: "Shtetet e Bashkuara", outboundZone: 5, inboundZone: 5 },
  { code: "CA", nameEn: "Canada", nameSq: "Kanada", outboundZone: 5, inboundZone: 5 },
  { code: "AE", nameEn: "United Arab Emirates", nameSq: "Emiratet e Bashkuara Arabe", outboundZone: 5, inboundZone: 5 },
  { code: "CN", nameEn: "China", nameSq: "Kinë", outboundZone: 6, inboundZone: 6 },
  { code: "AU", nameEn: "Australia", nameSq: "Australi", outboundZone: 7, inboundZone: 7 },
];

const COPY = {
  en: {
    reset: "Reset",
    outbound: "Outbound / Export",
    inbound: "Inbound / Import",
    documents: "Documents / Envelope",
    parcel: "Parcel",
    destinationCountry: "Destination country",
    originCountry: "Origin country",
    package: "Package",
    weight: "Weight",
    length: "Length",
    width: "Width",
    height: "Height",
    duplicate: "Duplicate",
    delete: "Delete",
    addPackage: "Add package",
    duplicateFirst: "Duplicate package 1",
    cod: "COD / Cash on delivery",
    codAmount: "COD amount (€)",
    recommendation: "Recommendation",
    express: "Express",
    enterShipment: "Enter shipment details.",
    resultHere: "Result will appear here.",
    additionalPackages: "Additional packages",
    openClose: "open / close",
    none: "none",
    noAdditional: "For more than one parcel, click “Add package”.",
    economyOptions: "All Economy options",
    expressOptions: "All Express options",
    options: "options",
    waiting: "waiting for input",
    summary: "Shipment summary",
    direction: "Direction",
    shipmentType: "Shipment type",
    country: "Country",
    packages: "Number of packages",
    totalWeight: "Total actual weight",
    volumetricWeight: "Volumetric weight",
    chargeableWeight: "Chargeable weight",
    bestOption: "Best option",
    possible: "Available",
    surcharge: "Available with surcharge",
    unavailable: "Unavailable",
    recommended: "Recommended",
    testTariff: "Temporary test tariff",
    temporaryZone: "Temporary zone",
    billingWeight: "Chargeable weight",
    docsLimit: "Documents are available up to 5 kg. Dimensions are not required.",
    docsTooHeavy: "Documents are limited to 5 kg. Select Parcel for heavier shipments.",
    domesticHint: "Albania selected: domestic couriers are shown automatically.",
    internationalHint: "International services are shown for the selected route.",
    outboundRoute: "From Albania",
    inboundRoute: "To Albania",
    warning: "NOTE",
    testPriceNotice: "All prices and zones are temporary test values.",
  },
  sq: {
    reset: "Rivendos",
    outbound: "Dalëse / Eksport",
    inbound: "Hyrëse / Import",
    documents: "Dokumente / Zarf",
    parcel: "Pako",
    destinationCountry: "Shteti i destinacionit",
    originCountry: "Shteti i origjinës",
    package: "Pako",
    weight: "Pesha",
    length: "Gjatësia",
    width: "Gjerësia",
    height: "Lartësia",
    duplicate: "Dubliko",
    delete: "Fshi",
    addPackage: "Shto pako",
    duplicateFirst: "Dubliko pakon 1",
    cod: "COD / Pagesë në dorëzim",
    codAmount: "Shuma COD (€)",
    recommendation: "Rekomandimi",
    express: "Express",
    enterShipment: "Vendosni të dhënat e dërgesës.",
    resultHere: "Rezultati do të shfaqet këtu.",
    additionalPackages: "Pakot shtesë",
    openClose: "hap / mbyll",
    none: "asnjë",
    noAdditional: "Për më shumë se një pako, klikoni “Shto pako”.",
    economyOptions: "Të gjitha opsionet Economy",
    expressOptions: "Të gjitha opsionet Express",
    options: "opsione",
    waiting: "në pritje të të dhënave",
    summary: "Përmbledhja e dërgesës",
    direction: "Drejtimi",
    shipmentType: "Lloji i dërgesës",
    country: "Shteti",
    packages: "Numri i pakove",
    totalWeight: "Pesha reale totale",
    volumetricWeight: "Pesha vëllimore",
    chargeableWeight: "Pesha e faturueshme",
    bestOption: "Opsioni më i mirë",
    possible: "E disponueshme",
    surcharge: "E disponueshme me shtesë",
    unavailable: "E padisponueshme",
    recommended: "Rekomanduar",
    testTariff: "Tarifë e përkohshme testuese",
    temporaryZone: "Zona e përkohshme",
    billingWeight: "Pesha e faturueshme",
    docsLimit: "Dokumentet lejohen deri në 5 kg. Dimensionet nuk kërkohen.",
    docsTooHeavy: "Dokumentet kufizohen në 5 kg. Zgjidhni Pako për dërgesa më të rënda.",
    domesticHint: "Është zgjedhur Shqipëria: korrierët vendas shfaqen automatikisht.",
    internationalHint: "Shërbimet ndërkombëtare shfaqen për itinerarin e zgjedhur.",
    outboundRoute: "Nga Shqipëria",
    inboundRoute: "Për në Shqipëri",
    warning: "KUJDES",
    testPriceNotice: "Të gjitha çmimet dhe zonat janë vlera të përkohshme testuese.",
  },
} as const;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function parseNum(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value);
}

function totalActualWeight(items: NumericPackageItem[]) {
  return round2(items.reduce((sum, item) => sum + item.weight, 0));
}

function volumetricWeight(items: NumericPackageItem[], divisor: number) {
  return round2(items.reduce((sum, item) => sum + (item.length * item.width * item.height) / divisor, 0));
}

function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}

function inputStyle(): CSSProperties {
  return {
    padding: "14px 12px",
    fontSize: 17,
    border: "1px solid #d0d7de",
    borderRadius: 12,
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
    minHeight: 50,
    color: "#111827",
  };
}

function buttonStyle(primary = false, active = false): CSSProperties {
  const isPrimary = primary || active;
  return {
    padding: "12px 14px",
    borderRadius: 12,
    border: isPrimary ? "1px solid #111827" : "1px solid #d1d5db",
    background: isPrimary ? "#111827" : "#fff",
    color: isPrimary ? "#fff" : "#111827",
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 46,
  };
}

function cardStyle(highlight = false): CSSProperties {
  return {
    border: highlight ? "2px solid #16a34a" : "1px solid #e5e7eb",
    background: highlight ? "#f0fdf4" : "#fff",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };
}

function badgeStyle(type: "ok" | "warn" | "info" | "danger"): CSSProperties {
  const styles = {
    ok: { background: "#dcfce7", color: "#166534" },
    warn: { background: "#ffedd5", color: "#9a3412" },
    info: { background: "#e0f2fe", color: "#075985" },
    danger: { background: "#fee2e2", color: "#991b1b" },
  };

  return {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    ...styles[type],
  };
}

function serviceBadgeStyle(serviceType: ServiceType): CSSProperties {
  return {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    background: serviceType === "MBE Economy" ? "#16a34a" : "#dc2626",
    color: "#fff",
  };
}

function carrierPillStyle(name: string): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 14,
    minHeight: 34,
  };

  if (name.includes("DHL")) return { ...base, background: "#ffcc00", color: "#d40511" };
  if (name.includes("UPS")) return { ...base, background: "#351c15", color: "#ffb500" };
  if (name.includes("FedEx")) return { ...base, background: "#4d148c", color: "#fff" };
  if (name.includes("EMS") || name.includes("Posta")) return { ...base, background: "#1d4ed8", color: "#fff" };
  if (name.includes("Ultra")) return { ...base, background: "#111827", color: "#fff" };
  if (name.includes("Elite")) return { ...base, background: "#dc2626", color: "#fff" };
  if (name.includes("Albanian")) return { ...base, background: "#e11d48", color: "#fff" };
  if (name === "MBE") return { ...base, background: "#111", color: "#fff" };
  return { ...base, background: "#e5e7eb", color: "#111827" };
}

function sectionSummaryStyle(): CSSProperties {
  return {
    cursor: "pointer",
    fontWeight: 800,
    listStyle: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  };
}

function statusBadge(status: CarrierStatus, copy: (typeof COPY)[Language]) {
  if (status === "ok") return <span style={badgeStyle("ok")}>{copy.possible}</span>;
  if (status === "surcharge") return <span style={badgeStyle("warn")}>{copy.surcharge}</span>;
  return <span style={badgeStyle("danger")}>{copy.unavailable}</span>;
}

function fail(name: string, serviceType: ServiceType, details: string[]): PriceResult {
  return { name, price: null, possible: false, details, serviceType, status: "no" };
}

function buildResult(
  name: string,
  serviceType: ServiceType,
  price: number,
  details: string[],
  status: CarrierStatus = "ok",
  warning?: string
): PriceResult {
  return { name, price: round2(price), possible: true, details, serviceType, status, warning };
}

function calculateDomestic(
  chargeable: number,
  packageCount: number,
  cod: boolean,
  codAmount: number,
  copy: (typeof COPY)[Language]
): PriceResult[] {
  const extraPackages = Math.max(0, packageCount - 1);
  const codFlat = cod ? 0.45 : 0;
  const codPercent = cod ? Math.max(0.5, codAmount * 0.008) : 0;

  return [
    buildResult(
      "Ultra",
      "MBE Economy",
      2.15 + Math.max(0, chargeable - 1) * 0.38 + extraPackages * 0.55 + codFlat,
      [copy.testTariff, `${copy.billingWeight}: ${chargeable.toFixed(2)} kg`, cod ? "COD +€0.45" : "COD: —"]
    ),
    buildResult(
      "Elite Post",
      "MBE Economy",
      1.95 + Math.max(0, chargeable - 1) * 0.42 + extraPackages * 0.48 + codPercent,
      [copy.testTariff, `${copy.billingWeight}: ${chargeable.toFixed(2)} kg`, cod ? `COD +${money(codPercent)}` : "COD: —"]
    ),
    buildResult(
      "Albanian Courier",
      "MBE Express",
      2.65 + Math.max(0, chargeable - 1) * 0.49 + extraPackages * 0.62 + (cod ? 0.35 : 0),
      [copy.testTariff, `${copy.billingWeight}: ${chargeable.toFixed(2)} kg`, cod ? "COD +€0.35" : "COD: —"]
    ),
  ];
}

function calculateInternational(
  direction: Direction,
  shipmentType: ShipmentType,
  zone: number,
  chargeable: number,
  copy: (typeof COPY)[Language]
): PriceResult[] {
  if (shipmentType === "documents" && chargeable > 5) {
    return [
      fail("Posta Shqiptare (EMS)", "MBE Economy", [copy.docsTooHeavy]),
      fail("DHL Standard", "MBE Economy", [copy.docsTooHeavy]),
      fail("UPS Standard", "MBE Economy", [copy.docsTooHeavy]),
      fail("DHL Express", "MBE Express", [copy.docsTooHeavy]),
      fail("UPS Express", "MBE Express", [copy.docsTooHeavy]),
      fail("FedEx", "MBE Express", [copy.docsTooHeavy]),
    ];
  }

  const inboundFactor = direction === "inbound" ? 1.12 : 1;
  const kg = Math.max(0.5, chargeable);
  const docsFactor = shipmentType === "documents" ? 0.72 : 1;
  const details = (carrierDivisor: number) => [
    copy.testTariff,
    `${copy.temporaryZone}: ${zone}`,
    `${copy.billingWeight}: ${kg.toFixed(2)} kg`,
    `Test divisor: ${carrierDivisor}`,
  ];

  const results = [
    buildResult("Posta Shqiptare (EMS)", "MBE Economy", (7.4 + zone * 3.1 + kg * 2.05) * inboundFactor * docsFactor, details(5000)),
    buildResult("DHL Standard", "MBE Economy", (10.2 + zone * 4.1 + kg * 2.45) * inboundFactor * docsFactor, details(5000)),
    buildResult("UPS Standard", "MBE Economy", (9.7 + zone * 4.35 + kg * 2.35) * inboundFactor * docsFactor, details(5000)),
    buildResult("DHL Express", "MBE Express", (15.4 + zone * 5.9 + kg * 3.35) * inboundFactor * docsFactor, details(5000)),
    buildResult("UPS Express", "MBE Express", (14.8 + zone * 6.15 + kg * 3.25) * inboundFactor * docsFactor, details(5000)),
    buildResult("FedEx", "MBE Express", (16.1 + zone * 5.65 + kg * 3.15) * inboundFactor * docsFactor, details(5000)),
  ];

  if (shipmentType === "parcel" && chargeable > 100) {
    return results.map((result) => fail(result.name, result.serviceType, ["Temporary limit: 100 kg"]));
  }

  return results;
}

function CarrierPill({ name }: { name: string }) {
  return <div style={carrierPillStyle(name)}>{name}</div>;
}

function ResultRow({ result, highlighted, copy }: { result: PriceResult; highlighted: boolean; copy: (typeof COPY)[Language] }) {
  return (
    <div style={cardStyle(highlighted)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <CarrierPill name={result.name} />
            <div style={{ fontWeight: 700, fontSize: 20 }}>{result.name}</div>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={serviceBadgeStyle(result.serviceType)}>{result.serviceType}</span>
            {statusBadge(result.status, copy)}
            {highlighted && result.possible ? <span style={badgeStyle("info")}>{copy.recommended}</span> : null}
          </div>
          <div style={{ color: "#555", marginTop: 10, lineHeight: 1.5 }}>{result.details.join(" · ")}</div>
          {result.warning ? (
            <div style={{ marginTop: 10, color: "#9a3412", fontWeight: 700, lineHeight: 1.5 }}>
              {copy.warning}: {result.warning}
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, whiteSpace: "nowrap" }}>{money(result.price)}</div>
      </div>
    </div>
  );
}

function CompactHero({ overallWinner, expressWinner, copy }: { overallWinner: PriceResult | null; expressWinner: PriceResult | null; copy: (typeof COPY)[Language] }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle(!!overallWinner)}>
        <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 800 }}>{copy.recommendation}</div>
        {overallWinner ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <CarrierPill name={overallWinner.name} />
              <div style={{ fontSize: 26, fontWeight: 900 }}>{overallWinner.name}</div>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={serviceBadgeStyle(overallWinner.serviceType)}>{overallWinner.serviceType}</span>
              {statusBadge(overallWinner.status, copy)}
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, marginTop: 8 }}>{money(overallWinner.price)}</div>
          </>
        ) : <div style={{ color: "#64748b", marginTop: 8 }}>{copy.enterShipment}</div>}
      </div>

      <div style={cardStyle(false)}>
        <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 800 }}>{copy.express}</div>
        {expressWinner ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <CarrierPill name={expressWinner.name} />
              <div style={{ fontSize: 24, fontWeight: 900 }}>{expressWinner.name}</div>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={serviceBadgeStyle(expressWinner.serviceType)}>{expressWinner.serviceType}</span>
              {statusBadge(expressWinner.status, copy)}
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, marginTop: 8 }}>{money(expressWinner.price)}</div>
          </>
        ) : <div style={{ color: "#64748b", marginTop: 8 }}>{copy.resultHere}</div>}
      </div>
    </div>
  );
}

export default function App() {
  const isMobile = useIsMobile();
  const [language, setLanguage] = useState<Language>("en");
  const [direction, setDirection] = useState<Direction>("outbound");
  const [shipmentType, setShipmentType] = useState<ShipmentType>("parcel");
  const [countryCode, setCountryCode] = useState("AL");
  const [cod, setCod] = useState(false);
  const [codAmount, setCodAmount] = useState("");
  const [packages, setPackages] = useState<PackageItem[]>([{ ...DEFAULT_FIRST_PACKAGE }]);

  const copy = COPY[language];
  const selectedCountry = COUNTRIES.find((country) => country.code === countryCode) ?? COUNTRIES[0];
  const isDomestic = direction === "outbound" && countryCode === "AL";

  useEffect(() => {
    if (direction === "inbound" && countryCode === "AL") setCountryCode("DE");
    if (direction === "inbound") setCod(false);
  }, [direction, countryCode]);

  useEffect(() => {
    if (!isDomestic) setCod(false);
  }, [isDomestic]);

  const normalized = useMemo<NumericPackageItem[]>(() => packages.map((item) => ({
    weight: parseNum(item.weight) ?? 0,
    length: parseNum(item.length) ?? 0,
    width: parseNum(item.width) ?? 0,
    height: parseNum(item.height) ?? 0,
  })), [packages]);

  const actual = useMemo(() => totalActualWeight(normalized), [normalized]);
  const volume = useMemo(() => shipmentType === "documents" ? 0 : volumetricWeight(normalized, isDomestic ? 6000 : 5000), [normalized, shipmentType, isDomestic]);
  const chargeable = shipmentType === "documents" ? actual : round2(Math.max(actual, volume));

  const isReady = useMemo(() => {
    if (!countryCode) return false;
    if (shipmentType === "documents") return packages[0] && (parseNum(packages[0].weight) ?? 0) > 0;
    return packages.every((item) => [item.weight, item.length, item.width, item.height].every((value) => (parseNum(value) ?? 0) > 0));
  }, [countryCode, shipmentType, packages]);

  const results = useMemo(() => {
    if (!isReady) return null;
    const zone = direction === "outbound" ? selectedCountry.outboundZone : selectedCountry.inboundZone;
    const all = isDomestic
      ? calculateDomestic(chargeable, packages.length, cod, parseNum(codAmount) ?? 0, copy)
      : calculateInternational(direction, shipmentType, zone, chargeable, copy);

    const economy = all.filter((result) => result.serviceType === "MBE Economy").sort((a, b) => {
      if (a.possible !== b.possible) return a.possible ? -1 : 1;
      return (a.price ?? Infinity) - (b.price ?? Infinity);
    });
    const express = all.filter((result) => result.serviceType === "MBE Express").sort((a, b) => {
      if (a.possible !== b.possible) return a.possible ? -1 : 1;
      return (a.price ?? Infinity) - (b.price ?? Infinity);
    });
    const possible = [...economy, ...express].filter((result) => result.possible && result.price !== null);
    const overallWinner = possible.length ? [...possible].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0] : null;
    const expressWinner = express.find((result) => result.possible && result.price !== null) ?? null;
    return { economy, express, overallWinner, expressWinner, zone };
  }, [isReady, direction, selectedCountry, isDomestic, chargeable, packages.length, cod, codAmount, shipmentType, copy]);

  const updatePackage = (index: number, field: keyof PackageItem, value: string) => {
    setPackages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };
  const addPackage = () => setPackages((current) => [...current, { ...DEFAULT_NEW_PACKAGE }]);
  const duplicatePackage = (index: number) => setPackages((current) => [...current.slice(0, index + 1), { ...current[index] }, ...current.slice(index + 1)]);
  const removePackage = (index: number) => setPackages((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  const resetShipment = () => {
    setDirection("outbound");
    setShipmentType("parcel");
    setCountryCode("AL");
    setCod(false);
    setCodAmount("");
    setPackages([{ ...DEFAULT_FIRST_PACKAGE }]);
  };

  const commonInputProps = { onFocus: (event: FocusEvent<HTMLInputElement>) => event.target.select() };
  const additionalPackages = shipmentType === "parcel" ? packages.slice(1) : [];
  const countryName = language === "en" ? selectedCountry.nameEn : selectedCountry.nameSq;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: isMobile ? 12 : 16, paddingBottom: isMobile ? 150 : 16, fontFamily: "Ubuntu, Arial, sans-serif" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 14 }}>
        <div style={{ ...cardStyle(), padding: isMobile ? 14 : 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={carrierPillStyle("MBE")}>MAIL BOXES ETC.</div>
                <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 900, lineHeight: 1.05 }}>SmartChoice</div>
              </div>
              <div style={{ color: "#64748b", marginTop: 4, fontSize: isMobile ? 14 : 16 }}>Mail Boxes Etc. Albania</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: 10, overflow: "hidden" }}>
                {(["en", "sq"] as const).map((item) => (
                  <button key={item} onClick={() => setLanguage(item)} style={{ border: 0, padding: "8px 10px", fontWeight: 800, cursor: "pointer", background: language === item ? "#111827" : "#fff", color: language === item ? "#fff" : "#111827" }}>
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>
              <button style={{ ...buttonStyle(), minHeight: 38, padding: "8px 12px" }} onClick={resetShipment}>{copy.reset}</button>
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle(), display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", marginBottom: 7, fontWeight: 800 }}>{copy.direction}</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button style={buttonStyle(false, direction === "outbound")} onClick={() => setDirection("outbound")}>{copy.outbound}</button>
                <button style={buttonStyle(false, direction === "inbound")} onClick={() => setDirection("inbound")}>{copy.inbound}</button>
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 7, fontWeight: 800 }}>{copy.shipmentType}</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button style={buttonStyle(false, shipmentType === "documents")} onClick={() => { setShipmentType("documents"); setPackages((current) => [{ ...current[0] }]); }}>{copy.documents}</button>
                <button style={buttonStyle(false, shipmentType === "parcel")} onClick={() => setShipmentType("parcel")}>{copy.parcel}</button>
              </div>
            </div>
          </div>
          <div style={{ padding: "10px 12px", background: "#f1f5f9", borderRadius: 12, color: "#475569", lineHeight: 1.5 }}>
            <strong>{direction === "outbound" ? copy.outboundRoute : copy.inboundRoute}</strong>{" · "}{isDomestic ? copy.domesticHint : copy.internationalHint}
            <div style={{ marginTop: 3, fontSize: 13 }}>{copy.testPriceNotice}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr" }}>
          <div style={cardStyle()}>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 800 }}>{direction === "outbound" ? copy.destinationCountry : copy.originCountry}</label>
                <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} style={inputStyle()}>
                  {COUNTRIES.filter((country) => direction === "outbound" || country.code !== "AL").map((country) => (
                    <option key={country.code} value={country.code}>{language === "en" ? country.nameEn : country.nameSq}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontWeight: 800, marginBottom: 6, fontSize: isMobile ? 16 : 18 }}>{shipmentType === "documents" ? copy.documents : `${copy.package} 1`}</div>
                {shipmentType === "documents" ? (
                  <>
                    <label style={{ display: "block", marginBottom: 6 }}>{copy.weight}</label>
                    <input {...commonInputProps} inputMode="decimal" type="text" value={packages[0]?.weight ?? ""} onChange={(event) => updatePackage(0, "weight", event.target.value)} placeholder="kg" style={inputStyle()} />
                    <div style={{ fontSize: 12, color: actual > 5 ? "#b91c1c" : "#64748b", marginTop: 6, fontWeight: actual > 5 ? 800 : 400 }}>{actual > 5 ? copy.docsTooHeavy : copy.docsLimit}</div>
                  </>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0,1fr))", gap: 10 }}>
                    {(["weight", "length", "width", "height"] as const).map((field) => (
                      <div key={field}>
                        <label style={{ display: "block", marginBottom: 6 }}>{field === "weight" ? copy.weight : field === "length" ? copy.length : field === "width" ? copy.width : copy.height}</label>
                        <input {...commonInputProps} inputMode="decimal" type="text" value={packages[0]?.[field] ?? ""} onChange={(event) => updatePackage(0, field, event.target.value)} placeholder={field === "weight" ? "kg" : "cm"} style={inputStyle()} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isDomestic ? (
                <>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16 }}>
                    <input type="checkbox" checked={cod} onChange={(event) => setCod(event.target.checked)} />{copy.cod}
                  </label>
                  {cod ? (
                    <div>
                      <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>{copy.codAmount}</label>
                      <input {...commonInputProps} type="text" inputMode="decimal" value={codAmount} onChange={(event) => setCodAmount(event.target.value)} placeholder="100" style={inputStyle()} />
                    </div>
                  ) : null}
                </>
              ) : null}

              {shipmentType === "parcel" ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={buttonStyle()} onClick={() => duplicatePackage(0)}>{copy.duplicateFirst}</button>
                  <button style={buttonStyle(true)} onClick={addPackage}>{copy.addPackage}</button>
                </div>
              ) : null}
            </div>
          </div>

          <CompactHero overallWinner={results?.overallWinner ?? null} expressWinner={results?.expressWinner ?? null} copy={copy} />
        </div>

        {shipmentType === "parcel" ? (
          <details open={additionalPackages.length > 0} style={cardStyle()}>
            <summary style={sectionSummaryStyle()}>
              <span>{copy.additionalPackages} {additionalPackages.length ? `(${additionalPackages.length})` : ""}</span>
              <span style={{ color: "#64748b", fontWeight: 700 }}>{additionalPackages.length ? copy.openClose : copy.none}</span>
            </summary>
            {additionalPackages.length ? (
              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                {additionalPackages.map((item, localIndex) => {
                  const index = localIndex + 1;
                  return (
                    <div key={index} style={{ ...cardStyle(), padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        <strong>{copy.package} {index + 1}</strong>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button style={buttonStyle()} onClick={() => duplicatePackage(index)}>{copy.duplicate}</button>
                          <button style={buttonStyle()} onClick={() => removePackage(index)}>{copy.delete}</button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0,1fr))", gap: 10 }}>
                        {(["weight", "length", "width", "height"] as const).map((field) => (
                          <div key={field}>
                            <label style={{ display: "block", marginBottom: 6 }}>{field === "weight" ? copy.weight : field === "length" ? copy.length : field === "width" ? copy.width : copy.height}</label>
                            <input {...commonInputProps} inputMode="decimal" type="text" value={item[field]} onChange={(event) => updatePackage(index, field, event.target.value)} placeholder={field === "weight" ? "kg" : "cm"} style={inputStyle()} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div style={{ marginTop: 12, color: "#64748b" }}>{copy.noAdditional}</div>}
          </details>
        ) : null}

        <details style={cardStyle()} open>
          <summary style={sectionSummaryStyle()}>
            <span>{copy.economyOptions}</span>
            <span style={{ color: "#64748b", fontWeight: 700 }}>{results ? `${results.economy.length} ${copy.options}` : copy.waiting}</span>
          </summary>
          {results ? (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {results.economy.map((result) => <ResultRow key={result.name} result={result} highlighted={result.name === results.overallWinner?.name} copy={copy} />)}
            </div>
          ) : <div style={{ marginTop: 12, color: "#64748b" }}>{copy.enterShipment}</div>}
        </details>

        <details style={cardStyle()} open>
          <summary style={sectionSummaryStyle()}>
            <span>{copy.expressOptions}</span>
            <span style={{ color: "#64748b", fontWeight: 700 }}>{results ? `${results.express.length} ${copy.options}` : copy.waiting}</span>
          </summary>
          {results ? (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {results.express.map((result) => <ResultRow key={result.name} result={result} highlighted={result.name === results.overallWinner?.name} copy={copy} />)}
            </div>
          ) : <div style={{ marginTop: 12, color: "#64748b" }}>{copy.enterShipment}</div>}
        </details>
      </div>

      <div style={{ position: isMobile ? "fixed" : "sticky", left: 0, right: 0, bottom: 0, zIndex: 30, padding: isMobile ? "10px 12px calc(10px + env(safe-area-inset-bottom))" : 0, background: isMobile ? "rgba(248,250,252,.96)" : "transparent", backdropFilter: isMobile ? "blur(10px)" : "none", borderTop: isMobile ? "1px solid #e5e7eb" : "none", marginTop: 14 }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <details style={cardStyle()}>
            <summary style={sectionSummaryStyle()}>
              <span>{copy.summary}</span>
              <span style={{ color: "#64748b", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <span>{results?.overallWinner ? money(results.overallWinner.price) : "—"}</span><span style={{ fontSize: 12 }}>▾</span>
              </span>
            </summary>
            <div style={{ marginTop: 12, display: "grid", gap: 8, color: "#475569" }}>
              <div>{copy.direction}: <strong>{direction === "outbound" ? copy.outbound : copy.inbound}</strong></div>
              <div>{copy.shipmentType}: <strong>{shipmentType === "documents" ? copy.documents : copy.parcel}</strong></div>
              <div>{copy.country}: <strong>{countryName}</strong></div>
              <div>{copy.packages}: <strong>{shipmentType === "documents" ? 1 : packages.length}</strong></div>
              <div>{copy.totalWeight}: <strong>{actual.toFixed(2)} kg</strong></div>
              <div>{copy.volumetricWeight}: <strong>{volume.toFixed(2)} kg</strong></div>
              <div>{copy.chargeableWeight}: <strong>{chargeable.toFixed(2)} kg</strong></div>
              <div>{copy.bestOption}: <strong>{results?.overallWinner ? `${results.overallWinner.name} (${money(results.overallWinner.price)})` : "—"}</strong></div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
