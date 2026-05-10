import * as vscode from 'vscode';
import { Rule, RuleViolation } from './types';

export const complexityRule: Rule = {
    name: 'Cognitive Complexity',

    check(rootNode: any, document: vscode.TextDocument): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const normalizedPath = document.uri.fsPath.replace(/\\/g, '/');

        if (!normalizedPath.includes('app/Http/Controllers/')) return violations;

        function traverse(node: any) {

            if (node.type === 'method_declaration') {

                const methodNameNode = node.childForFieldName('name');
                const methodName = methodNameNode
                    ? methodNameNode.text
                    : 'unknown';

                let cognitiveScore = 0;

                function calculate(childNode: any, depth: number) {

                    if (
                        childNode.type === 'anonymous_function_creation_expression' ||
                        childNode.type === 'arrow_function'
                    ) {
                        return;
                    }

                    let nextDepth = depth;

                    // =========================
                    // TERNARY
                    // =========================
                    if (
                        childNode.type === 'conditional_expression' ||
                        childNode.type === 'ternary_expression'
                    ) {

                        cognitiveScore += 2 + depth;

                        const forcedDepth = depth + 1;

                        for (let i = 0; i < childNode.childCount; i++) {
                            calculate(childNode.child(i), forcedDepth);
                        }

                        return;
                    }

                    // =========================
                    // IF
                    // =========================
                    if (childNode.type === 'if_statement') {

                        const parent = childNode.parent;
                        const isElseIf = parent?.type === 'else_clause';

                        if (!isElseIf) {
                            cognitiveScore += 1 + depth;
                            nextDepth = depth + 1;
                        } else {
                            cognitiveScore += 1;
                        }
                    }

                    // =========================
                    // LOOP & CONTROL STRUCTURE
                    // =========================
                    const weights: Record<string, number> = {
                        'foreach_statement': 2,
                        'for_statement': 2,
                        'while_statement': 2,
                        'switch_statement': 1,
                        'try_statement': 1
                    };

                    if (weights[childNode.type]) {
                        cognitiveScore += weights[childNode.type] + depth;
                        nextDepth = depth + 1;
                    }

                    // =========================
                    // LOGICAL OPERATOR
                    // =========================
                    if (childNode.type === 'binary_expression') {

                        const ops =
                            (childNode.text.match(/&&|\|\|/g) || []).length;

                        cognitiveScore += ops;
                    }

                    for (let i = 0; i < childNode.childCount; i++) {
                        calculate(childNode.child(i), nextDepth);
                    }
                }

                calculate(node, 0);

                // =========================
                // HIGH COMPLEXITY
                // =========================
                if (cognitiveScore > 10) {

                    violations.push({
                        node: methodNameNode || node,
                        message:
                            `[Violation : High Complexity] Method '${methodName}' ` +
                            `memiliki kompleksitas tinggi (score: ${cognitiveScore}). ` +
                            `Saran: Ekstrak bagian logika yang memiliki ` +
                            `kalang (loop) bersarang ke dalam private method ` +
                            `secara terpisah, atau gunakan teknik 'early return' ` +
                            `untuk mengurangi tingkat kedalaman (nesting) kode.`,
                        code: 'HIGH_COGNITIVE_COMPLEXITY',
                        severity: vscode.DiagnosticSeverity.Error
                    });

                // =========================
                // WARNING COMPLEXITY
                // =========================
                } else if (cognitiveScore > 5) {

                    violations.push({
                        node: methodNameNode || node,
                        message:
                            `[Violation : High Complexity] Method '${methodName}' ` +
                            `mulai sulit dipahami (score: ${cognitiveScore}). ` +
                            `Saran: Sederhanakan percabangan dan hindari terlalu banyak ` +
                            `kondisi bersarang agar alur logika method lebih mudah ` +
                            `dipahami dan dipelihara.`,
                        code: 'WARNING_COGNITIVE_COMPLEXITY',
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }
            }

            for (let i = 0; i < node.childCount; i++) {
                traverse(node.child(i));
            }
        }

        traverse(rootNode);

        return violations;
    }
};