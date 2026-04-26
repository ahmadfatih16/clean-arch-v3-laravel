import * as vscode from 'vscode';
import { Rule, RuleViolation } from './types';

export const directDbAccessRule: Rule = {
    name: 'Direct DB Access',
    check(rootNode: any, document: vscode.TextDocument): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const normalizedPath = document.uri.fsPath.replace(/\\/g, '/');
        if (!normalizedPath.includes('app/Http/Controllers/')) return violations;

        const dbPenalizedLines = new Set<number>();

        function traverse(node: any) {
            if (node.type === 'scoped_call_expression' || node.type === 'member_call_expression') {
                const methodText = node.childForFieldName('name')?.text || '';
                const scopeText = node.childForFieldName('scope')?.text || node.childForFieldName('object')?.text || '';
                
                const dbPatterns = ['create', 'update', 'delete', 'where', 'find', 'findOrFail', 'save', 'all', 'table', 'get', 'first', 'pluck', 'paginate'];
                
                // 🔥 PERBAIKAN: Abaikan pemanggilan method jika berasal dari object Request
                const isRequestObject = scopeText === '$request' || scopeText === 'request()';
                
                if (!isRequestObject && (dbPatterns.includes(methodText) || scopeText === 'DB')) {
                    const line = node.startPosition.row;
                    
                    if (!dbPenalizedLines.has(line)) {
                        violations.push({
                            node: node,
                            message: `[Violation : Direct DB Access] Kueri '${methodText}' bocor di lapisan Controller. Akses data wajib dipindah ke Service/Repository.`,
                            code: 'DIRECT_DB_ACCESS',
                            severity: vscode.DiagnosticSeverity.Error
                        });
                        dbPenalizedLines.add(line);
                    }
                }
            }

            for (let i = 0; i < node.childCount; i++) traverse(node.child(i));
        }

        traverse(rootNode);
        return violations;
    }
};