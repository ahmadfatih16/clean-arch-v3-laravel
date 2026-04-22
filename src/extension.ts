import * as vscode from 'vscode';
import { TreeSitterParser } from './parsing/TreeSitterParser';
import { analyzeFile } from './analyzer/analyzeFile';

export async function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Laravel Clean Architecture Refactor is now active!');

    // 1. Inisialisasi Mesin Parser
    await TreeSitterParser.init(context.extensionUri);

    // 2. Buat Koleksi Diagnostic (untuk menampung garis bawah error/warning)
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('laravel-clean-arch');

    // Fungsi pembantu untuk memicu analisis
    const doAnalyze = (document: vscode.TextDocument) => {
        if (document.languageId === 'php') {
            const diagnostics = analyzeFile(document);
            diagnosticCollection.set(document.uri, diagnostics);
        }
    };

    // 3. Event Listeners: Jalankan analisis otomatis
    context.subscriptions.push(
        // Saat file dibuka
        vscode.workspace.onDidOpenTextDocument(doc => doAnalyze(doc)),
        // Saat file disimpan
        vscode.workspace.onDidSaveTextDocument(doc => doAnalyze(doc)),
        // (Opsional) Saat sedang mengetik (real-time)
        vscode.workspace.onDidChangeTextDocument(e => doAnalyze(e.document))
    );

    // Jalankan analisis untuk file yang sudah terbuka saat extension baru nyala
    if (vscode.window.activeTextEditor) {
        doAnalyze(vscode.window.activeTextEditor.document);
    }
}

export function deactivate() {}