import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const EUR_TO_ALL = 100;
let currentDirection: "outbound" | "inbound" = "outbound";
let currentCountry = "AL";

const NativeNumberFormat = Intl.NumberFormat;
const eurFormatter = new NativeNumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});
const allFormatter = new NativeNumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const SmartNumberFormat = function (
  locales?: string | string[],
  options?: Intl.NumberFormatOptions,
) {
  const nativeFormatter = new NativeNumberFormat(locales, options);
  const isEuroPrice = options?.style === "currency" && options.currency === "EUR";

  if (!isEuroPrice) return nativeFormatter;

  return {
    format(value: number | bigint) {
      const numericValue = Number(value);
      const valueInAll = allFormatter.format(Math.round(numericValue * EUR_TO_ALL));
      const isDomestic = currentDirection === "outbound" && currentCountry === "AL";

      if (isDomestic) return `${valueInAll} ALL`;
      return `${eurFormatter.format(numericValue)} · ≈ ${valueInAll} ALL`;
    },
    formatToParts(value: number | bigint) {
      return nativeFormatter.formatToParts(value);
    },
    resolvedOptions() {
      return nativeFormatter.resolvedOptions();
    },
  } as Intl.NumberFormat;
} as unknown as typeof Intl.NumberFormat;

SmartNumberFormat.supportedLocalesOf = NativeNumberFormat.supportedLocalesOf.bind(NativeNumberFormat);
(Intl as unknown as { NumberFormat: typeof Intl.NumberFormat }).NumberFormat = SmartNumberFormat;

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

    if (label.includes("Inbound") || label.includes("Hyrëse") || label.includes("Import")) {
      currentDirection = "inbound";
    }

    if (label.includes("Outbound") || label.includes("Dalëse") || label.includes("Export") || label.includes("Eksport")) {
      currentDirection = "outbound";
    }

    if (label === "Reset" || label === "Rivendos") {
      currentDirection = "outbound";
      currentCountry = "AL";
    }
  },
  true,
);

type CarrierBadgeStyle = {
  background: string;
  color: string;
  border: string;
  textShadow?: string;
};

const carrierStyles: Record<string, CarrierBadgeStyle> = {
  "Posta Shqiptare (EMS)": {
    background: "#facc15",
    color: "#1d4ed8",
    border: "1px solid #eab308",
    textShadow: "none",
  },
  "DHL Standard": {
    background: "#ffcc00",
    color: "#d40511",
    border: "1px solid #e6b800",
    textShadow: "none",
  },
  "DHL Express": {
    background: "#ffcc00",
    color: "#d40511",
    border: "1px solid #e6b800",
    textShadow: "none",
  },
  "UPS Standard": {
    background: "#111111",
    color: "#d4af37",
    border: "1px solid #111111",
    textShadow: "none",
  },
  "UPS Express": {
    background: "#111111",
    color: "#d4af37",
    border: "1px solid #111111",
    textShadow: "none",
  },
  FedEx: {
    background: "#4d148c",
    color: "#ff6600",
    border: "1px solid #4d148c",
    textShadow: "none",
  },
  Ultra: {
    background: "#38bdf8",
    color: "#ffffff",
    border: "1px solid #0ea5e9",
  },
  "Elite Post": {
    background: "#15803d",
    color: "#ef4444",
    border: "1px solid #166534",
    textShadow: "none",
  },
  "Albanian Courier": {
    background: "#7f1d1d",
    color: "#ffffff",
    border: "1px solid #681818",
  },
};

function findLabel(labels: string[]) {
  return Array.from(document.querySelectorAll<HTMLLabelElement>("label")).find((label) =>
    labels.includes(label.textContent?.trim() ?? ""),
  );
}

function setButtonContent(button: HTMLButtonElement, icon: string, label: string, compact = false) {
  const nextKey = `${icon}|${label}|${compact}`;
  if (button.dataset.smartLabel === nextKey) return;

  button.dataset.smartLabel = nextKey;
  button.innerHTML = `<span aria-hidden="true" style="font-size:${compact ? 16 : 20}px;line-height:1">${icon}</span><span>${label}</span>`;
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.gap = compact ? "6px" : "8px";
  button.style.whiteSpace = "normal";
  button.style.textAlign = "center";
  button.style.padding = compact ? "8px 10px" : "12px 14px";
  button.style.minHeight = compact ? "40px" : "58px";
  button.style.fontSize = compact ? "14px" : "16px";
}

