export class ASTUtils {
    /**
     * Mencari child node berdasarkan tipe tertentu secara rekursif
     */
    public static findFirstChildWithType(node: any, type: string): any | null {
        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child.type === type) return child;
            
            const found = this.findFirstChildWithType(child, type);
            if (found) return found;
        }
        return null;
    }

    /**
     * Mengambil teks dari child node berdasarkan field name 
     * (Sangat berguna untuk Tree-sitter PHP field names)
     */
    public static getFieldText(node: any, fieldName: string): string | null {
        const child = node.childForFieldName(fieldName);
        return child ? child.text : null;
    }

    /**
     * Mengecek apakah sebuah node berada di dalam folder tertentu
     * (Misal: Memastikan rule hanya jalan di folder 'Controllers')
     */
    public static isInFolder(filePath: string, folderName: string): boolean {
        const normalizedPath = filePath.replace(/\\/g, '/');
        return normalizedPath.includes(`/${folderName}/`);
    }

    /**
     * Mendapatkan indentasi dari sebuah baris kode
     * (Penting untuk menjaga kerapian saat auto-refactor nanti)
     */
    public static getIndentation(text: string, row: number): string {
        const lines = text.split('\n');
        const line = lines[row];
        const match = line.match(/^\s*/);
        return match ? match[0] : '';
    }
}