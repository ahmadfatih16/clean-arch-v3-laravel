import * as vscode from 'vscode';
import * as path from 'path';
import { Rule, RuleViolation } from './types';

export const fatControllerRule: Rule = {
    name: 'Fat Controller & God Object Analyzer',
    check(rootNode: any, document: vscode.TextDocument): RuleViolation[] {
        const violations: RuleViolation[] = [];
        
        // Normalize path OS
        const normalizedPath = document.uri.fsPath.replace(/\\/g, '/');
        if (!normalizedPath.includes('app/Http/Controllers/')) {
            return violations;
        }

        function traverse(node: any) {
            // Evaluasi dari level Class
            if (node.type === 'class_declaration') {
                const classNameNode = node.childForFieldName('name');
                const className = classNameNode ? classNameNode.text : 'unknown';
                
                // Safe service name generation
                const baseName = className.endsWith('Controller') 
                    ? className.slice(0, -10) 
                    : className;
                const suggestedServiceName = baseName + 'Service';
                
                let methodCount = 0;
                let highComplexityMethodCount = 0;

                const classBody = node.children.find((c: any) => c.type === 'declaration_list');
                if (classBody) {
                    const methods = classBody.children.filter((c: any) => c.type === 'method_declaration');
                    methodCount = methods.length;

                    for (const methodNode of methods) {
                        const methodNameNode = methodNode.childForFieldName('name');
                        const methodName = methodNameNode ? methodNameNode.text : 'unknown';
                        
                        let cognitiveScore = 0;
                        const dbPenalizedLines = new Set<number>(); 

                        function calculateComplexity(childNode: any, currentDepth: number) {
                            // Abaikan closure/arrow function
                            if (childNode.type === 'anonymous_function_creation_expression' || childNode.type === 'arrow_function') {
                                return;
                            }

                            let nextDepth = currentDepth;

                            // Bobot control flow
                            const logicWeights: Record<string, number> = {
                                'if_statement': 1, 'switch_statement': 1, 'try_statement': 1,
                                'foreach_statement': 2, 'for_statement': 2, 'while_statement': 2
                            };

                            if (logicWeights[childNode.type] !== undefined) {
                                cognitiveScore += logicWeights[childNode.type] + currentDepth;
                                nextDepth++;
                            }

                            // Bobot assignment
                            if (childNode.type === 'assignment_expression') {
                                cognitiveScore += 1;
                            }

                            // Deteksi akses DB / Eloquent
                            if (childNode.type === 'scoped_call_expression' || childNode.type === 'member_call_expression') {
                                const methodText = childNode.childForFieldName('name')?.text || '';
                                const scopeText = childNode.childForFieldName('scope')?.text || childNode.childForFieldName('object')?.text || '';
                                
                                const dbPatterns = ['create', 'update', 'delete', 'where', 'find', 'findOrFail', 'save', 'all', 'table', 'get', 'first', 'pluck', 'paginate'];
                                
                                if (dbPatterns.includes(methodText) || scopeText === 'DB') {
                                    const line = childNode.startPosition.row;
                                    // Cegah double count penalti di baris yang sama (chaining)
                                    if (!dbPenalizedLines.has(line)) {
                                        cognitiveScore += 3;
                                        dbPenalizedLines.add(line);
                                    }
                                }
                            }

                            for (let i = 0; i < childNode.childCount; i++) {
                                calculateComplexity(childNode.child(i), nextDepth);
                            }
                        }

                        calculateComplexity(methodNode, 0);

                        // Evaluasi skor per method
                        if (cognitiveScore > 10) {
                            highComplexityMethodCount++;
                            violations.push({
                                node: methodNameNode || methodNode,
                                message: `[Fat Method] '${methodName}' melanggar batas kompleksitas (Skor: ${cognitiveScore}). Terdapat akses DB langsung atau logika berat.\n💡 Solusi: Ekstrak logika ini ke ${suggestedServiceName}.`,
                                code: 'HIGH_COGNITIVE_COMPLEXITY',
                                severity: vscode.DiagnosticSeverity.Error
                            });
                        } else if (cognitiveScore > 5) {
                            violations.push({
                                node: methodNameNode || methodNode,
                                message: `[Fat Method] '${methodName}' mulai kompleks (Skor: ${cognitiveScore}).\n💡 Pertimbangkan refactor ke ${suggestedServiceName}.`,
                                code: 'WARNING_COGNITIVE_COMPLEXITY',
                                severity: vscode.DiagnosticSeverity.Warning
                            });
                        }

                        // Evaluasi panjang method
                        const lineCount = methodNode.endPosition.row - methodNode.startPosition.row + 1;
                        if (lineCount > 40) {
                            violations.push({
                                node: methodNameNode || methodNode,
                                message: `[Fat Method] '${methodName}' kepanjangan (${lineCount} baris). Idealnya Controller hanya berisi delegasi request.`,
                                code: 'FAT_CONTROLLER_LENGTH',
                                severity: vscode.DiagnosticSeverity.Information
                            });
                        }
                    }
                }

                // Evaluasi God Object di level Class
                if (methodCount > 7 && highComplexityMethodCount >= 2) {
                    violations.push({
                        node: classNameNode || node,
                        message: `[Critical God Object] Controller '${className}' sangat berantakan! (${methodCount} method, ${highComplexityMethodCount} berlogika berat).\n💡 Solusi: Pecah menjadi Invokable Controller atau pindahkan core logic ke Service Layer.`,
                        code: 'CRITICAL_FAT_CONTROLLER',
                        severity: vscode.DiagnosticSeverity.Error
                    });
                } else if (methodCount > 7) {
                    violations.push({
                        node: classNameNode || node,
                        message: `[God Object] Controller '${className}' memiliki ${methodCount} method (Batas rekomendasi resource Laravel: 7).`,
                        code: 'GOD_CONTROLLER',
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }

                return; // Stop iterasi masuk ke dalam class agar lebih performant
            }

            for (let i = 0; i < node.childCount; i++) {
                traverse(node.child(i));
            }
        }

        traverse(rootNode);
        return violations;
    }
};