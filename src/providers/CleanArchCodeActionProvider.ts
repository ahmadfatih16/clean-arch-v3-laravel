import * as vscode from 'vscode';

export class CleanArchCodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            // Hanya berikan solusi jika kodenya adalah DIRECT_DB_ACCESS
            if (diagnostic.code === 'DIRECT_DB_ACCESS') {
                actions.push(this.createFix(document, diagnostic));
            }
        }

        return actions;
    }

    private createFix(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const fix = new vscode.CodeAction('✨ Ekstrak ke Service Layer (Clean Architecture)', vscode.CodeActionKind.QuickFix);
        
        // Panggil command khusus untuk eksekusi refactor
        fix.command = {
            command: 'laravel-clean-arch.refactorToService',
            title: 'Refactor ke Service',
            arguments: [document, diagnostic]
        };
        
        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;
        return fix;
    }
}