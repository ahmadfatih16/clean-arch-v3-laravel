import * as vscode from 'vscode';

export class CleanArchCodeActionProvider implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] {

        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {

            // Refactor hanya untuk Direct DB Access
            if (diagnostic.code === 'DIRECT_DB_ACCESS') {
                actions.push(
                    this.createRefactorFix(
                        document,
                        diagnostic
                    )
                );
            }

            // Ignore tersedia untuk semua violation
            actions.push(
                this.createIgnoreFix(
                    document,
                    diagnostic
                )
            );
        }

        return actions;
    }

    private createRefactorFix(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction {

        const fix =
            new vscode.CodeAction(
                '✨ Ekstrak ke Service Layer (Clean Architecture)',
                vscode.CodeActionKind.QuickFix
            );

        fix.command = {
            command: 'laravel-clean-arch.refactorToService',
            title: 'Refactor ke Service',
            arguments: [
                document,
                diagnostic
            ]
        };

        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;

        return fix;
    }

    private createIgnoreFix(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction {

        const fix =
            new vscode.CodeAction(
                '🚫 Ignore This Violation',
                vscode.CodeActionKind.QuickFix
            );

        fix.command = {
            command: 'laravel-clean-arch.ignoreViolation',
            title: 'Ignore This Violation',
            arguments: [
                document,
                diagnostic
            ]
        };

        fix.diagnostics = [diagnostic];

        return fix;
    }
}