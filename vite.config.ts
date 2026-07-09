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
                {isDomestic ? (
                  <div data-smart-zip="true" className="smart-zip-wrap" style={{ marginTop: 12 }}>
                    <label className="smart-zip-label" htmlFor="dhl-zip-code" style={{ display: "block", marginBottom: 6, fontWeight: 800 }}>
                      {copy.destinationPostalCode}
                    </label>
                    <input
                      {...commonInputProps}
                      id="dhl-zip-code"
                      className="smart-zip-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={4}
                      value={postalCode}
                      onChange={(event) => {
                        const next = event.target.value.replace(/\\D/g, "").slice(0, 4);
                        setPostalCode(next);
                      }}
                      placeholder="1001"
                      style={inputStyle()}
                    />
                    <div className="smart-zip-help" style={{ marginTop: 6, color: "#64748b", fontSize: 12, lineHeight: 1.4 }}>
                      {copy.ultraPostalCodeHelp}
                    </div>
                  </div>
                ) : null}`,
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

      if (id.endsWith("/src/dhlRuntime.ts")) {
        let transformed = code;

        transformed = transformed.replace(
          /const EXPRESS_ZONES: Record<string, number> = \{[\s\S]*?\n\};/,
          `const EXPRESS_ZONE_BY_COUNTRY: Record<string, number> = {\n  GR: 1, BA: 1, ME: 1, XK: 1, MK: 1, RS: 1,\n  AT: 2, IT: 2, DE: 2, LI: 2, SM: 2, VA: 2, CH: 2,\n  AD: 3, GG: 3, NL: 3, HU: 3, BE: 3, IS: 3, LU: 3, MT: 3, GB: 3, MC: 3, SE: 3,\n  BG: 3, DK: 3, FI: 3, FR: 3, NO: 3, ES: 3, TR: 3, CY: 3, CZ: 3, IE: 3, RO: 3,\n  SI: 3, SK: 3, PL: 3, PT: 3, IL: 3, HR: 3, JE: 3, GI: 3,\n  US: 4, MX: 4, CA: 4, FO: 4, GL: 4,\n  SA: 5, BH: 5, HK: 5, MY: 5, AE: 5, CN: 5, PH: 5, IN: 5, ID: 5, IR: 5, JP: 5,\n  JO: 5, QA: 5, TW: 5, UA: 5, EE: 5, KW: 5, MO: 5, KR: 5, SG: 5, LV: 5, LT: 5,\n};\n\nconst EXPRESS_UNLISTED_COUNTRIES = new Set([\n  "AL", "AQ", "AX", "BV", "CC", "CX", "EH", "GS", "HM", "IM", "IO", "MF",\n  "NF", "PM", "PN", "PS", "SJ", "TF", "TK", "UM", "WF",\n]);\n\nfunction dhlExpressZone(countryCode: string) {\n  const configured = EXPRESS_ZONE_BY_COUNTRY[countryCode];\n  if (configured) return configured;\n  return EXPRESS_UNLISTED_COUNTRIES.has(countryCode) ? 0 : 6;\n}`,
        );

        transformed = transformed
          .replace(
            "const DHL_EXPRESS_FUEL = 0.4725;",
            "const DHL_EXPRESS_FUEL = 0.4725;\nconst DHL_GOGREEN_PLUS_PER_KG = 0.16;",
          )
          .replace(
            "const fuelBase = transport + extra.total;",
            "const goGreenPlus = round2(Math.max(0.5, weight) * DHL_GOGREEN_PLUS_PER_KG);\n  const fuelBase = transport + extra.total + goGreenPlus;",
          )
          .replace(
            '    "DHL 2026 contract rate",',
            '    "DHL contract ratecard 18-Jun-2026",',
          )
          .replace(
            '  details.push(`Fuel ${(fuelRate * 100).toFixed(2)}%: ${eur(fuel)}`);',
            '  details.push(`GoGreen Plus €0.16/kg: ${eur(goGreenPlus)}`);\n  details.push(`Fuel ${(fuelRate * 100).toFixed(2)}%: ${eur(fuel)}`);',
          )
          .replace(
            "const zone = EXPRESS_ZONES[currentCountry];",
            "const zone = dhlExpressZone(currentCountry);",
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
