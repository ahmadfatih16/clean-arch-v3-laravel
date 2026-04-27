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

        // 1. Kalkulasi Nama Berdasarkan Standar Naming Convention
        // Contoh: UserController.php -> User -> UserService
        const controllerFileName = path.basename(document.uri.fsPath, '.php');
        const baseName = controllerFileName.replace('Controller', '');
        const serviceName = `${baseName}Service`;
        const serviceVariableName = baseName.toLowerCase() + 'Service'; // $userService

        // 2. Kalkulasi Path Tujuan
        const serviceFolderPath = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, 'app', 'Services'));
        const serviceFilePath = vscode.Uri.file(path.join(serviceFolderPath.fsPath, `${serviceName}.php`));

        // 3. Eksekusi Pembuatan File Service (Jika belum ada)
        try {
            // Cek apakah file sudah ada
            await vscode.workspace.fs.stat(serviceFilePath);
        } catch {
            // Jika masuk catch, berarti file belum ada, maka kita buat
            edit.createFile(serviceFilePath, { ignoreIfExists: true });
            
            // Generate Template Boilerplate Clean Architecture
            const serviceTemplate = `<?php\n\nnamespace App\\Services;\n\nclass ${serviceName}\n{\n    public function handleDatabaseOperation()\n    {\n        // TODO: Implementasi logika basis data dipindahkan ke sini\n        // Ingat: Lapisan ini yang berhak mengakses Model/Repository\n    }\n}\n`;
            
            edit.insert(serviceFilePath, new vscode.Position(0, 0), serviceTemplate);
        }

        // 4. Manipulasi Teks di Controller (Timpa kode pelanggaran)
        const badCode = document.getText(diagnostic.range);
        
        // Ganti kode DB murni dengan pemanggilan metode dari Service
        const refactoredCall = `$this->${serviceVariableName}->handleDatabaseOperation(); /* Auto-Refactored from: ${badCode} */`;
        
        edit.replace(document.uri, diagnostic.range, refactoredCall);

        // 5. Aplikasikan Semua Modifikasi secara Atomik (All-in-One)
        const success = await vscode.workspace.applyEdit(edit);

        if (success) {
            // Beri notifikasi (toast message) sesuai skenario pengujian di skripsimu
            vscode.window.showInformationMessage(`✅ [Auto-Refactor] Logika diekstrak ke ${serviceName}.`);
            
            // Buka file Service berdampingan dengan Controller agar user bisa melanjutkannya
            const doc = await vscode.workspace.openTextDocument(serviceFilePath);
            vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
        } else {
            vscode.window.showErrorMessage("Gagal melakukan Auto-Refactor.");
        }
    }
}