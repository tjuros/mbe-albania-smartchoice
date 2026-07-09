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
                  onChange={(value) => {
                    setCountryCode(value);
                    setPostalCode("");
                  }}
                  countries={COUNTRIES}
                  language={language}
                  direction={direction}
                  style={inputStyle()}
                />
                <div data-smart-zip="true" className="smart-zip-wrap" style={{ marginTop: 12 }}>
                  <label className="smart-zip-label" htmlFor="dhl-zip-code" style={{ display: "block", marginBottom: 6, fontWeight: 800 }}>
                    {direction === "outbound" ? copy.destinationPostalCode : copy.originPostalCode}
                  </label>
                  <input
                    {...commonInputProps}
                    id="dhl-zip-code"
                    className="smart-zip-input"
                    type="text"
                    inputMode={isDomestic ? "numeric" : "text"}
                    autoComplete="postal-code"
                    maxLength={isDomestic ? 4 : 12}
                    value={postalCode}
                    onChange={(event) => {
                      const raw = event.target.value.toUpperCase();
                      const next = isDomestic
                        ? raw.replace(/\\D/g, "").slice(0, 4)
                        : raw.replace(/[^A-Z0-9]/g, "").slice(0, 12);
                      setPostalCode(next);
                    }}
                    placeholder={isDomestic ? "1001" : "e.g. 1001"}
                    style={{ ...inputStyle(), textTransform: "uppercase" }}
                  />
                  <div className="smart-zip-help" style={{ marginTop: 6, color: "#64748b", fontSize: 12, lineHeight: 1.4 }}>
                    {isDomestic ? copy.ultraPostalCodeHelp : copy.postalCodeHelp}
                  </div>
                </div>`,
        );

        transformed = transformed
          .replace(
            '    destinationCountry: "Destination country",\n    originCountry: "Origin country",',
            '    destinationCountry: "Destination country",\n    originCountry: "Origin country",\n    destinationPostalCode: "Destination postal code",\n    originPostalCode: "Origin postal code",\n    postalCodeHelp: "Used where a courier tariff depends on the postal code.",\n    ultraPostalCodeHelp: "ULTRA determines the delivery area, price and delivery time from the postal code.",',
          )
          .replace(
            '    destinationCountry: "Shteti i destinacionit",\n    originCountry: "Shteti i origjinës",',
            '    destinationCountry: "Shteti i destinacionit",\n    originCountry: "Shteti i origjinës",\n    destinationPostalCode: "Kodi postar i destinacionit",\n    originPostalCode: "Kodi postar i origjinës",\n    postalCodeHelp: "Përdoret kur tarifa e korrierit varet nga kodi postar.",\n    ultraPostalCodeHelp: "ULTRA përcakton zonën, çmimin dhe afatin e dorëzimit nga kodi postar.",',
          )
          .replace(
            '    testPriceNotice: "All prices and zones are temporary test values.",',
            '    testPriceNotice: "Prices use the currently configured tariffs and rules. Customs and optional services are not included.",',
          )
          .replace(
            '    testPriceNotice: "Të gjitha çmimet dhe zonat janë vlera të përkohshme testuese.",',
            '    testPriceNotice: "Çmimet përdorin tarifat dhe rregullat e konfiguruara aktualisht. Dogana dhe shërbimet opsionale nuk përfshihen.",',
          )
          .replace(
            '  const [countryCode, setCountryCode] = useState("AL");',
            '  const [countryCode, setCountryCode] = useState("AL");\n  const [postalCode, setPostalCode] = useState("");',
          )
          .replace(
            'onClick={() => setDirection("outbound")}',
            'onClick={() => { setDirection("outbound"); setPostalCode(""); }}',
          )
          .replace(
            'onClick={() => setDirection("inbound")}',
            'onClick={() => { setDirection("inbound"); setPostalCode(""); }}',
          )
          .replace(
            '    setCountryCode("AL");\n    setCod(false);',
            '    setCountryCode("AL");\n    setPostalCode("");\n    setCod(false);',
          )
          .replace(
            '  }, [isReady, direction, selectedCountry, isDomestic, chargeable, packages.length, cod, codAmount, shipmentType, copy]);',
            '  }, [isReady, direction, selectedCountry, isDomestic, chargeable, packages.length, cod, codAmount, shipmentType, copy, postalCode]);',
          );

        transformed = transformed.replace(
          `): PriceResult[] {\n  if (shipmentType === "documents" && chargeable > 5) {`,
          `): PriceResult[] {\n  if (zone < 0) {\n    const reason = languageUnavailableReason(copy);\n    return [\n      fail("Posta Shqiptare (EMS)", "MBE Economy", [reason]),\n      fail("DHL Standard", "MBE Economy", [reason]),\n      fail("DHL Express", "MBE Express", [reason]),\n      fail("UPS Express", "MBE Express", [reason]),\n    ];\n  }\n\n  if (shipmentType === "documents" && chargeable > 5) {`,
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
            '{highlighted && result.possible ? <span style={badgeStyle("info")}>{copy.recommended}</span> : null}\n            {(result.name.includes("EMS") || result.name.includes("Posta")) ? <span style={badgeStyle("warn")}>{copy.backupOption}</span> : null}',
          )
          .replace(
            'const overallWinner = possible.length ? [...possible].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0] : null;',
            `const recommendationRank = (result: PriceResult) => {\n      if (result.name.includes("DHL") || result.name.includes("UPS")) return 0;\n      if (result.name.includes("EMS") || result.name.includes("Posta")) return 2;\n      return 1;\n    };\n    const hasRecommendableOption = possible.some((result) => recommendationRank(result) < 2);\n    const overallWinner = hasRecommendableOption\n      ? [...possible].sort((a, b) => {\n          const rankDifference = recommendationRank(a) - recommendationRank(b);\n          return rankDifference || (a.price ?? Infinity) - (b.price ?? Infinity);\n        })[0]\n      : null;`,
          )
          .replace(
            '    const economy = all.filter((result) => result.serviceType === "MBE Economy").sort((a, b) => {',
            `    const supported = all.filter((result) => {\n      if (isDomestic) return result.name === "Ultra" || result.name === "Elite Post";\n      return [\n        "Posta Shqiptare (EMS)",\n        "DHL Standard",\n        "DHL Economy Select",\n        "DHL Express",\n        "DHL Express Worldwide",\n        "UPS Express",\n        "UPS Express Saver",\n      ].includes(result.name);\n    });\n    const economy = supported.filter((result) => result.serviceType === "MBE Economy").sort((a, b) => {`,
          )
          .replace(
            '    const express = all.filter((result) => result.serviceType === "MBE Express").sort((a, b) => {',
            '    const express = supported.filter((result) => result.serviceType === "MBE Express").sort((a, b) => {',
          )
          .replace(
            '      fail("UPS Standard", "MBE Economy", [copy.docsTooHeavy]),\n',
            '',
          )
          .replace(
            '      fail("FedEx", "MBE Express", [copy.docsTooHeavy]),\n',
            '',
          )
          .replace(
            '    buildResult("UPS Standard", "MBE Economy", (9.7 + zone * 4.35 + kg * 2.35) * inboundFactor * docsFactor, details(5000)),\n',
            '',
          )
          .replace(
            '    buildResult("FedEx", "MBE Express", (16.1 + zone * 5.65 + kg * 3.15) * inboundFactor * docsFactor, details(5000)),\n',
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

      if (!transformed.includes('import "./emsRuntime";')) {
        transformed = transformed.replace(
          'import "./upsRuntime";',
          'import "./upsRuntime";\nimport "./emsRuntime";',
        );
      }

      return transformed === code ? null : transformed;
    },
  };
}

export default defineConfig({
  plugins: [enablePricingRuntimes(), react()],
});
