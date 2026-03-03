import { Dirent } from 'fs';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export async function ensureDirectory(directoryPath: string): Promise<void> {
  await mkdir(directoryPath, { recursive: true });
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(filePath, content, 'utf8');
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

export async function walkFiles(root: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = (await readdir(currentPath, { withFileTypes: true })) as Dirent[];

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        results.push(absolutePath);
      }
    }
  }

  await walk(root);

  return results;
}
