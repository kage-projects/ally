import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = new URL('../src/styles.css', import.meta.url);
const destination = new URL('../dist/styles.css', import.meta.url);
copyFileSync(fileURLToPath(source), fileURLToPath(destination));
