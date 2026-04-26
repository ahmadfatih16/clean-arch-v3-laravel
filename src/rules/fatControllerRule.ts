import * as vscode from 'vscode';
import { Rule, RuleViolation } from './types';

export const fatControllerRule: Rule = {
    name: 'Fat Controller & God Object',
    check(rootNode: any, document: vscode.TextDocument): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const normalizedPath = document.uri.fsPath.replace(/\\/g, '/');
        
        // Hanya jalankan analisis di dalam folder Controllers
        if (!normalizedPath.includes('app/Http/Controllers/')) return violations;

        function traverse(node: any) {
            if (node.type === 'class_declaration') {
                const classNameNode = node.childForFieldName('name');
                const className = classNameNode ? classNameNode.text : 'unknown';
                
                // 1. Faktor: Class Volume (Lines of Code)
                const classLineCount = node.endPosition.row - node.startPosition.row + 1;
                if (classLineCount > 150) {
                    violations.push({
                        node: classNameNode || node,
                        message: `[Violation : Fat Controller] Class '${className}' terlalu gemuk (${classLineCount} baris). Indikasi kuat penumpukan logika bisnis.`,
                        code: 'FAT_CONTROLLER_CLASS',
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }

                const classBody = node.children.find((c: any) => c.type === 'declaration_list');
                if (classBody) {
                    const methods = classBody.children.filter((c: any) => c.type === 'method_declaration');
                    
                    // 2. Faktor: Jumlah Method (God Object)
                    if (methods.length > 7) {
                        violations.push({
                            node: classNameNode || node,
                            message: `[Violation : Fat Controller] Class '${className}' memiliki ${methods.length} method (Batas wajar: 7). Pecah ke class lain agar lebih spesifik.`,
                            code: 'GOD_CONTROLLER',
                            severity: vscode.DiagnosticSeverity.Warning
                        });
                    }

                    for (const methodNode of methods) {
                        const methodNameNode = methodNode.childForFieldName('name');
                        const methodName = methodNameNode ? methodNameNode.text : 'unknown';

                        // 3. Faktor: Method Length
                        const lineCount = methodNode.endPosition.row - methodNode.startPosition.row + 1;
                        if (lineCount > 30) {
                            violations.push({
                                node: methodNameNode || methodNode,
                                message: `[Violation : Fat Controller] Method '${methodName}' terlalu panjang (${lineCount} baris). Controller idealnya hanya untuk routing/delegasi.`,
                                code: 'FAT_CONTROLLER_LENGTH',
                                severity: vscode.DiagnosticSeverity.Information
                            });
                        }

                        // 4. Faktor: Dependency Injection (Constructor)
                        if (methodName === '__construct') {
                            const parametersNode = methodNode.childForFieldName('parameters');
                            if (parametersNode) {
                                let paramCount = 0;
                                for (let j = 0; j < parametersNode.childCount; j++) {
                                    // Menghitung parameter formal dalam constructor
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
                return; // Stop rekursif untuk class ini
            }

            for (let i = 0; i < node.childCount; i++) {
                traverse(node.child(i));
            }
        }

        traverse(rootNode);
        return violations;
    }
};