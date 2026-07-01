import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

export type CountryOption = {
  code: string;
  nameEn: string;
  nameSq: string;
  outboundZone: number;
  inboundZone: number;
};

const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB",
  "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY",
  "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX",
  "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK",
  "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS",
  "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR",
  "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA",
  "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE",
  "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM",
  "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG",
  "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF",
  "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY",
  "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW",
] as const;

const CONFIGURED_ZONES: Record<string, [number, number]> = {
  AL: [0, 0], IT: [1, 1], GR: [1, 1], HR: [2, 2], DE: [2, 2], AT: [2, 2],
  FR: [3, 3], ES: [3, 3], GB: [4, 4], US: [5, 5], CA: [5, 5], AE: [5, 5],
  CN: [6, 6], AU: [7, 7],
};

const FALLBACK_NAMES: Record<string, { en: string; sq: string }> = {
  XK: { en: "Kosovo", sq: "Kosovë" },
  MK: { en: "North Macedonia", sq: "Maqedonia e Veriut" },
  TW: { en: "Taiwan", sq: "Tajvan" },
  PS: { en: "Palestine", sq: "Palestinë" },
};

const englishNames = typeof Intl !== "undefined" && "DisplayNames" in Intl
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null;
const albanianNames = typeof Intl !== "undefined" && "DisplayNames" in Intl
  ? new Intl.DisplayNames(["sq"], { type: "region" })
  : null;

export const ALL_COUNTRIES: CountryOption[] = COUNTRY_CODES.map((code) => {
  const zones = CONFIGURED_ZONES[code] ?? [-1, -1];
  const fallback = FALLBACK_NAMES[code];
  return {
    code,
    nameEn: fallback?.en ?? englishNames?.of(code) ?? code,
    nameSq: fallback?.sq ?? albanianNames?.of(code) ?? fallback?.en ?? englishNames?.of(code) ?? code,
    outboundZone: zones[0],
    inboundZone: zones[1],
  };
}).sort((a, b) => a.nameEn.localeCompare(b.nameEn, "en"));

const POPULAR_CODES = ["AL", "XK", "MK", "IT", "GR", "HR", "DE", "AT", "FR", "ES", "GB", "US", "CA"];

function flagEmoji(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return "🌍";
  return String.fromCodePoint(...code.split("").map((letter) => 127397 + letter.charCodeAt(0)));
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type Props = {
  value: string;
  onChange: (code: string) => void;
  countries: CountryOption[];
  language: "en" | "sq";
  direction: "outbound" | "inbound";
  style?: CSSProperties;
};

export function SearchableCountrySelect({ value, onChange, countries, language, direction, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const availableCountries = useMemo(
    () => countries.filter((country) => direction === "outbound" || country.code !== "AL"),
    [countries, direction],
  );

  const selected = availableCountries.find((country) => country.code === value) ?? availableCountries[0];
  const countryName = (country: CountryOption) => language === "sq" ? country.nameSq : country.nameEn;

  const filteredCountries = useMemo(() => {
    const term = normalize(query);
    const matches = availableCountries.filter((country) => {
      if (!term) return true;
      return normalize(`${country.code} ${country.nameEn} ${country.nameSq}`).includes(term);
    });

    return matches.sort((a, b) => {
      if (!term) {
        const aPopular = POPULAR_CODES.indexOf(a.code);
        const bPopular = POPULAR_CODES.indexOf(b.code);
        if (aPopular !== -1 || bPopular !== -1) {
          if (aPopular === -1) return 1;
          if (bPopular === -1) return -1;
          return aPopular - bPopular;
        }
      }
      return countryName(a).localeCompare(countryName(b), language === "sq" ? "sq" : "en");
    });
  }, [availableCountries, language, query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const select = selectRef.current;
    if (!select || select.value === value) return;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, [value]);

  useEffect(() => setActiveIndex(0), [query, direction]);

  const selectCountry = (code: string) => {
    onChange(code);
    const select = selectRef.current;
    if (select) {
      select.value = code;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, filteredCountries.length - 1)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && filteredCountries[activeIndex]) {
      event.preventDefault();
      selectCountry(filteredCountries[activeIndex].code);
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  const displayValue = open ? query : selected ? `${flagEmoji(selected.code)} ${countryName(selected)}` : "";
  const placeholder = language === "sq" ? "Kërko shtetin ose kodin..." : "Search country or code...";
  const noResults = language === "sq" ? "Nuk u gjet asnjë shtet" : "No countries found";

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={displayValue}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="country-options"
        onFocus={() => { setOpen(true); setQuery(""); }}
        onClick={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
        onKeyDown={handleKeyDown}
        style={{ ...style, paddingRight: 42 }}
      />
      <span
        aria-hidden="true"
        style={{ position: "absolute", right: 14, top: 15, pointerEvents: "none", color: "#64748b", fontSize: 18 }}
      >⌄</span>

      {open ? (
        <div
          id="country-options"
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 1000,
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            maxHeight: 330,
            overflowY: "auto",
            border: "1px solid #cbd5e1",
            borderRadius: 12,
            background: "#fff",
            boxShadow: "0 12px 28px rgba(15,23,42,.16)",
            padding: 6,
          }}
        >
          {filteredCountries.length ? filteredCountries.map((country, index) => {
            const active = index === activeIndex;
            const selectedOption = country.code === value;
            return (
              <button
                type="button"
                role="option"
                aria-selected={selectedOption}
                key={country.code}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectCountry(country.code)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: 0,
                  borderRadius: 9,
                  padding: "10px 11px",
                  background: selectedOption ? "#e0f2fe" : active ? "#f1f5f9" : "transparent",
                  color: "#111827",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: selectedOption ? 800 : 600,
                }}
              >
                <span style={{ fontSize: 20, width: 26, textAlign: "center" }}>{flagEmoji(country.code)}</span>
                <span style={{ flex: 1 }}>{countryName(country)}</span>
                <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{country.code}</span>
              </button>
            );
          }) : (
            <div style={{ padding: 14, color: "#64748b", textAlign: "center" }}>{noResults}</div>
          )}
        </div>
      ) : null}

      <select ref={selectRef} defaultValue={value} aria-hidden="true" tabIndex={-1} style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}>
        {availableCountries.map((country) => <option key={country.code} value={country.code}>{countryName(country)}</option>)}
      </select>
    </div>
  );
}
