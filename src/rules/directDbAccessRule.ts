import * as vscode from 'vscode';
import { Rule, RuleViolation } from './types';

export const directDbAccessRule: Rule = {
    name: 'Direct DB Access',
    check(rootNode: any, document: vscode.TextDocument): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const normalizedPath = document.uri.fsPath.replace(/\\/g, '/');
        if (!normalizedPath.includes('app/Http/Controllers/')) return violations;

        const DB_SCOPES = new Set(['DB']);

        const NON_MODEL_ROOTS = new Set([
            'response', 'request', 'redirect', 'view', 'session',
            'cache', 'auth', 'event', 'dispatch', 'abort', 'back',
            'compact', 'collect', 'config', 'app', 'resolve',
        ]);

        const modelInstanceVars = new Map<string, string>();

        // ── Helpers ───────────────────────────────────────────────────────────

        function isPascalCase(t: string): boolean {
            return /^[A-Z][a-zA-Z0-9_]*$/.test(t);
        }

        function resolveRootScope(node: any): string {
            if (!node) return '';
            switch (node.type) {
                case 'scoped_call_expression':
                    // Coba field 'scope', fallback ke anak pertama bertipe 'name'
                    return (
                        node.childForFieldName('scope')?.text ??
                        [...Array(node.childCount)]
                            .map((_, i) => node.child(i))
                            .find((c: any) => c.type === 'name')?.text ??
                        ''
                    );
                case 'member_call_expression':
                    return resolveRootScope(node.childForFieldName('object'));
                case 'variable_name':
                    return node.text ?? '';
                case 'function_call_expression':
                    return `__fn:${node.childForFieldName('function')?.text ?? ''}`;
                case 'name':
                    return node.text ?? '';
                default:
                    return node.text ?? '';
            }
        }

        function isEloquentRoot(root: string): boolean {
            if (!root) return false;
            if (root.startsWith('__fn:')) return !NON_MODEL_ROOTS.has(root.slice(5));
            if (DB_SCOPES.has(root)) return true;
            if (root.startsWith('$')) return modelInstanceVars.has(root);
            if (NON_MODEL_ROOTS.has(root)) return false;
            return isPascalCase(root);
        }

        // ── Pass 1 ────────────────────────────────────────────────────────────

        function collectModelInstances(node: any) {
            if (node.type === 'assignment_expression') {
                const leftNode  = node.childForFieldName('left');
                const rightNode = node.childForFieldName('right');

                if (leftNode?.type === 'variable_name' && rightNode) {
                    const varName = leftNode.text;

                    // Pola A: $var = new ModelName(...)
                    // Pakai regex pada .text karena field 'class_name' tidak konsisten
                    // di semua versi tree-sitter-php
                    const newMatch = rightNode.text?.match(/^new\s+\\?([A-Z][a-zA-Z0-9_\\]*)/);
                    if (newMatch) {
                        const className = newMatch[1].split('\\').pop()!;
                        modelInstanceVars.set(varName, className);
                    }
                    // Pola B: $var = Model::method() atau chain Eloquent
                    else if (
                        rightNode.type === 'scoped_call_expression' ||
                        rightNode.type === 'member_call_expression'
                    ) {
                        const root = resolveRootScope(rightNode);
                        if (isEloquentRoot(root)) {
                            modelInstanceVars.set(varName, modelInstanceVars.get(root) ?? root);
                        }
                    }
                }
            }
            for (let i = 0; i < node.childCount; i++) collectModelInstances(node.child(i));
        }

        // ── Pass 2 ────────────────────────────────────────────────────────────

        function getObjectRange(node: any): { start: number; end: number } | null {
            if (node.type !== 'member_call_expression') return null;
            const obj = node.childForFieldName('object');
            return obj ? { start: obj.startIndex, end: obj.endIndex } : null;
        }

        function traverse(
            node: any,
            parentObjRange: { start: number; end: number } | null = null
        ) {
            const isCallNode =
                node.type === 'scoped_call_expression' ||
                node.type === 'member_call_expression';

            if (isCallNode) {
                const isChainObject =
                    parentObjRange !== null &&
                    node.startIndex === parentObjRange.start &&
                    node.endIndex   === parentObjRange.end;

                if (!isChainObject) {
                    const root = resolveRootScope(node);

                    if (isEloquentRoot(root)) {
                        const originModel = modelInstanceVars.get(root);
                        const scopeLabel  = originModel
                            ? `${root} (instance of ${originModel})`
                            : root;
                        const methodText  = node.childForFieldName('name')?.text ?? '';

                        violations.push({
                            node: node.childForFieldName('name') ?? node,
                            message:
                                `[Violation : Direct DB Access] Kueri '${methodText}' pada ` +
                                `'${scopeLabel}' bocor di lapisan Controller. ` +
                                `Akses data wajib dipindah ke Service/Repository.`,
                            code: 'DIRECT_DB_ACCESS',
                            severity: vscode.DiagnosticSeverity.Error,
                        });
                    }
                }
            }

            const objRange = getObjectRange(node);
            for (let i = 0; i < node.childCount; i++) {
                traverse(node.child(i), objRange);
            }
        }

        collectModelInstances(rootNode);
        traverse(rootNode);
        return violations;
    },
};