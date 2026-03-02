import Module from 'module';
import path from 'path';

import { AppsCompiler } from '@rocket.chat/apps-compiler';

import { CliError } from './errors';
import { ProjectContext } from './project';

const createRequire = Module.createRequire;

interface CompilerDiagnostic {
  message: string;
}

interface CompilerResponse {
  diagnostics: CompilerDiagnostic[];
  typeScriptVersion?: string;
}

export interface BuildOptions {
  force: boolean;
  verbose: boolean;
  useNativeCompiler: boolean;
}

export async function buildAndPackage(project: ProjectContext, options: BuildOptions): Promise<string> {
  const compiler = createCompiler(project.rootPath, options.useNativeCompiler);

  const compileResult = (await compiler.compile()) as CompilerResponse;

  if (options.verbose && compileResult.typeScriptVersion) {
    console.log(`[info] using TypeScript ${compileResult.typeScriptVersion}`);
  }

  ensureDiagnosticsAreSafe('TypeScript', compileResult.diagnostics, options.force);

  const bundleResult = (await compiler.bundle()) as CompilerResponse;
  ensureDiagnosticsAreSafe('Bundler', bundleResult.diagnostics, options.force);

  const zipName = path.join('dist', `${project.manifest.nameSlug}_${project.manifest.version}.zip`);
  await compiler.outputZip(zipName);

  return zipName;
}

function createCompiler(projectPath: string, useNativeCompiler: boolean): AppsCompiler {
  const appRequire = createRequire(path.join(projectPath, 'app.json'));

  let typescriptImpl: unknown;

  try {
    typescriptImpl = appRequire('typescript');
  } catch {
    throw new CliError('TypeScript is required in the app project. Run npm install in your app folder.', 2);
  }

  return new AppsCompiler(
    {
      tool: '@rocket.chat/apps-cli',
      version: '2.0.0',
      when: new Date(),
    },
    projectPath,
    typescriptImpl as any,
    useNativeCompiler,
  );
}

function ensureDiagnosticsAreSafe(stage: string, diagnostics: CompilerDiagnostic[], force: boolean): void {
  if (!diagnostics || diagnostics.length === 0 || force) {
    return;
  }

  const message = diagnostics.map((item) => item.message).join('\n');
  throw new CliError(`${stage} errors occurred:\n${message}`, 1);
}
