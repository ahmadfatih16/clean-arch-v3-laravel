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
                const methodName = methodNameNode ? methodNameNode.text : 'unknown';
                let cognitiveScore = 0;

                function calculateComplexity(childNode: any, currentDepth: number) {
                    if (childNode.type === 'anonymous_function_creation_expression' || childNode.type === 'arrow_function') return;

                    let nextDepth = currentDepth;
                    const logicWeights: Record<string, number> = {
                        'if_statement': 1, 'switch_statement': 1, 'try_statement': 1,
                        'foreach_statement': 2, 'for_statement': 2, 'while_statement': 2
                    };

                    // Hanya berikan skor pada Control Flow (Logika bersarang)
                    if (logicWeights[childNode.type] !== undefined) {
                        cognitiveScore += logicWeights[childNode.type] + currentDepth;
                        nextDepth++;
                    }

                    for (let i = 0; i < childNode.childCount; i++) {
                        calculateComplexity(childNode.child(i), nextDepth);
                    }
                }

                calculateComplexity(node, 0);

                if (cognitiveScore > 10) {
                    violations.push({
                        node: methodNameNode || node,
                        message: `[Kompleksitas] Method '${methodName}' sangat rumit (Skor Kognitif: ${cognitiveScore}). Pindahkan logika bisnis ini ke Service Layer.`,
                        code: 'HIGH_COGNITIVE_COMPLEXITY',
                        severity: vscode.DiagnosticSeverity.Error
                    });
                } else if (cognitiveScore > 5) {
                    violations.push({
                        node: methodNameNode || node,
                        message: `[Kompleksitas] Method '${methodName}' mulai rumit (Skor: ${cognitiveScore}).`,
                        code: 'WARNING_COGNITIVE_COMPLEXITY',
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }
            }

            for (let i = 0; i < node.childCount; i++) traverse(node.child(i));
        }

        traverse(rootNode);
        return violations;
    }
};