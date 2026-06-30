import { copyFile, mkdir, rm } from 'node:fs/promises'

await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })
await copyFile('index.html', 'dist/index.html')
await copyFile('src/index.css', 'dist/styles.css')

console.log('Static build completed successfully.')
