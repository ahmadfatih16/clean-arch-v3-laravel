import * as vscode from 'vscode';
import { TreeSitterParser } from '../parsing/TreeSitterParser';
import { fatControllerRule } from '../rules/fatControllerRule';

export function analyzeFile(document: vscode.TextDocument): vscode.Diagnostic[] {
    // 1. Parsing file menjadi AST
    const rootNode = TreeSitterParser.parse(document.getText());
    if (!rootNode) return [];

    const diagnostics: vscode.Diagnostic[] = [];
    
    // 2. Jalankan Rule (Fat Controller)
    const violations = fatControllerRule.check(rootNode, document);

    // 3. Konversi pelanggaran menjadi Diagnostic VS Code
    for (const v of violations) {
        // Tree-sitter menggunakan row/column 0-indexed, sesuai dengan VS Code
        const range = new vscode.Range(
            v.node.startPosition.row,
            v.node.startPosition.column,
            v.node.endPosition.row,
            v.node.endPosition.column
        );

        const diagnostic = new vscode.Diagnostic(
            range,
            v.message,
            v.severity
        );
        
        diagnostic.code = v.code;
        diagnostic.source = 'LaravelCleanArch';
        diagnostics.push(diagnostic);
    }

    return diagnostics;
}