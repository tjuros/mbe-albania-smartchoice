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

    if (label.includes("Inbound") || label.includes("Hyrëse")) {
      currentDirection = "inbound";
    }

    if (label.includes("Outbound") || label.includes("Dalëse")) {
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
  boxShadow?: string;
};

const carrierStyles: Record<string, CarrierBadgeStyle> = {
  "Posta Shqiptare (EMS)": {
    background: "linear-gradient(90deg, #facc15 0 18%, #ffffff 18% 100%)",
    color: "#1d4ed8",
    border: "2px solid #1d4ed8",
    textShadow: "none",
    boxShadow: "0 1px 2px rgba(15,23,42,.08)",
  },
  "DHL Standard": {
    background: "linear-gradient(90deg, #ffcc00 0 18%, #fff7cc 18% 100%)",
    color: "#d40511",
    border: "2px solid #d40511",
    textShadow: "none",
    boxShadow: "0 1px 2px rgba(15,23,42,.08)",
  },
  "DHL Express": {
    background: "linear-gradient(90deg, #ffcc00 0 18%, #fff7cc 18% 100%)",
    color: "#d40511",
    border: "2px solid #d40511",
    textShadow: "none",
    boxShadow: "0 1px 2px rgba(15,23,42,.08)",
  },
  "UPS Standard": {
    background: "#ffffff",
    color: "#b68a2c",
    border: "2px solid #111111",
    textShadow: "none",
    boxShadow: "0 1px 2px rgba(15,23,42,.08)",
  },
  "UPS Express": {
    background: "#ffffff",
    color: "#b68a2c",
    border: "2px solid #111111",
    textShadow: "none",
    boxShadow: "0 1px 2px rgba(15,23,42,.08)",
  },
  FedEx: {
    background: "linear-gradient(90deg, #ff6600 0 18%, #ffffff 18% 100%)",
    color: "#4d148c",
    border: "2px solid #4d148c",
    textShadow: "none",
    boxShadow: "0 1px 2px rgba(15,23,42,.08)",
  },
  Ultra: {
    background: "#0b4ea2",
    color: "#ffffff",
    border: "2px solid #0b4ea2",
    boxShadow: "0 1px 2px rgba(15,23,42,.12)",
  },
  "Albanian Courier": {
    background: "#7f1d1d",
    color: "#ffffff",
    border: "2px solid #7f1d1d",
    boxShadow: "0 1px 2px rgba(15,23,42,.12)",
  },
  "Elite Post": {
    background: "linear-gradient(90deg, #15803d 0 18%, #ffffff 18% 100%)",
    color: "#dc2626",
    border: "2px solid #15803d",
    textShadow: "none",
    boxShadow: "0 1px 2px rgba(15,23,42,.08)",
  },
};

function applyCarrierStyles() {
  document.querySelectorAll<HTMLElement>("div").forEach((element) => {
    const carrierName = element.textContent?.trim() ?? "";
    const style = carrierStyles[carrierName];
    if (!style) return;

    const isPill = element.style.borderRadius === "999px" || element.style.minHeight === "34px";
    if (!isPill) return;

    element.style.background = style.background;
    element.style.color = style.color;
    element.style.textShadow = style.textShadow ?? "0 1px 2px rgba(0,0,0,.24)";
    element.style.border = style.border;
    element.style.boxShadow = style.boxShadow ?? "0 1px 2px rgba(15,23,42,.12)";
    element.style.fontWeight = "800";

    const duplicateLabel = element.nextElementSibling;
    if (duplicateLabel instanceof HTMLElement && duplicateLabel.textContent?.trim() === carrierName) {
      duplicateLabel.style.display = "none";
    }
  });
}

const carrierStyleObserver = new MutationObserver(applyCarrierStyles);
carrierStyleObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

queueMicrotask(applyCarrierStyles);
