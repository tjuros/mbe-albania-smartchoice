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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
