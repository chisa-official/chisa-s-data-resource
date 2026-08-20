import ExcelJS from 'exceljs';
import { readExcel } from './excel';
import { logger } from '../logger/logger';

export interface ImportColumn {
  field: string;          // 数据字段
  header: string;         // 表头名
  required?: boolean;     // 是否必填
  type?: 'string' | 'number' | 'date';
  validator?: (value: any, row: any) => string | null; // 返回错误信息，null 表示通过
  transformer?: (value: any) => any; // 值转换
}

export interface ImportError {
  row: number;       // Excel 行号（从 2 开始，1 为表头）
  field?: string;
  message: string;
}

export interface ImportResult<T> {
  success: T[];
  errors: ImportError[];
}

/** 通用导入：解析 Excel → 逐行校验 → 批量入库 → 返回成功/失败明细 */
export async function importExcel<T>(
  file: Buffer,
  columns: ImportColumn[],
  handler: (rows: T[]) => Promise<void>,
): Promise<ImportResult<T>> {
  const rawRows = await readExcel(file);
  const success: T[] = [];
  const errors: ImportError[] = [];

  rawRows.forEach((raw, index) => {
    const rowNum = index + 2; // 1 为表头
    const obj: Record<string, any> = {};
    let hasError = false;

    for (const col of columns) {
      const rawValue = raw[col.header];
      let value = rawValue === undefined || rawValue === null ? '' : rawValue;

      // 必填校验
      if (col.required && (value === '' || value === null || value === undefined)) {
        errors.push({ row: rowNum, field: col.field, message: `${col.header} 必填` });
        hasError = true;
        continue;
      }

      // 类型转换
      if (value !== '' && col.type) {
        try {
          if (col.type === 'number') value = Number(value);
          if (col.type === 'date') value = new Date(value);
          if (col.type === 'string') value = String(value).trim();
        } catch {
          errors.push({ row: rowNum, field: col.field, message: `${col.header} 类型错误` });
          hasError = true;
          continue;
        }
      }

      // 自定义校验
      if (col.validator && value !== '') {
        const err = col.validator(value, raw);
        if (err) {
          errors.push({ row: rowNum, field: col.field, message: err });
          hasError = true;
          continue;
        }
      }

      // 转换器
      if (col.transformer && value !== '') {
        value = col.transformer(value);
      }

      obj[col.field] = value;
    }

    if (!hasError) success.push(obj as T);
  });

  // 批量入库（事务由 handler 控制）
  if (success.length > 0) {
    try {
      await handler(success);
    } catch (e) {
      logger.error('导入入库失败', { error: e });
      throw e;
    }
  }

  return { success, errors };
}

/** 根据列定义生成导入模板（含表头 + 示例行 + 必填标记） */
export async function generateTemplate(
  columns: ImportColumn[],
  exampleRow?: Record<string, any>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('导入模板');
  sheet.columns = columns.map((c) => ({
    header: c.required ? `${c.header}*` : c.header,
    key: c.field,
    width: 20,
  }));
  sheet.getRow(1).font = { bold: true };

  if (exampleRow) {
    sheet.addRow(exampleRow);
    sheet.getRow(2).eachCell((cell) => {
      cell.value = String(cell.value || '');
      cell.font = { italic: true, color: { argb: 'FF888888' } };
    });
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
