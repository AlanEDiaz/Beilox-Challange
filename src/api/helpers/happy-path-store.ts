import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const HAPPY_PATH_DIR = path.resolve(process.cwd(), 'data', 'happy-path');

/** Persists a happy-path response body as `data/happy-path/<name>.json` for future validations. */
export async function saveHappyPath(name: string, body: unknown): Promise<string> {
  await mkdir(HAPPY_PATH_DIR, { recursive: true });
  const file = path.join(HAPPY_PATH_DIR, `${name}.json`);
  await writeFile(file, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
  return file;
}
