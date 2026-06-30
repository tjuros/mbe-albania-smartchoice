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

const carrierStyles: Record<string, { background: string; color: string }> = {
  "Posta Shqiptare (EMS)": {
    background: "linear-gradient(135deg, #facc15 0%, #facc15 48%, #1d4ed8 52%, #1d4ed8 100%)",
    color: "#ffffff",
  },
  "DHL Standard": {
    background: "linear-gradient(135deg, #ffcc00 0%, #ffcc00 48%, #d40511 52%, #d40511 100%)",
    color: "#ffffff",
  },
  "DHL Express": {
    background: "linear-gradient(135deg, #ffcc00 0%, #ffcc00 48%, #d40511 52%, #d40511 100%)",
    color: "#ffffff",
  },
  "UPS Standard": {
    background: "linear-gradient(135deg, #111111 0%, #111111 48%, #b68a2c 52%, #b68a2c 100%)",
    color: "#ffffff",
  },
  "UPS Express": {
    background: "linear-gradient(135deg, #111111 0%, #111111 48%, #b68a2c 52%, #b68a2c 100%)",
    color: "#ffffff",
  },
  FedEx: {
    background: "linear-gradient(135deg, #4d148c 0%, #4d148c 48%, #ff6600 52%, #ff6600 100%)",
    color: "#ffffff",
  },
  Ultra: {
    background: "#0b4ea2",
    color: "#ffffff",
  },
  "Albanian Courier": {
    background: "#7f1d1d",
    color: "#ffffff",
  },
  "Elite Post": {
    background: "linear-gradient(135deg, #15803d 0%, #15803d 48%, #dc2626 52%, #dc2626 100%)",
    color: "#ffffff",
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
    element.style.textShadow = "0 1px 2px rgba(0,0,0,.38)";
    element.style.border = "1px solid rgba(255,255,255,.18)";
    element.style.boxShadow = "0 1px 2px rgba(15,23,42,.12)";
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
