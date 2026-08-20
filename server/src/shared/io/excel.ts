import ExcelJS from 'exceljs';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

/** 解析 Excel Buffer 为 JSON 数组 */
export async function readExcel(buffer: Buffer): Promise<Record<string, any>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, col) => {
    headers[col - 1] = String(cell.value || '').trim();
  });

  const rows: Record<string, any>[] = [];
  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // 跳过表头
    const obj: Record<string, any> = {};
    row.eachCell((cell, col) => {
      const key = headers[col - 1];
      if (key) obj[key] = cell.value;
    });
    rows.push(obj);
  });
  return rows;
}

/** 将 JSON 数组写入 Excel Buffer */
export async function writeExcel(
  data: Record<string, any>[],
  columns: ExcelColumn[],
  sheetName = 'Sheet1',
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));

  // 表头样式
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'center' };

  data.forEach((row) => sheet.addRow(row));

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
