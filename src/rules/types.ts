import * as vscode from 'vscode';

export interface RuleViolation {
    node: any;
    message: string;
    code: string;
    severity: vscode.DiagnosticSeverity; // Gunakan enum VS Code
}

export interface Rule {
    name: string;
    // Tambahkan document agar rule bisa cek path/folder
    check(rootNode: any, document: vscode.TextDocument): RuleViolation[];
}