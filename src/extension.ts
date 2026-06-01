import * as vscode from 'vscode';
import { analyzeFile } from './analyzer/analyzeFile';
import { CleanArchCodeActionProvider } from './providers/CleanArchCodeActionProvider';
import { RefactorEngine } from './engine/RefactorEngine';
import { TreeSitterParser } from './parsing/TreeSitterParser';
import { SummaryManager } from './manager/SummaryManager';
import { ConfigManager } from './manager/ConfigManager';
import { IgnoreManager } from './manager/IgnoreManager';

export async function activate(
    context: vscode.ExtensionContext
) {

    try {

        await TreeSitterParser.init(
            context.extensionUri
        );

        console.log(
            '✅ Tree-sitter Parser berhasil diinisialisasi!'
        );

    } catch (error) {

        console.error(
            '❌ Gagal memuat parser:',
            error
        );

        return;
    }

    const diagnosticCollection =
        vscode.languages.createDiagnosticCollection(
            'laravel-clean-arch'
        );

    // ========================================
    // DOCUMENT LISTENERS
    // ========================================

    context.subscriptions.push(

        vscode.workspace.onDidOpenTextDocument(
            doc =>
                updateDiagnostics(
                    doc,
                    diagnosticCollection
                )
        ),

        vscode.workspace.onDidChangeTextDocument(
            event =>
                updateDiagnostics(
                    event.document,
                    diagnosticCollection
                )
        ),

        vscode.workspace.onDidSaveTextDocument(
            doc =>
                updateDiagnostics(
                    doc,
                    diagnosticCollection
                )
        )
    );

    // ========================================
    // CODE ACTION PROVIDER
    // ========================================

    context.subscriptions.push(

        vscode.languages.registerCodeActionsProvider(
            'php',
            new CleanArchCodeActionProvider(),
            {
                providedCodeActionKinds:
                    CleanArchCodeActionProvider
                        .providedCodeActionKinds
            }
        )
    );

    // ========================================
    // REFACTOR COMMAND
    // ========================================

    context.subscriptions.push(

        vscode.commands.registerCommand(
            'laravel-clean-arch.refactorToService',

            async (
                document: vscode.TextDocument,
                diagnostic: vscode.Diagnostic
            ) => {

                await RefactorEngine
                    .extractToService(
                        document,
                        diagnostic
                    );
            }
        )
    );

    // ========================================
    // SUMMARY COMMAND
    // ========================================

    context.subscriptions.push(

        vscode.commands.registerCommand(
            'laravel-clean-arch.showSummary',

            async () => {

                await SummaryManager
                    .showSummary();
            }
        )
    );

    // ========================================
    // CONFIG COMMAND
    // ========================================

    context.subscriptions.push(

        vscode.commands.registerCommand(
            'laravel-clean-arch.config',

            async () => {

                await ConfigManager
                    .showConfigMenu();
            }
        )
    );

    // ========================================
    // IGNORE VIOLATION COMMAND
    // ========================================

    context.subscriptions.push(

        vscode.commands.registerCommand(
            'laravel-clean-arch.ignoreViolation',

            async (
                document: vscode.TextDocument,
                diagnostic: vscode.Diagnostic
            ) => {

                await IgnoreManager
                    .ignoreViolation(
                        document,
                        diagnostic
                    );
            }
        )
    );

    // ========================================
    // MANAGE IGNORED VIOLATIONS COMMAND
    // ========================================

    context.subscriptions.push(

        vscode.commands.registerCommand(
            'laravel-clean-arch.manageIgnoredViolations',

            async () => {

                await IgnoreManager
                    .manageIgnoredViolations();
            }
        )
    );

    console.log(
        'Laravel Code Smell Analyzer ACTIVE'
    );
}

function updateDiagnostics(
    document: vscode.TextDocument,
    collection: vscode.DiagnosticCollection
) {

    if (
        document.languageId === 'php'
    ) {

        const diagnostics =
            analyzeFile(document);

        collection.set(
            document.uri,
            diagnostics
        );
    }
}

export function deactivate() {}