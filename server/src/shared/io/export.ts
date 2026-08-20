import fs from 'fs';
import { writeExcel } from './excel';
import PDFDocument from 'pdfkit';
import { logger } from '../logger/logger';

export interface ExportColumn {
  field: string;
  header: string;
  formatter?: (value: any, row: any) => string;
}

/** 通用 Excel 导出 */
export async function exportExcel(
  rows: Record<string, any>[],
  columns: ExportColumn[],
  sheetName = 'Sheet1',
): Promise<Buffer> {
  const data = rows.map((row) => {
    const obj: Record<string, any> = {};
    for (const col of columns) {
      const value = row[col.field];
      obj[col.field] = col.formatter ? col.formatter(value, row) : value ?? '';
    }
    return obj;
  });

  return writeExcel(
    data,
    columns.map((c) => ({ header: c.header, key: c.field, width: 20 })),
    sheetName,
  );
}

export interface PdfExportOptions {
  title: string;
  /** 段落文本数组，每项一段 */
  paragraphs?: string[];
  /** 表格：表头 + 行数据 */
  table?: { headers: string[]; rows: (string | number)[][] };
  /** 字段表格（用于证明：左字段右值） */
  fields?: { label: string; value: string }[];
}

// ========== 中文字体自动检测 ==========
// pdfkit 默认 Helvetica 不支持中文，报表/证明含中文需注册中文字体。
// 按优先级探测系统字体；找不到则回退 Helvetica（英文可用）。
const CHINESE_FONT_CANDIDATES = [
  process.env.CHINESE_FONT_PATH,
  'C:\\Windows\\Fonts\\simhei.ttf',
  'C:\\Windows\\Fonts\\msyh.ttc',
  'C:\\Windows\\Fonts\\simsun.ttc',
  '/usr/share/fonts/truetype/noto/NotoSansSC-Regular.otf',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/wqy-zenhei/wqy-zenhei.ttc',
  '/usr/share/fonts/wqy-microhei/wqy-microhei.ttc',
].filter(Boolean) as string[];

let cachedFontPath: string | null | undefined;

function getChineseFontPath(): string | null {
  if (cachedFontPath !== undefined) return cachedFontPath;
  cachedFontPath = CHINESE_FONT_CANDIDATES.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }) || null;
  if (cachedFontPath) {
    logger.info(`PDF 中文字体已加载: ${cachedFontPath}`);
  } else {
    logger.warn('未找到中文字体，PDF 中文内容将无法正常显示');
  }
  return cachedFontPath;
}

const CN_FONT_NAME = 'ChineseFont';

/** 生成 PDF Buffer */
export async function exportPdf(options: PdfExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (e) => {
        logger.error('PDF 生成失败', { error: e });
        reject(e);
      });

      // 注册中文字体（若可用）
      const fontPath = getChineseFontPath();
      const hasCnFont = !!fontPath;
      if (hasCnFont) {
        try {
          doc.registerFont(CN_FONT_NAME, fontPath!);
        } catch (e) {
          logger.warn('中文字体注册失败，回退默认字体', { error: e instanceof Error ? e.message : e });
        }
      }
      const fontRegular = hasCnFont ? CN_FONT_NAME : 'Helvetica';
      const fontBold = hasCnFont ? CN_FONT_NAME : 'Helvetica-Bold';

      // 标题
      doc.font(fontBold).fontSize(20).text(options.title, { align: 'center' });
      doc.moveDown(2);

      // 段落
      if (options.paragraphs) {
        doc.font(fontRegular).fontSize(12);
        options.paragraphs.forEach((p) => {
          doc.text(p, { align: 'left' });
          doc.moveDown();
        });
      }

      // 字段表（左标签右值）
      if (options.fields) {
        doc.font(fontRegular).fontSize(12);
        options.fields.forEach((f) => {
          doc.text(`${f.label}: ${f.value}`);
          doc.moveDown(0.5);
        });
      }

      // 表格（列对齐 + 自动分页）
      if (options.table) {
        const { headers, rows } = options.table;
        const pageWidth = 525; // A4 宽度减去左右 margin
        const colWidth = pageWidth / headers.length;
        const rowHeight = 22;
        const maxY = doc.page.height - 50;

        // 表头
        const drawHeader = () => {
          const y = doc.y;
          doc.font(fontBold).fontSize(11);
          doc.rect(50, y, pageWidth, rowHeight).fill('#f0f2f5');
          headers.forEach((h, i) => {
            doc.fillColor('#303133').text(String(h), 52 + i * colWidth, y + 6, { width: colWidth - 4, align: 'left' });
          });
          doc.y = y + rowHeight;
          doc.fillColor('#303133');
        };
        drawHeader();

        // 数据行
        doc.font(fontRegular).fontSize(10);
        rows.forEach((row) => {
          if (doc.y + rowHeight > maxY) {
            doc.addPage();
            drawHeader();
            doc.font(fontRegular).fontSize(10);
          }
          const y = doc.y;
          doc.rect(50, y, pageWidth, rowHeight).stroke('#ebeef5');
          row.forEach((cell, i) => {
            doc.text(String(cell ?? ''), 52 + i * colWidth, y + 6, { width: colWidth - 4, align: 'left' });
          });
          doc.y = y + rowHeight;
        });
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * 中文 PDF 字体说明：
 * 自动探测系统中文字体（Windows: simhei/msyh；Linux: Noto/WenQuanYi）。
 * 可通过环境变量 CHINESE_FONT_PATH 指定字体路径。
 * 找不到时回退 Helvetica，仅英文可用。
 */
