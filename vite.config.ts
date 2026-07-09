import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function enablePricingRuntimes(): Plugin {
  return {
    name: "enable-pricing-runtimes",
    enforce: "pre",
    transform(code, id) {
      if (id.endsWith("/src/App.tsx")) {
        let transformed = code;

        if (!transformed.includes('from "./countries"')) {
          transformed = `import { ALL_COUNTRIES, SearchableCountrySelect } from "./countries";\n${transformed}`;
        }

        transformed = transformed.replace(
          /const COUNTRIES: Country\[\] = \[[\s\S]*?\n\];/,
          "const COUNTRIES: Country[] = ALL_COUNTRIES;",
        );

        transformed = transformed.replace(
          /<select value=\{countryCode\} onChange=\{\(event\) => setCountryCode\(event\.target\.value\)\} style=\{inputStyle\(\)\}>[\s\S]*?<\/select>/,
          `<SearchableCountrySelect
                  value={countryCode}
                  onChange={setCountryCode}
                  countries={COUNTRIES}
                  language={language}
                  direction={direction}
                  style={inputStyle()}
                />`,
        );

        transformed = transformed.replace(
          `): PriceResult[] {\n  if (shipmentType === "documents" && chargeable > 5) {`,
          `): PriceResult[] {\n  if (zone < 0) {\n    const reason = languageUnavailableReason(copy);\n    return [\n      fail("Posta Shqiptare (EMS)", "MBE Economy", [reason]),\n      fail("DHL Standard", "MBE Economy", [reason]),\n      fail("UPS Standard", "MBE Economy", [reason]),\n      fail("DHL Express", "MBE Express", [reason]),\n      fail("UPS Express", "MBE Express", [reason]),\n      fail("FedEx", "MBE Express", [reason]),\n    ];\n  }\n\n  if (shipmentType === "documents" && chargeable > 5) {`,
        );

        if (!transformed.includes("function languageUnavailableReason")) {
          transformed = transformed.replace(
            "function calculateInternational(",
            `function languageUnavailableReason(copy: (typeof COPY)[Language]) {\n  return copy.unavailable === "Unavailable"\n    ? "Tariff not configured for this country yet."\n    : "Tarifa për këtë shtet nuk është konfiguruar ende.";\n}\n\nfunction calculateInternational(`,
          );
        }

        return transformed === code ? null : transformed;
      }

      if (!id.endsWith("/src/main.tsx")) return null;

      let transformed = code;

      if (!transformed.includes('import "./eliteRuntime";')) {
        transformed = transformed.replace(
          'import "./dhlRuntime";',
          'import "./dhlRuntime";\nimport "./eliteRuntime";',
        );
      }

      if (!transformed.includes('import "./ultraRuntime";')) {
        transformed = transformed.replace(
          'import "./eliteRuntime";',
          'import "./eliteRuntime";\nimport "./ultraRuntime";',
        );
      }

      if (!transformed.includes('import "./upsRuntime";')) {
        transformed = transformed.replace(
          'import "./ultraRuntime";',
          'import "./ultraRuntime";\nimport "./upsRuntime";',
        );
      }

      transformed = transformed
        .replace(
          'badge.style.background = "#dc2626";\n    badge.style.color = "#ffffff";\n    badge.style.border = "1px solid #b91c1c";',
          'badge.style.background = "#e5e7eb";\n    badge.style.color = "#475569";\n    badge.style.border = "1px solid #cbd5e1";',
        )
        .replace(
          'card.style.background = "#fff1f2";\n      card.style.border = "1px solid #f87171";\n      card.style.boxShadow = "0 1px 2px rgba(220,38,38,.08)";',
          'card.style.background = "#f8fafc";\n      card.style.border = "1px solid #cbd5e1";\n      card.style.boxShadow = "0 1px 2px rgba(100,116,139,.08)";',
        );

      return transformed === code ? null : transformed;
    },
    transformIndexHtml(html) {
      return html
        .replace(
          'const domestic = !inbound && select.value === "AL";\n        wrapper.hidden = domestic;',
          'wrapper.hidden = false;',
        )
        .replace(
          'Përdoret për kontrollin automatik të zonës së largët DHL.',
          'Kodi postar përdoret për itinerarin dhe zonën. Tarifat Remote/Extended kontrollohen manualisht.',
        )
        .replace(
          'Used for automatic DHL remote-area checking.',
          'Postal code is used for routing and zone checks. Remote/Extended surcharges are checked manually.',
        )
        .replace(
          'Përdoret për kontrollin e itinerarit, zonës dhe tarifave shtesë.',
          'Kodi postar përdoret për itinerarin dhe zonën. Tarifat Remote/Extended kontrollohen manualisht.',
        )
        .replace(
          'Used for route, zone and surcharge checks.',
          'Postal code is used for routing and zone checks. Remote/Extended surcharges are checked manually.',
        );
    },
  };
}

export default defineConfig({
  plugins: [enablePricingRuntimes(), react()],
});