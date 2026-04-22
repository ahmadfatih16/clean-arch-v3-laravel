import * as vscode from 'vscode';
import * as path from 'path';

// Menggunakan eval('require') untuk menghindari kendala bundling di VS Code
const ParserModule = eval('require')('web-tree-sitter');

export class TreeSitterParser {
    private static parser: any;
    public static isInitialized = false;

    public static async init(extensionUri: vscode.Uri) {
        if (this.isInitialized) return;

        try {
            console.log("⏳ [1/5] Resolving Parser module...");
            let Parser: any = null;
            if (ParserModule.Parser && typeof ParserModule.Parser.init === 'function') {
                Parser = ParserModule.Parser;
            } else if (ParserModule.default && typeof ParserModule.default.init === 'function') {
                Parser = ParserModule.default;
            } else {
                Parser = ParserModule;
            }

            console.log("⏳ [2/5] Initializing Tree-sitter runtime (WASM)...");

            /**
             * PERBAIKAN KRUSIAL:
             * Kita arahkan locateFile untuk mengambil 'web-tree-sitter.wasm' 
             * dari folder dist, apa pun nama file yang diminta runtime.
             */
            const engineWasmPath = path.join(extensionUri.fsPath, 'dist', 'web-tree-sitter.wasm');
            
            await Parser.init({
                locateFile: (scriptName: string) => {
                    console.log(`🔗 Runtime requesting: ${scriptName} -> redirecting to: web-tree-sitter.wasm`);
                    return engineWasmPath;
                }
            });

            this.parser = new Parser();

            console.log("⏳ [3/5] Resolving PHP grammar WASM...");
            const phpWasmPath = path.join(extensionUri.fsPath, 'dist', 'tree-sitter-php.wasm');
            console.log("📦 PHP WASM Path:", phpWasmPath);

            console.log("⏳ [4/5] Loading PHP language...");
            const Language = ParserModule.Language || Parser.Language;
            const PHPLang = await Language.load(phpWasmPath);

            console.log("⏳ [5/5] Setting language to Parser...");
            this.parser.setLanguage(PHPLang);

            this.isInitialized = true;
            console.log("✅ SUCCESS: Tree-sitter PHP ready and synced!");
            
        } catch (error: any) {
            console.error("❌ ERROR during Tree-sitter init:", error);
            vscode.window.showErrorMessage(
                "Gagal memuat Tree-sitter PHP. Cek Debug Console untuk detail versi ABI."
            );
        }
    }

    /**
     * Melakukan parsing dan mengembalikan rootNode
     */
    public static parse(sourceCode: string): any | null {
        if (!this.isInitialized || !this.parser) {
            console.warn("⚠️ Parser belum siap. Pastikan init() dipanggil di activate().");
            return null;
        }

        try {
            const tree = this.parser.parse(sourceCode);
            return tree.rootNode;
        } catch (err) {
            console.error("❌ Parse error:", err);
            return null;
        }
    }
}