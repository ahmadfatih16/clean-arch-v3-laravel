import * as vscode from 'vscode';
import { analyzeFile } from './analyzer/analyzeFile';
import { CleanArchCodeActionProvider } from './providers/CleanArchCodeActionProvider';
import { RefactorEngine } from './engine/RefactorEngine';
import { TreeSitterParser } from './parsing/TreeSitterParser';
import { SummaryManager } from './manager/SummaryManager';

export async function activate(context: vscode.ExtensionContext) {

    try {
        await TreeSitterParser.init(context.extensionUri);
        console.log("✅ Tree-sitter Parser berhasil diinisialisasi!");
    } catch (error) {
        console.error("❌ Gagal memuat parser:", error);
        return;
    }

    const diagnosticCollection =
        vscode.languages.createDiagnosticCollection(
            'laravel-clean-arch'
        );

    // Listener untuk dokumen
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc =>
            updateDiagnostics(doc, diagnosticCollection)
        ),

        vscode.workspace.onDidChangeTextDocument(event =>
            updateDiagnostics(
                event.document,
                diagnosticCollection
            )
        ),

        vscode.workspace.onDidSaveTextDocument(doc =>
            updateDiagnostics(
                doc,
                diagnosticCollection
            )
        )
    );

    // Code Action Provider
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

    // Refactor Command
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'laravel-clean-arch.refactorToService',
            async (
                document: vscode.TextDocument,
                diagnostic: vscode.Diagnostic
            ) => {
                await RefactorEngine.extractToService(
                    document,
                    diagnostic
                );
            }
        )
    );

    // Summary Command
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'laravel-clean-arch.showSummary',
            async () => {
                await SummaryManager.showSummary();
            }
        )
    );

    console.log("Laravel Code Smell Analyzer ACTIVE");
}

function updateDiagnostics(
    document: vscode.TextDocument,
    collection: vscode.DiagnosticCollection
) {
    if (document.languageId === 'php') {
        const diagnostics = analyzeFile(document);
        collection.set(document.uri, diagnostics);
    }
}