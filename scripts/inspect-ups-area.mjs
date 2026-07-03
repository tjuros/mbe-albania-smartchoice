import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const sourcePath = new URL("../public/remote/ups-area-2026.b64", import.meta.url);
const reportPath = new URL("../public/remote/ups-area-format.txt", import.meta.url);

const encoded = readFileSync(sourcePath, "utf8").replace(/\s+/g, "");
const compressed = Buffer.from(encoded, "base64");
const decoded = gunzipSync(compressed);
const text = decoded.toString("utf8");

const report = [
  `encoded_chars=${encoded.length}`,
  `compressed_bytes=${compressed.length}`,
  `decoded_bytes=${decoded.length}`,
  `first_byte=${decoded[0] ?? -1}`,
  "--- preview ---",
  text.slice(0, 12000),
].join("\n");

writeFileSync(reportPath, report, "utf8");
console.log(`UPS area data decoded: ${decoded.length} bytes`);
