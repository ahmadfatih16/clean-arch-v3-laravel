import * as vscode from 'vscode';
import * as path from 'path';

export class RefactorEngine {
    public static async extractToService(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        const edit = new vscode.WorkspaceEdit();
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

        if (!workspaceFolder) {
            vscode.window.showErrorMessage("Workspace tidak ditemukan.");
            return;
        }

        const controllerFileName = path.basename(document.uri.fsPath, '.php');
        const baseName = controllerFileName.replace('Controller', '');

        const badLine = document.lineAt(diagnostic.range.start.line);
        const fullRange = badLine.range;
        const badCode = document.getText(fullRange);

        // DETEKSI MODEL
        const modelMatch = badCode.match(/([A-Z][a-zA-Z0-9_]*)::/);
        const modelName = modelMatch ? modelMatch[1] : baseName;

        const serviceName = `${modelName}Service`;
        const serviceVariableName =
            modelName.charAt(0).toLowerCase() + modelName.slice(1) + 'Service';

        const serviceFilePath = vscode.Uri.file(
            path.join(workspaceFolder.uri.fsPath, 'app', 'Services', `${serviceName}.php`)
        );

        const { methodName, paramName, paramValue, serviceBody } =
            this.transformToServiceMethod(badCode, modelName);

        // ======================
        // CREATE / READ SERVICE
        // ======================
        let serviceContent = '';

        try {
            const existing = await vscode.workspace.fs.readFile(serviceFilePath);
            serviceContent = Buffer.from(existing).toString('utf8');

            if (
                serviceContent.trim() === '' ||
                !serviceContent.includes('class') ||
                !serviceContent.includes(serviceName)
            ) {
                serviceContent = this.generateBaseService(modelName, serviceName);
            }

        } catch {
            edit.createFile(serviceFilePath, { ignoreIfExists: true });
            serviceContent = this.generateBaseService(modelName, serviceName);
        }

        // ======================
        // ADD METHOD (FIX FINAL)
        // ======================
        if (!serviceContent.includes(`function ${methodName}`)) {

            const methodCode = `
    public function ${methodName}(${paramName})
    {
        ${serviceBody}
    }
`;

            const lastClosingBraceIndex = serviceContent.lastIndexOf('}');

            if (lastClosingBraceIndex === -1) {
                serviceContent = this.generateBaseService(modelName, serviceName);
            }

            const before = serviceContent.substring(0, lastClosingBraceIndex);
            const after = serviceContent.substring(lastClosingBraceIndex);

            const updatedContent = before + methodCode + after;

            const fullDocRange = new vscode.Range(
                new vscode.Position(0, 0),
                new vscode.Position(serviceContent.split('\n').length + 1, 0)
            );

            edit.replace(serviceFilePath, fullDocRange, updatedContent);
        }

        // ======================
        // CONTROLLER REPLACE (INDENT FIX)
        // ======================
        const indentation = badLine.text.match(/^\s*/)?.[0] || '';

        const controllerCall =
            `${indentation}return $this->${serviceVariableName}->${methodName}(${paramValue});`;

        edit.replace(document.uri, fullRange, controllerCall);

        // ======================
        // INSERT USE SERVICE
        // ======================
        const text = document.getText();
        const useStatement = `use App\\Services\\${serviceName};`;

        if (!text.includes(useStatement)) {
            const useMatches = [...text.matchAll(/^use\s.+;/gm)];

            let insertPos: vscode.Position;

            if (useMatches.length > 0) {
                const lastUse = useMatches[useMatches.length - 1];
                insertPos = document.positionAt(lastUse.index! + lastUse[0].length);
                edit.insert(document.uri, insertPos, `\n${useStatement}`);
            } else {
                const namespaceMatch = text.match(/^namespace\s.+;/m);
                if (namespaceMatch) {
                    insertPos = document.positionAt(
                        namespaceMatch.index! + namespaceMatch[0].length
                    );
                    edit.insert(document.uri, insertPos, `\n\n${useStatement}`);
                }
            }
        }

        // ======================
        // INJECT SERVICE
        // ======================
        await this.injectService(document, edit, serviceName, serviceVariableName);

        // ======================
        // APPLY
        // ======================
        const success = await vscode.workspace.applyEdit(edit);

        if (success) {
            vscode.window.showInformationMessage(
                `✅ Refactored to ${serviceName}.${methodName}()`
            );

            const doc = await vscode.workspace.openTextDocument(serviceFilePath);
            vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
        } else {
            vscode.window.showErrorMessage("Refactor gagal.");
        }
    }

    // ======================
    // BASE SERVICE TEMPLATE
    // ======================
    private static generateBaseService(model: string, service: string) {
        return `<?php

namespace App\\Services;

use App\\Models\\${model};

class ${service}
{
}
`;
    }

    // ======================
    // TRANSFORM LOGIC
    // ======================
    private static transformToServiceMethod(code: string, model: string) {
        const hasRequest = code.includes('$request');

        if (code.includes('create')) {
            return {
                methodName: `create${model}`,
                paramName: '$data',
                paramValue: hasRequest ? '$request->all()' : '',
                serviceBody: `return ${model}::create($data);`
            };
        }

        if (code.includes('where') && code.includes('get')) {
            return {
                methodName: `get${model}WithFilter`,
                paramName: '',
                paramValue: '',
                serviceBody: `return ${model}::query()->get();`
            };
        }

        if (code.includes('update')) {
            return {
                methodName: `update${model}`,
                paramName: '$id, $data',
                paramValue: hasRequest ? '$id, $request->all()' : '$id',
                serviceBody: `
$model = ${model}::findOrFail($id);
return $model->update($data);`
            };
        }

        if (code.includes('delete')) {
            return {
                methodName: `delete${model}`,
                paramName: '$id',
                paramValue: '$id',
                serviceBody: `
$model = ${model}::findOrFail($id);
return $model->delete();`
            };
        }

        if (code.includes('find')) {
            return {
                methodName: `find${model}`,
                paramName: '$id',
                paramValue: '$id',
                serviceBody: `return ${model}::findOrFail($id);`
            };
        }

        if (code.includes('all') || code.includes('get')) {
            return {
                methodName: `get${model}`,
                paramName: '',
                paramValue: '',
                serviceBody: `return ${model}::all();`
            };
        }

        return {
            methodName: `handle${model}`,
            paramName: '',
            paramValue: '',
            serviceBody: `// TODO manual`
        };
    }

    // ======================
    // INJECT SERVICE
    // ======================
    private static async injectService(
        document: vscode.TextDocument,
        edit: vscode.WorkspaceEdit,
        serviceName: string,
        variableName: string
    ) {
        const text = document.getText();

        if (text.includes(serviceName)) return;

        const constructorRegex = /__construct\s*\((.*?)\)/s;

        if (constructorRegex.test(text)) {
            const match = text.match(constructorRegex);
            if (!match) return;

            const newConstructor = match[0].replace(
                '(',
                `(${serviceName} $${variableName}, `
            );

            const start = document.positionAt(match.index!);
            const end = document.positionAt(match.index! + match[0].length);

            edit.replace(document.uri, new vscode.Range(start, end), newConstructor);
        } else {
            const classIndex = text.indexOf('{') + 1;

            const constructorCode = `
    protected $${variableName};

    public function __construct(${serviceName} $${variableName})
    {
        $this->${variableName} = $${variableName};
    }
`;

            edit.insert(document.uri, document.positionAt(classIndex), constructorCode);
        }
    }
}