function applyLogo() {
  const logoContainer = Array.from(document.querySelectorAll<HTMLElement>("div")).find(
    (element) =>
      element.textContent?.trim() === "MAIL BOXES ETC." &&
      (element.style.borderRadius === "999px" || element.style.minHeight === "34px"),
  );

  if (!logoContainer) return;

  if (!logoContainer.querySelector("img")) {
    const logo = document.createElement("img");
    logo.src = "https://www.mbe.hr/wp-content/uploads/2020/04/mbe-logo.png";
    logo.alt = "Mail Boxes Etc.";
    logo.loading = "eager";
    logo.style.display = "block";
    logo.style.width = "clamp(92px, 18vw, 122px)";
    logo.style.height = "auto";
    logo.style.maxHeight = "42px";
    logo.style.objectFit = "contain";
    logoContainer.replaceChildren(logo);
  }

  logoContainer.style.padding = "0";
  logoContainer.style.minHeight = "0";
  logoContainer.style.background = "transparent";
  logoContainer.style.border = "0";
  logoContainer.style.borderRadius = "0";
  logoContainer.style.boxShadow = "none";

  const titleRow = logoContainer.parentElement;
  if (titleRow) {
    titleRow.style.alignItems = "center";
    titleRow.style.gap = "12px";
    titleRow.style.flexWrap = "wrap";
  }
}

function applyShipmentControls() {
  const directionLabel = findLabel(["Direction", "Drejtimi"]);
  const shipmentLabel = findLabel(["Shipment type", "Lloji i dërgesës"]);

  const directionBlock = directionLabel?.parentElement;
  const shipmentBlock = shipmentLabel?.parentElement;
  const controlsGrid = directionBlock?.parentElement;

  if (!directionBlock || !shipmentBlock || !controlsGrid || shipmentBlock.parentElement !== controlsGrid) return;

  controlsGrid.style.gridTemplateColumns = "1fr";
  controlsGrid.style.gap = "14px";

  if (controlsGrid.firstElementChild !== directionBlock) {
    controlsGrid.insertBefore(directionBlock, controlsGrid.firstElementChild);
  }

  const isAlbanian = directionLabel.textContent?.trim() === "Drejtimi";

  directionLabel.textContent = isAlbanian ? "Drejtimi i dërgesës" : "Shipment direction";
  directionLabel.style.fontSize = "12px";
  directionLabel.style.textTransform = "uppercase";
  directionLabel.style.letterSpacing = ".06em";
  directionLabel.style.color = "#64748b";
  directionLabel.style.marginBottom = "7px";

  directionBlock.style.background = "#f8fafc";
  directionBlock.style.border = "1px solid #e2e8f0";
  directionBlock.style.borderRadius = "12px";
  directionBlock.style.padding = "10px";

  const directionButtons = directionBlock.querySelectorAll<HTMLButtonElement>("button");
  if (directionButtons[0]) {
    setButtonContent(directionButtons[0], "↗", isAlbanian ? "Eksport" : "Export", true);
  }
  if (directionButtons[1]) {
    setButtonContent(directionButtons[1], "↙", "Import", true);
  }

  shipmentLabel.style.fontSize = "16px";
  shipmentLabel.style.fontWeight = "800";
  shipmentLabel.style.marginBottom = "8px";
  shipmentLabel.style.color = "#111827";

  const shipmentButtons = shipmentBlock.querySelectorAll<HTMLButtonElement>("button");
  if (shipmentButtons[0]) {
    setButtonContent(
      shipmentButtons[0],
      "📄",
      isAlbanian ? "Dokumente / Zarf" : "Documents / Envelope",
    );
  }
  if (shipmentButtons[1]) {
    setButtonContent(shipmentButtons[1], "📦", isAlbanian ? "Pako" : "Parcel");
  }
}

function applyCarrierStyles() {
  document.querySelectorAll<HTMLElement>("div").forEach((element) => {
    const carrierName = element.textContent?.trim() ?? "";
    const style = carrierStyles[carrierName];
    if (!style) return;

    const isPill = element.style.borderRadius === "999px" || element.style.minHeight === "34px";
    if (!isPill) return;

    element.style.background = style.background;
    element.style.color = style.color;
    element.style.textShadow = style.textShadow ?? "0 1px 2px rgba(0,0,0,.18)";
    element.style.border = style.border;
    element.style.boxShadow = "0 1px 2px rgba(15,23,42,.12)";
    element.style.fontWeight = "800";

    const duplicateLabel = element.nextElementSibling;
    if (duplicateLabel instanceof HTMLElement && duplicateLabel.textContent?.trim() === carrierName) {
      duplicateLabel.style.display = "none";
    }
  });
}

let applyScheduled = false;
function scheduleApply() {
  if (applyScheduled) return;
  applyScheduled = true;

  requestAnimationFrame(() => {
    applyScheduled = false;
    applyLogo();
    applyShipmentControls();
    applyCarrierStyles();
  });
}

const uiObserver = new MutationObserver(scheduleApply);
uiObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});

window.addEventListener("resize", scheduleApply);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

queueMicrotask(scheduleApply);
