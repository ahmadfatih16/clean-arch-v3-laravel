import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface CSmellConfig {
    fatController: {
        methodCount: number;
        classLength: number;
        methodLength: number;
        dependencies: number;
    };
    complexity: {
        warning: number;
        error: number;
    };
}

export class ConfigManager {

    private static readonly DEFAULT_CONFIG: CSmellConfig = {
        fatController: {
            methodCount: 7,
            classLength: 150,
            methodLength: 30,
            dependencies: 4
        },
        complexity: {
            warning: 5,
            error: 10
        }
    };

    private static getConfigPath(): string | null {

        const workspaceFolder =
            vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            return null;
        }

        return path.join(
            workspaceFolder.uri.fsPath,
            '.csmell.json'
        );
    }

    public static getConfig(): CSmellConfig {

        const configPath =
            this.getConfigPath();

        if (!configPath) {
            return this.DEFAULT_CONFIG;
        }

        if (!fs.existsSync(configPath)) {

            fs.writeFileSync(
                configPath,
                JSON.stringify(
                    this.DEFAULT_CONFIG,
                    null,
                    2
                )
            );

            return this.DEFAULT_CONFIG;
        }

        try {

            return JSON.parse(
                fs.readFileSync(
                    configPath,
                    'utf8'
                )
            );

        } catch {

            return this.DEFAULT_CONFIG;
        }
    }

    public static saveConfig(
        config: CSmellConfig
    ): void {

        const configPath =
            this.getConfigPath();

        if (!configPath) {
            return;
        }

        fs.writeFileSync(
            configPath,
            JSON.stringify(
                config,
                null,
                2
            )
        );
    }

    public static resetToDefault(): void {

        this.saveConfig(
            this.DEFAULT_CONFIG
        );

        vscode.window.showInformationMessage(
            'Configuration restored to default values.'
        );
    }

    public static async showConfigMenu(): Promise<void> {

        const action =
            await vscode.window.showQuickPick([
                'Configure Rules',
                'Reset To Default'
            ], {
                placeHolder:
                    'Select action'
            });

        if (!action) {
            return;
        }

        if (
            action ===
            'Reset To Default'
        ) {

            const confirmation =
                await vscode.window.showWarningMessage(
                    'Reset all configuration to default values?',
                    { modal: true },
                    'Reset'
                );

            if (
                confirmation ===
                'Reset'
            ) {

                this.resetToDefault();
            }

            return;
        }

        const config =
            this.getConfig();

        const selected =
            await vscode.window.showQuickPick([
                'Fat Controller - Method Count',
                'Fat Controller - Class Length',
                'Fat Controller - Method Length',
                'Fat Controller - Dependencies',
                'Complexity - Warning',
                'Complexity - Error'
            ], {
                placeHolder:
                    'Select rule'
            });

        if (!selected) {
            return;
        }

        let currentValue = 0;

        switch (selected) {

            case 'Fat Controller - Method Count':
                currentValue =
                    config.fatController.methodCount;
                break;

            case 'Fat Controller - Class Length':
                currentValue =
                    config.fatController.classLength;
                break;

            case 'Fat Controller - Method Length':
                currentValue =
                    config.fatController.methodLength;
                break;

            case 'Fat Controller - Dependencies':
                currentValue =
                    config.fatController.dependencies;
                break;

            case 'Complexity - Warning':
                currentValue =
                    config.complexity.warning;
                break;

            case 'Complexity - Error':
                currentValue =
                    config.complexity.error;
                break;
        }

        const input =
            await vscode.window.showInputBox({
                prompt:
                    `Current Value: ${currentValue}`,
                placeHolder:
                    'Enter new threshold'
            });

        if (!input) {
            return;
        }

        const newValue =
            parseInt(input);

        if (isNaN(newValue)) {

            vscode.window.showErrorMessage(
                'Threshold must be a number.'
            );

            return;
        }

        switch (selected) {

            case 'Fat Controller - Method Count':
                config.fatController.methodCount =
                    newValue;
                break;

            case 'Fat Controller - Class Length':
                config.fatController.classLength =
                    newValue;
                break;

            case 'Fat Controller - Method Length':
                config.fatController.methodLength =
                    newValue;
                break;

            case 'Fat Controller - Dependencies':
                config.fatController.dependencies =
                    newValue;
                break;

            case 'Complexity - Warning':
                config.complexity.warning =
                    newValue;
                break;

            case 'Complexity - Error':
                config.complexity.error =
                    newValue;
                break;
        }

        this.saveConfig(config);

        vscode.window.showInformationMessage(
            'Configuration updated successfully.'
        );
    }
}