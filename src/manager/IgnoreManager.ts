import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface IgnoredViolation {
    file: string;
    rule: string;
    line: number;
}

interface IgnoreConfig {
    ignored: IgnoredViolation[];
}

export class IgnoreManager {

    private static getIgnoreFilePath(): string | null {

        const workspaceFolder =
            vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            return null;
        }

        return path.join(
            workspaceFolder.uri.fsPath,
            '.csmell-ignore.json'
        );
    }

    public static getIgnoredViolations(): IgnoreConfig {

        const filePath =
            this.getIgnoreFilePath();

        if (!filePath) {
            return { ignored: [] };
        }

        if (!fs.existsSync(filePath)) {

            const defaultData = {
                ignored: []
            };

            fs.writeFileSync(
                filePath,
                JSON.stringify(
                    defaultData,
                    null,
                    2
                )
            );

            return defaultData;
        }

        try {

            return JSON.parse(
                fs.readFileSync(
                    filePath,
                    'utf8'
                )
            );

        } catch {

            return {
                ignored: []
            };
        }
    }

    public static saveIgnoredViolations(
        config: IgnoreConfig
    ): void {

        const filePath =
            this.getIgnoreFilePath();

        if (!filePath) {
            return;
        }

        fs.writeFileSync(
            filePath,
            JSON.stringify(
                config,
                null,
                2
            )
        );
    }

    public static async ignoreViolation(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): Promise<void> {

        const config =
            this.getIgnoredViolations();

        const relativePath =
            vscode.workspace.asRelativePath(
                document.uri
            );

        config.ignored.push({
            file: relativePath,
            rule: diagnostic.code?.toString() ?? '',
            line: diagnostic.range.start.line
        });

        this.saveIgnoredViolations(
            config
        );

        vscode.window.showInformationMessage(
            'Violation ignored.'
        );
    }

    public static isIgnored(
        file: string,
        rule: string,
        line: number
    ): boolean {

        const config =
            this.getIgnoredViolations();

        return config.ignored.some(
            item =>
                item.file === file &&
                item.rule === rule &&
                item.line === line
        );
    }

    public static async manageIgnoredViolations(): Promise<void> {

        const config =
            this.getIgnoredViolations();

        if (
            config.ignored.length === 0
        ) {

            vscode.window.showInformationMessage(
                'No ignored violations.'
            );

            return;
        }

        const selected =
            await vscode.window.showQuickPick(

                config.ignored.map(item => ({
                    label:
                        item.rule,

                    description:
                        `${item.file}:${item.line + 1}`,

                    item
                }))
            );

        if (!selected) {
            return;
        }

        config.ignored =
            config.ignored.filter(

                v =>
                    !(
                        v.file ===
                            selected.item.file &&
                        v.rule ===
                            selected.item.rule &&
                        v.line ===
                            selected.item.line
                    )
            );

        this.saveIgnoredViolations(
            config
        );

        vscode.window.showInformationMessage(
            'Ignore removed.'
        );
    }
}