import { request } from './request';

/** Blob 流文件下载（证明 PDF、附件、Excel 导出） */
export async function downloadFile(
  url: string,
  params?: any,
  filename?: string,
): Promise<void> {
  // 拦截器对 blob 响应返回完整 AxiosResponse，需取 .data 作为 Blob
  const response = (await request.get(url, {
    params,
    responseType: 'blob',
  })) as any;
  const blob = (response?.data ?? response) as Blob;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename || decodeFilenameFromResponse(response) || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

function decodeFilenameFromResponse(response: any): string | undefined {
  const disposition = response?.headers?.['content-disposition'];
  if (!disposition) return undefined;
  const match = /filename="?([^";]+)"?/.exec(disposition);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
