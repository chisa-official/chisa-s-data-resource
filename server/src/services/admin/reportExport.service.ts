import { exportExcel, exportPdf, type ExportColumn } from '../../shared/io/export';
import { ApiError } from '../../shared/error/ApiError';
import { getReportData, type ReportType } from './report.service';

export type ExportFormat = 'excel' | 'pdf';

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

const REPORT_TITLE: Record<ReportType, string> = {
  student: '学生人数统计报表',
  status: '学籍异动统计报表',
  attendance: '考勤统计报表',
  award: '奖助学金统计报表',
  discipline: '违纪统计报表',
};

/** 组装各报表的导出列与行数据 */
function buildTable(
  type: ReportType,
  data: any,
): { columns: ExportColumn[]; rows: Record<string, any>[]; headers: string[]; tableRows: (string | number)[][]; summary: string[] } {
  switch (type) {
    case 'student': {
      const summary = [
        `学生总数：${data.total}`,
        `性别分布：${data.byGender.map((g: any) => `${g.name} ${g.value}`).join('，')}`,
        `学籍状态：${data.byStatus.map((s: any) => `${s.name} ${s.value}`).join('，')}`,
      ];
      const columns: ExportColumn[] = [
        { field: 'departmentName', header: '院系名称' },
        { field: 'count', header: '学生人数' },
      ];
      const rows = [...data.byDepartment, { departmentName: '合计', count: data.total }];
      const headers = ['院系名称', '学生人数'];
      const tableRows: (string | number)[][] = rows.map((r: any) => [r.departmentName, r.count]);
      return { columns, rows, headers, tableRows, summary };
    }
    case 'status': {
      const summary = [
        `异动总数：${data.total}`,
        `类型分布：${data.byType.map((t: any) => `${t.name} ${t.value}`).join('，')}`,
      ];
      const columns: ExportColumn[] = [
        { field: 'month', header: '月份' },
        { field: 'count', header: '异动人数' },
      ];
      const rows = [...data.byMonth, { month: '合计', count: data.total }];
      const headers = ['月份', '异动人数'];
      const tableRows: (string | number)[][] = rows.map((r: any) => [r.month, r.count]);
      return { columns, rows, headers, tableRows, summary };
    }
    case 'attendance': {
      const { summary: s } = data;
      const summary = [
        `总记录：${s.total}，出勤：${s.present}，缺勤：${s.absent}，迟到：${s.late}，请假：${s.leave}`,
        `总体出勤率：${s.total === 0 ? 0 : Math.round((s.present / s.total) * 10000) / 100}%`,
      ];
      const columns: ExportColumn[] = [
        { field: 'className', header: '班级' },
        { field: 'total', header: '总记录' },
        { field: 'present', header: '出勤' },
        { field: 'absent', header: '缺勤' },
        { field: 'late', header: '迟到' },
        { field: 'leave', header: '请假' },
        { field: 'rate', header: '出勤率(%)' },
      ];
      const rows = data.byClass.map((c: any) => ({ ...c, rate: c.rate }));
      const headers = ['班级', '总记录', '出勤', '缺勤', '迟到', '请假', '出勤率(%)'];
      const tableRows: (string | number)[][] = rows.map((r: any) => [r.className, r.total, r.present, r.absent, r.late, r.leave, r.rate]);
      return { columns, rows, headers, tableRows, summary };
    }
    case 'award': {
      const summary = [
        `总人次：${data.totalCount}，总金额：${data.totalAmount} 元`,
        `类型分布：${data.byType.map((t: any) => `${t.name} ${t.count}人/${t.amount}元`).join('，')}`,
      ];
      const columns: ExportColumn[] = [
        { field: 'departmentName', header: '院系' },
        { field: 'SCHOLARSHIP', header: '奖学金' },
        { field: 'AID', header: '助学金' },
        { field: 'LOAN', header: '助学贷款' },
        { field: 'HONOR', header: '评优' },
        { field: 'total', header: '合计' },
      ];
      const rows = data.byDepartment.map((d: any) => ({
        ...d,
        total: d.SCHOLARSHIP + d.AID + d.LOAN + d.HONOR,
      }));
      const headers = ['院系', '奖学金', '助学金', '助学贷款', '评优', '合计'];
      const tableRows: (string | number)[][] = rows.map((r: any) => [r.departmentName, r.SCHOLARSHIP, r.AID, r.LOAN, r.HONOR, r.total]);
      return { columns, rows, headers, tableRows, summary };
    }
    case 'discipline': {
      const summary = [
        `违纪总数：${data.total}`,
        `类型分布：${data.byType.map((t: any) => `${t.name} ${t.value}`).join('，')}`,
      ];
      const columns: ExportColumn[] = [
        { field: 'departmentName', header: '院系' },
        { field: 'count', header: '违纪人数' },
      ];
      const rows = [...data.byDepartment, { departmentName: '合计', count: data.total }];
      const headers = ['院系', '违纪人数'];
      const tableRows: (string | number)[][] = rows.map((r: any) => [r.departmentName, r.count]);
      return { columns, rows, headers, tableRows, summary };
    }
    default:
      throw ApiError.badRequest('不支持的报表类型');
  }
}

/** 生成报表导出文件 */
export async function exportReport(
  type: ReportType,
  format: ExportFormat,
  query: any,
): Promise<ExportResult> {
  const data = await getReportData(type, query);
  const { columns, rows, headers, tableRows, summary } = buildTable(type, data);
  const title = REPORT_TITLE[type];
  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === 'excel') {
    const buffer = await exportExcel(rows, columns, title);
    return {
      buffer,
      filename: `${title}_${timestamp}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  if (format === 'pdf') {
    const buffer = await exportPdf({
      title,
      paragraphs: [...summary, `导出时间：${new Date().toLocaleString('zh-CN')}`],
      table: { headers, rows: tableRows },
    });
    return {
      buffer,
      filename: `${title}_${timestamp}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  throw ApiError.badRequest('不支持的导出格式');
}
