import * as vscode from 'vscode';
import { Rule, RuleViolation } from './types';

export const fatControllerRule: Rule = {
    name: 'Fat Controller & God Object',
    check(rootNode: any, document: vscode.TextDocument): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const normalizedPath = document.uri.fsPath.replace(/\\/g, '/');
        
        if (!normalizedPath.includes('app/Http/Controllers/')) return violations;

        function traverse(node: any) {
            if (node.type === 'class_declaration') {
                const classNameNode = node.childForFieldName('name');
                const className = classNameNode ? classNameNode.text : 'unknown';
                
                // =========================
                // 1. Class Length
                // =========================
                const classLineCount = node.endPosition.row - node.startPosition.row + 1;
                if (classLineCount > 150) {
                    violations.push({
                        node: classNameNode || node,
                        message: `[Violation : Fat Controller] Class '${className}' terlalu gemuk (${classLineCount} baris). Indikasi kuat penumpukan logika bisnis (Batas wajar: 150).`,
                        code: 'FAT_CONTROLLER_CLASS',
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }

                const classBody = node.children.find((c: any) => c.type === 'declaration_list');
                if (classBody) {

                    // 🔥 Exclude constructor dari God Controller
                    const methods = classBody.children.filter((c: any) => {
                        if (c.type !== 'method_declaration') return false;
                        const name = c.childForFieldName('name')?.text;
                        return name !== '__construct';
                    });

                    // =========================
                    // 2. God Controller
                    // =========================
                    if (methods.length > 7) {
                        violations.push({
                            node: classNameNode || node,
                            message: `[Violation : Fat Controller] Class '${className}' memiliki ${methods.length} method (Batas wajar: 7). Pecah ke class lain agar lebih spesifik.`,
                            code: 'GOD_CONTROLLER',
                            severity: vscode.DiagnosticSeverity.Warning
                        });
                    }

                    // =========================
                    // 3. Method Analysis
                    // =========================
                    const allMethods = classBody.children.filter((c: any) => c.type === 'method_declaration');

                    for (const methodNode of allMethods) {
                        const methodNameNode = methodNode.childForFieldName('name');
                        const methodName = methodNameNode ? methodNameNode.text : 'unknown';

                        // 🔥 FIX: Hitung hanya BODY method
                        const bodyNode = methodNode.childForFieldName('body');

                        if (bodyNode) {
                            const text = document.getText(
                                new vscode.Range(
                                    bodyNode.startPosition.row,
                                    bodyNode.startPosition.column,
                                    bodyNode.endPosition.row,
                                    bodyNode.endPosition.column
                                )
                            );

                            // 🔥 Ignore empty line & comment
                            const lines = text.split('\n').filter(line => {
                                const trimmed = line.trim();
                                return trimmed !== '' && !trimmed.startsWith('//');
                            });

                            const lineCount = lines.length;

                            if (lineCount > 30) {
                                violations.push({
                                    node: methodNameNode || methodNode,
                                    message: `[Violation : Fat Controller] Method '${methodName}' terlalu panjang (${lineCount} baris efektif). Controller idealnya hanya untuk routing/delegasi.`,
                                    code: 'FAT_CONTROLLER_LENGTH',
                                    severity: vscode.DiagnosticSeverity.Information
                                });
                            }
                        }

                        // =========================
                        // 4. Dependency Injection
                        // =========================
                        if (methodName === '__construct') {
                            const parametersNode = methodNode.childForFieldName('parameters');
                            if (parametersNode) {
                                let paramCount = 0;
                                for (let j = 0; j < parametersNode.childCount; j++) {
                                    if (parametersNode.child(j).type.includes('parameter')) {
                                        paramCount++;
                                    }
                                }
                                
                                if (paramCount > 4) {
                                    violations.push({
                                        node: methodNameNode || methodNode,
                                        message: `[Violation : Fat Controller] Terlalu banyak dependency (${paramCount} layanan) di-inject. Indikasi class menangani terlalu banyak fitur.`,
                                        code: 'FAT_CONTROLLER_DEPENDENCY',
                                        severity: vscode.DiagnosticSeverity.Warning
                                    });
                                }
                            }
                        }
                    }
                }
                return;
            }

            for (let i = 0; i < node.childCount; i++) {
                traverse(node.child(i));
            }
        }

        traverse(rootNode);
        return violations;
    }
};