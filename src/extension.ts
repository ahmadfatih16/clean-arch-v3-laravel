import * as vscode from 'vscode';
import { TreeSitterParser } from './parsing/TreeSitterParser';

// Alarm Darurat: Akan muncul tepat saat jendela Extension Development Host terbuka
vscode.window.showErrorMessage("EKSTENSI TERDETEKSI OLEH VSCODE!");

export async function activate(context: vscode.ExtensionContext) {
    console.log("🚀 Extension start");

    await TreeSitterParser.init(context.extensionUri);

    console.log("✅ Parser initialized");
}