import * as vscode from 'vscode';
import { Rule, RuleViolation } from './types';

export const fatControllerRule: Rule = {
    name: 'Fat Controller & God Object',
    check(rootNode: any, document: vscode.TextDocument): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const normalizedPath = document.uri.fsPath.replace(/\\/g, '/');
        if (!normalizedPath.includes('app/Http/Controllers/')) return violations;

        function traverse(node: any) {
            // Evaluasi Class Level (God Object)
            if (node.type === 'class_declaration') {
                const classNameNode = node.childForFieldName('name');
                const className = classNameNode ? classNameNode.text : 'unknown';
                
                const classBody = node.children.find((c: any) => c.type === 'declaration_list');
                if (classBody) {
                    const methods = classBody.children.filter((c: any) => c.type === 'method_declaration');
                    
                    // Deteksi God Controller
                    if (methods.length > 7) {
                        violations.push({
                            node: classNameNode || node,
                            message: `[God Object] Controller '${className}' memiliki terlalu banyak tanggung jawab (${methods.length} method). Batas rekomendasi adalah 7.`,
                            code: 'GOD_CONTROLLER',
                            severity: vscode.DiagnosticSeverity.Warning
                        });
                    }

                    // Deteksi Panjang Method
                    for (const methodNode of methods) {
                        const lineCount = methodNode.endPosition.row - methodNode.startPosition.row + 1;
                        if (lineCount > 40) {
                            const methodNameNode = methodNode.childForFieldName('name');
                            violations.push({
                                node: methodNameNode || methodNode,
                                message: `[Fat Method] Method kepanjangan (${lineCount} baris). Idealnya Controller hanya berisi pendelegasian request.`,
                                code: 'FAT_CONTROLLER_LENGTH',
                                severity: vscode.DiagnosticSeverity.Information
                            });
                        }
                    }
                }
                return; // Stop rekursif, tanggung jawab selesai
            }

            for (let i = 0; i < node.childCount; i++) traverse(node.child(i));
        }

        traverse(rootNode);
        return violations;
    }
};