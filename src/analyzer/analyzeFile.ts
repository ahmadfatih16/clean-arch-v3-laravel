import * as vscode from 'vscode';
import { TreeSitterParser } from '../parsing/TreeSitterParser';
import { fatControllerRule } from '../rules/fatControllerRule';
import { complexityRule } from '../rules/complexityRule';
import { directDbAccessRule } from '../rules/directDbAccessRule';

export function analyzeFile(document: vscode.TextDocument): vscode.Diagnostic[] {
    const rootNode = TreeSitterParser.parse(document.getText());
    if (!rootNode) return [];

    const diagnostics: vscode.Diagnostic[] = [];
    
    // Daftarkan semua rule yang aktif
    const rules = [
        fatControllerRule,
        complexityRule,
        directDbAccessRule
    ];

    // Jalankan setiap rule secara independen
    let violations: any[] = [];
    for (const rule of rules) {
        violations = [...violations, ...rule.check(rootNode, document)];
    }

    // Translasi hasil ke format visual VS Code
    for (const v of violations) {
        const range = new vscode.Range(
            v.node.startPosition.row, v.node.startPosition.column,
            v.node.endPosition.row, v.node.endPosition.column
        );

        const diagnostic = new vscode.Diagnostic(range, v.message, v.severity);
        diagnostic.code = v.code;
        diagnostic.source = 'LaravelCleanArch';
        diagnostics.push(diagnostic);
    }

    return diagnostics;
}