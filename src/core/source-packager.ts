import { createWriteStream } from 'fs';
import { mkdir, stat } from 'fs/promises';
import path from 'path';

import { ProjectContext } from './project';
import { walkFiles } from '../utils/files';
import { buildGlobMatcher } from '../utils/glob';
import { normalizePathForMatch } from '../utils/strings';

const Yazl = require('yazl');

const SOURCE_IGNORE_PATTERNS = [
  '**/README.md',
  '**/tsconfig.json',
  '**/package-lock.json',
  '**/*.js',
  '**/*.js.map',
  '**/*.d.ts',
  '**/*.spec.ts',
  '**/*.test.ts',
  '**/dist/**',
  '**/node_modules/**',
  '**/.git/**',
  '**/.*',
];

const PACKAGER_INFO = {
  tool: '@rocket.chat/apps-cli',
  version: '2.0.0',
};

export async function packageSource(project: ProjectContext): Promise<string> {
  const matcher = buildGlobMatcher(SOURCE_IGNORE_PATTERNS);
  const files = await walkFiles(project.rootPath);

  const included = files.filter((absolutePath) => {
    const relativePath = normalizePathForMatch(path.relative(project.rootPath, absolutePath));
    return !matcher(relativePath);
  });

  if (included.length === 0) {
    throw new Error('No files to package were found.');
  }

  const zipRelativePath = path.join('dist', `${project.manifest.nameSlug}_${project.manifest.version}.zip`);
  const zipAbsolutePath = path.join(project.rootPath, zipRelativePath);

  await mkdir(path.dirname(zipAbsolutePath), { recursive: true });

  const zip = new Yazl.ZipFile();
  zip.addBuffer(Buffer.from(JSON.stringify(PACKAGER_INFO)), '.packagedby', { compress: true });

  for (const absolutePath of included) {
    const relativePath = normalizePathForMatch(path.relative(project.rootPath, absolutePath));
    const fileStat = await stat(absolutePath);

    zip.addFile(absolutePath, relativePath, {
      compress: true,
      mtime: fileStat.mtime,
      mode: fileStat.mode,
    });
  }

  await writeZip(zip, zipAbsolutePath);

  return zipRelativePath;
}

async function writeZip(zip: any, outputPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    zip.outputStream
      .pipe(createWriteStream(outputPath))
      .on('close', resolve)
      .on('error', reject);

    zip.end();
  });
}
