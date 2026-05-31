import * as vscode from 'vscode';
import { analyzeFile } from '../analyzer/analyzeFile';

interface SummaryEntry {
    severity: vscode.DiagnosticSeverity;
    text: string;
}

export class SummaryManager {

    public static async showSummary(): Promise<void> {

        const output =
            vscode.window.createOutputChannel(
                'CSmell Summary'
            );

        output.clear();

        const phpFiles =
            await vscode.workspace.findFiles(
                '**/*.php',
                '**/vendor/**'
            );

        let warningCount = 0;
        let errorCount = 0;
        let informationCount = 0;
        let totalViolations = 0;

        const grouped =
            new Map<string, SummaryEntry[]>();

        for (const file of phpFiles) {

            const document =
                await vscode.workspace.openTextDocument(
                    file
                );

            const diagnostics =
                analyzeFile(document);

            for (const diagnostic of diagnostics) {

                totalViolations++;

                const rule =
                    this.getRuleName(
                        diagnostic.code?.toString() ?? ''
                    );

                const summary =
                    this.getViolationSummary(
                        diagnostic
                    );

                const fileName =
                    document.fileName
                        .split(/[\\/]/)
                        .pop() ?? '';

                const icon =
                    diagnostic.severity === vscode.DiagnosticSeverity.Error
                        ? '✖'
                        : diagnostic.severity === vscode.DiagnosticSeverity.Warning
                            ? '⚠'
                            : 'ℹ';

                if (!grouped.has(rule)) {
                    grouped.set(rule, []);
                }

                grouped.get(rule)?.push({
                    severity: diagnostic.severity,
                    text:
                        `${icon} ${fileName}\n` +
                        `  └─ ${summary}`
                });

                switch (diagnostic.severity) {

                    case vscode.DiagnosticSeverity.Error:
                        errorCount++;
                        break;

                    case vscode.DiagnosticSeverity.Warning:
                        warningCount++;
                        break;

                    case vscode.DiagnosticSeverity.Information:
                        informationCount++;
                        break;
                }
            }
        }

        output.appendLine(
            '================================='
        );

        output.appendLine(
            'CSMELL SUMMARY'
        );

        output.appendLine(
            '================================='
        );

        output.appendLine('');

        const orderedRules = [
            'Direct DB Access',
            'Fat Controller',
            'High Complexity'
        ];

        for (const rule of orderedRules) {

            const entries =
                grouped.get(rule);

            if (!entries || entries.length === 0) {
                continue;
            }

            entries.sort(
                (a, b) =>
                    b.severity - a.severity
            );

            output.appendLine(
                `${rule.toUpperCase()} (${entries.length})`
            );

            output.appendLine(
                '────────────────────'
            );

            entries.forEach(entry => {

                output.appendLine(
                    entry.text
                );

                output.appendLine('');
            });
        }

        output.appendLine(
            '================================='
        );

        output.appendLine(
            `Total Violations : ${totalViolations}`
        );

        output.appendLine(
            `Error   : ${errorCount}`
        );

        output.appendLine(
            `Warning : ${warningCount}`
        );

        output.appendLine(
            `Info    : ${informationCount}`
        );

        output.appendLine(
            '================================='
        );

        output.show();
    }

    private static getRuleName(
        code: string
    ): string {

        if (
            code.includes('DIRECT_DB_ACCESS')
        ) {
            return 'Direct DB Access';
        }

        if (
            code.includes('FAT_CONTROLLER') ||
            code.includes('GOD_CONTROLLER')
        ) {
            return 'Fat Controller';
        }

        if (
            code.includes('COGNITIVE_COMPLEXITY')
        ) {
            return 'High Complexity';
        }

        return 'Other';
    }

    private static getViolationSummary(
        diagnostic: vscode.Diagnostic
    ): string {

        const code =
            diagnostic.code?.toString() ?? '';

        const message =
            diagnostic.message;

        // =========================
        // DIRECT DB ACCESS
        // =========================

        if (code === 'DIRECT_DB_ACCESS') {

            if (
                message.includes('DB::table()')
            ) {
                return 'DB::table()';
            }

            const queryMatch =
                message.match(
                    /Query '([^']+)'/
                );

            if (queryMatch) {
                return `${queryMatch[1]}()`;
            }

            return 'Direct Database Access';
        }

        // =========================
        // GOD CONTROLLER
        // =========================

        if (code === 'GOD_CONTROLLER') {

            const match =
                message.match(
                    /memiliki (\d+) method/
                );

            return match
                ? `Method Count: ${match[1]} methods`
                : 'Too Many Methods';
        }

        // =========================
        // DEPENDENCY OVERLOAD
        // =========================

        if (
            code ===
            'FAT_CONTROLLER_DEPENDENCY'
        ) {

            const match =
                message.match(
                    /dependency \((\d+) layanan\)/
                );

            return match
                ? `Dependency Injection: ${match[1]} services`
                : 'Too Many Dependencies';
        }

        // =========================
        // LONG METHOD
        // =========================

        if (
            code ===
            'FAT_CONTROLLER_LENGTH'
        ) {

            const match =
                message.match(
                    /\((\d+) baris efektif\)/
                );

            return match
                ? `Method Length: ${match[1]} lines`
                : 'Long Method';
        }

        // =========================
        // FAT CONTROLLER CLASS
        // =========================

        if (
            code ===
            'FAT_CONTROLLER_CLASS'
        ) {

            const match =
                message.match(
                    /\((\d+)\s+baris\)/
                );

            return match
                ? `Class Length: ${match[1]} lines`
                : 'Large Controller Class';
        }

        // =========================
        // HIGH COMPLEXITY
        // =========================

        if (
            code ===
            'HIGH_COGNITIVE_COMPLEXITY' ||
            code ===
            'WARNING_COGNITIVE_COMPLEXITY'
        ) {

            const match =
                message.match(
                    /score:\s*(\d+)/
                );

            return match
                ? `Cognitive Complexity: ${match[1]}`
                : 'High Complexity';
        }

        return code;
    }
}