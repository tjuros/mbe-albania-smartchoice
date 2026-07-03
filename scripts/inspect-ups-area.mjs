import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const sourcePath = new URL("../public/remote/ups-area-2026.b64", import.meta.url);
const reportPath = new URL("../public/remote/ups-area-format.txt", import.meta.url);

const encoded = readFileSync(sourcePath, "utf8").replace(/\s+/g, "");
const compressed = Buffer.from(encoded, "base64");
const lines = [
  `encoded_chars=${encoded.length}`,
  `compressed_bytes=${compressed.length}`,
  `compressed_prefix_hex=${compressed.subarray(0, 32).toString("hex")}`,
];

try {
  const decoded = gunzipSync(compressed);
  const text = decoded.toString("utf8");
  lines.push(
    `decoded_bytes=${decoded.length}`,
    `first_byte=${decoded[0] ?? -1}`,
    "--- preview ---",
    text.slice(0, 12000),
  );
  console.log(`UPS area data decoded: ${decoded.length} bytes`);
} catch (error) {
  lines.push(
    `decode_error=${error instanceof Error ? error.message : String(error)}`,
    "--- encoded preview ---",
    encoded.slice(0, 2000),
  );
  console.warn("UPS area data inspection failed; app build will continue.");
}

writeFileSync(reportPath, lines.join("\n"), "utf8");
