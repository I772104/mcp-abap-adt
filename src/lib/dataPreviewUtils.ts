import { parseStringPromise } from 'xml2js';

/**
 * Parse the XML response from the ADT Data Preview API into an array of row objects.
 * Each row maps column name → cell value (string). Returns [] on empty or invalid response.
 */
export async function parseDataPreviewXml(xmlString: string): Promise<Record<string, string>[]> {
    const parsed = await parseStringPromise(xmlString, { explicitArray: false });
    const tableData = parsed?.['dataPreview:tableData'];
    if (!tableData) return [];

    const columns: any[] = Array.isArray(tableData['dataPreview:columns'])
        ? tableData['dataPreview:columns']
        : tableData['dataPreview:columns']
          ? [tableData['dataPreview:columns']]
          : [];

    if (columns.length === 0) return [];

    const firstData = columns[0]['dataPreview:dataSet']?.['dataPreview:data'];
    const numRows = firstData ? (Array.isArray(firstData) ? firstData.length : 1) : 0;
    const rows: Record<string, string>[] = [];

    for (let i = 0; i < numRows; i++) {
        const row: Record<string, string> = {};
        for (const col of columns) {
            const meta = col['dataPreview:metadata'];
            const name: string = (meta?.$ as any)?.['dataPreview:name'] ?? '';
            const data = col['dataPreview:dataSet']?.['dataPreview:data'];
            row[name] = data ? (Array.isArray(data) ? (data[i] ?? '') : data) : '';
        }
        rows.push(row);
    }
    return rows;
}
