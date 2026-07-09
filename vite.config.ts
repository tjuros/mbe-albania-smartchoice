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
          `): PriceResult[] {\n  if (zone < 0) {\n    const reason = languageUnavailableReason(copy);\n    return [\n      fail("Posta Shqiptare (EMS)", "MBE Economy", [reason]),\n      fail("DHL Standard", "MBE Economy", [reason]),\n      fail("DHL Express", "MBE Express", [reason]),\n      fail("UPS Express", "MBE Express", [reason]),\n      fail("FedEx", "MBE Express", [reason]),\n    ];\n  }\n\n  if (shipmentType === "documents" && chargeable > 5) {`,
        );

        if (!transformed.includes("function languageUnavailableReason")) {
          transformed = transformed.replace(
            "function calculateInternational(",
            `function languageUnavailableReason(copy: (typeof COPY)[Language]) {\n  return copy.unavailable === "Unavailable"\n    ? "Tariff not configured for this country yet."\n    : "Tarifa për këtë shtet nuk është konfiguruar ende.";\n}\n\nfunction calculateInternational(`,
          );
        }

        transformed = transformed
          .replace(
            'recommended: "Recommended",',
            'recommended: "Recommended",\n    backupOption: "Backup option",',
          )
          .replace(
            'recommended: "Rekomanduar",',
            'recommended: "Rekomanduar",\n    backupOption: "Opsion rezervë",',
          )
          .replace(
            '{highlighted && result.possible ? <span style={badgeStyle("info")}>{copy.recommended}</span> : null}',
            '{highlighted && result.possible ? <span style={badgeStyle("info")}>{copy.recommended}</span> : null}\n            {(result.name.includes("EMS") || result.name.includes("Posta")) && result.possible ? <span style={badgeStyle("warn")}>{copy.backupOption}</span> : null}',
          )
          .replace(
            'const overallWinner = possible.length ? [...possible].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0] : null;',
            `const recommendationRank = (result: PriceResult) => {\n      if (result.name.includes("DHL") || result.name.includes("UPS")) return 0;\n      if (result.name.includes("EMS") || result.name.includes("Posta")) return 2;\n      return 1;\n    };\n    const hasRecommendableOption = possible.some((result) => recommendationRank(result) < 2);\n    const overallWinner = hasRecommendableOption\n      ? [...possible].sort((a, b) => {\n          const rankDifference = recommendationRank(a) - recommendationRank(b);\n          return rankDifference || (a.price ?? Infinity) - (b.price ?? Infinity);\n        })[0]\n      : null;`,
          )
          .replace(
            '      fail("UPS Standard", "MBE Economy", [copy.docsTooHeavy]),\n',
            '',
          )
          .replace(
            '    buildResult("UPS Standard", "MBE Economy", (9.7 + zone * 4.35 + kg * 2.35) * inboundFactor * docsFactor, details(5000)),\n',
            '',
          );

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

      return transformed === code ? null : transformed;
    },
  };
}

export default defineConfig({
  plugins: [enablePricingRuntimes(), react()],
});