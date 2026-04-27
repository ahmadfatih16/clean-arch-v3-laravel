import * as vscode from 'vscode';
import { analyzeFile } from './analyzer/analyzeFile';
import { CleanArchCodeActionProvider } from './providers/CleanArchCodeActionProvider';
import { RefactorEngine } from './engine/RefactorEngine';
// 👇 1. Pastikan kamu meng-import class Parser-mu
import { TreeSitterParser } from './parsing/TreeSitterParser'; 

// 👇 2. Tambahkan kata 'async' di depan fungsi activate
export async function activate(context: vscode.ExtensionContext) {
    
    // 👇 3. NYALAKAN MESIN PARSER DI SINI (Tunggu sampai siap)
    try {
        // 👇 Masukkan context.extensionUri ke dalam tanda kurung
        await TreeSitterParser.init(context.extensionUri); 
        console.log("✅ Tree-sitter Parser berhasil diinisialisasi!");
    } catch (error) {
        console.error("❌ Gagal memuat parser:", error);
        return; // Hentikan ekstensi jika parser gagal dimuat
    }

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('laravel-clean-arch');

    // Listener untuk dokumen
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => updateDiagnostics(doc, diagnosticCollection)),
        vscode.workspace.onDidChangeTextDocument(event => updateDiagnostics(event.document, diagnosticCollection)),
        vscode.workspace.onDidSaveTextDocument(doc => updateDiagnostics(doc, diagnosticCollection))
    );

    // Registrasi Code Action Provider (Ikon Lampu Bohlam)
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider('php', new CleanArchCodeActionProvider(), {
            providedCodeActionKinds: CleanArchCodeActionProvider.providedCodeActionKinds
        })
    );

    // Registrasi Command Eksekusi Refactor yang memanggil Engine
    context.subscriptions.push(
        vscode.commands.registerCommand('laravel-clean-arch.refactorToService', async (document: vscode.TextDocument, diagnostic: vscode.Diagnostic) => {
            await RefactorEngine.extractToService(document, diagnostic);
        })
    );
}

function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
    if (document.languageId === 'php') {
        const diagnostics = analyzeFile(document);
        collection.set(document.uri, diagnostics);
    }
}