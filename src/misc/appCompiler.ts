import { Command } from '@oclif/command';
import chalk from 'chalk';
import * as ts from 'typescript';

import { compilerOptions } from './compilerOptions';
import { DiagnosticReport } from './diagnosticReport';
import { FolderDetails } from './folderDetails';

export class AppCompiler {
    public program: ts.Program;

    constructor(private command: Command, private fd: FolderDetails) {
        this.program = ts.createProgram({
            rootNames: [this.fd.mainFile],
            options: compilerOptions,
        });
    }

    // TODO: Determine which diagnostics we need to actually report, or is preEmit fine?
    public logDiagnostics(): DiagnosticReport {
        const report = new DiagnosticReport();

        report.options = this.reportDiagnostics(this.program.getOptionsDiagnostics());
        report.syntactic = this.reportDiagnostics(this.program.getSyntacticDiagnostics());
        report.global = this.reportDiagnostics(this.program.getGlobalDiagnostics());
        // report.semantic = this.reportDiagnostics(this.program.getSemanticDiagnostics());
        report.declaration = this.reportDiagnostics(this.program.getDeclarationDiagnostics());
        report.emit = this.reportDiagnostics(ts.getPreEmitDiagnostics(this.program));

        return report;
    }

    private reportDiagnostics(diagnos: ReadonlyArray<ts.Diagnostic>): number {
        for (const d of diagnos) {
            if (!d.file || !d.start) {
                this.command.warn(ts.DiagnosticCategory[d.category].toLowerCase() +
                    d.code + ': ' + ts.flattenDiagnosticMessageText(d.messageText, '\n'));
                continue;
            }

            const startPos = ts.getLineAndCharacterOfPosition(d.file, d.start);

            // tslint:disable-next-line:max-line-length
            const redPart = chalk.red(`${ d.file.fileName } (${ startPos.line + 1 },${ startPos.character + 1 }): \n  `);
            this.command.error(redPart + ts.flattenDiagnosticMessageText(d.messageText, '\n'), { exit: false });
        }

        return diagnos.length;
    }
}
