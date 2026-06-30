import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'

await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })
await copyFile('src/index.css', 'dist/styles.css')

const lt = '<'
const gt = '>'
const page = [
  `${lt}!doctype html${gt}`,
  `${lt}html lang="en"${gt}`,
  `${lt}head${gt}`,
  `${lt}meta charset="UTF-8" /${gt}`,
  `${lt}meta name="viewport" content="width=device-width, initial-scale=1.0" /${gt}`,
  `${lt}meta name="description" content="MBE Albania SmartChoice shipping comparison application" /${gt}`,
  `${lt}link rel="stylesheet" href="/styles.css" /${gt}`,
  `${lt}title${gt}MBE Albania SmartChoice${lt}/title${gt}`,
  `${lt}/head${gt}`,
  `${lt}body${gt}`,
  `${lt}main class="app-shell"${gt}`,
  `${lt}section class="hero-card"${gt}`,
  `${lt}div class="brand-mark"${gt}MBE${lt}/div${gt}`,
  `${lt}p class="eyebrow"${gt}MBE Albania${lt}/p${gt}`,
  `${lt}h1${gt}SmartChoice${lt}/h1${gt}`,
  `${lt}p class="subtitle"${gt}Compare shipping services and choose the best option for every shipment.${lt}/p${gt}`,
  `${lt}div class="status-badge"${gt}Application setup complete${lt}/div${gt}`,
  `${lt}/section${gt}`,
  `${lt}/main${gt}`,
  `${lt}/body${gt}`,
  `${lt}/html${gt}`,
].join('\n')

await writeFile('dist/index.html', page, 'utf8')
console.log('Static build completed successfully.')
