#!/usr/bin/env python3
from __future__ import annotations

import gzip
import json
import os
import re
import tempfile
import urllib.request
from pathlib import Path

from pypdf import PdfReader

SUPPORTED = {"IT", "GR", "HR", "DE", "AT", "FR", "ES", "GB", "US", "CA", "AE", "CN", "AU"}
NUMERIC_LENGTHS = {"IT": 5, "GR": 5, "HR": 5, "DE": 5, "AT": 4, "FR": 5, "ES": 5, "US": 5, "CN": 6, "AU": 4}
CA_LETTERS = "ABCEGHJKLMNPRSTVWXYZ"
CA_INDEX = {char: index for index, char in enumerate(CA_LETTERS)}
CA_RADICES = (20, 10, 20, 10, 20, 10)
URL = "".join((
    "https://mydhl.express.dhl/content/dam/downloads/",
    "g0/remote-areas/",
    "dhl_express_remote_areas_en.pdf.coredownload.pdf",
))


def normalize(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def ca_index(value: str) -> int:
    value = normalize(value)
    if len(value) != 6:
        raise ValueError(value)
    values = (CA_INDEX[value[0]], int(value[1]), CA_INDEX[value[2]], int(value[3]), CA_INDEX[value[4]], int(value[5]))
    result = 0
    for item, radix in zip(values, CA_RADICES):
        result = result * radix + item
    return result


def merge_ranges(ranges: list[tuple[int, int]]) -> list[list[int]]:
    if not ranges:
        return []
    ranges.sort()
    merged: list[list[int]] = []
    start, end = ranges[0]
    for next_start, next_end in ranges[1:]:
        if next_start <= end + 1:
            end = max(end, next_end)
        else:
            merged.append([start, end])
            start, end = next_start, next_end
    merged.append([start, end])
    return merged


def parse_pdf(pdf: Path) -> dict:
    numeric: dict[str, list[tuple[int, int]]] = {code: [] for code in NUMERIC_LENGTHS}
    canada: list[tuple[int, int]] = []
    gb: list[list[str]] = []

    for page in PdfReader(str(pdf)).pages:
        for line in (page.extract_text() or "").splitlines():
            tokens = line.split()
            code_pos = next((i for i, token in enumerate(tokens) if token in SUPPORTED), None)
            if code_pos is None:
                continue
            code = tokens[code_pos]
            tail = tokens[code_pos + 1:]
            if code in {"CA", "GB"}:
                if len(tail) < 4:
                    continue
                start = normalize(tail[-4] + tail[-3])
                end = normalize(tail[-2] + tail[-1])
                if code == "CA":
                    try:
                        canada.append((ca_index(start), ca_index(end)))
                    except (ValueError, KeyError):
                        pass
                elif any(ch.isdigit() for ch in start) and any(ch.isdigit() for ch in end):
                    gb.append([start, end])
                continue

            expected = NUMERIC_LENGTHS.get(code)
            if expected is None or len(tail) < 2:
                continue
            start, end = normalize(tail[-2]), normalize(tail[-1])
            if (len(start) != expected or len(end) != expected) and len(tail) >= 4:
                start = normalize(tail[-4] + tail[-3])
                end = normalize(tail[-2] + tail[-1])
            if len(start) == expected and len(end) == expected and start.isdigit() and end.isdigit():
                a, b = int(start), int(end)
                numeric[code].append((min(a, b), max(a, b)))

    return {
        "version": "2026-01-04",
        "numeric": {code: {"length": NUMERIC_LENGTHS[code], "ranges": merge_ranges(ranges)} for code, ranges in numeric.items()},
        "CA": merge_ranges(canada),
        "GB": sorted({(a, b) for a, b in gb}),
    }


def obtain_pdf() -> Path:
    local = os.environ.get("DHL_REMOTE_PDF")
    if local:
        return Path(local)
    target = Path(tempfile.gettempdir()) / "dhl-remote-2026.pdf"
    request = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=180) as response:
        target.write_bytes(response.read())
    return target


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    output = root / "public" / "dhl-remote-2026.json.gz"
    output.parent.mkdir(exist_ok=True)
    data = parse_pdf(obtain_pdf())
    required = set(NUMERIC_LENGTHS) | {"CA", "GB"}
    missing = [code for code in sorted(required) if not (data[code] if code in {"CA", "GB"} else data["numeric"][code]["ranges"])]
    if missing:
        raise RuntimeError("Missing DHL remote data: " + ", ".join(missing))
    payload = json.dumps(data, separators=(",", ":")).encode()
    output.write_bytes(gzip.compress(payload, compresslevel=9, mtime=0))
    print(f"Built {output} ({output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
