import { ref, readonly } from 'vue';
import { get } from '../utils/request';

// 全局字典缓存：type -> items
const dictCache = new Map<string, Array<{ label: string; value: string; sort: number }>>();
const loadingTypes = new Set<string>();

/** 字典数据加载与缓存，避免重复请求 */
export function useDict() {
  async function loadDict(type: string): Promise<Array<{ label: string; value: string; sort: number }>> {
    if (dictCache.has(type)) return dictCache.get(type)!;
    if (loadingTypes.has(type)) {
      // 等待已有请求
      while (loadingTypes.has(type)) {
        await new Promise((r) => setTimeout(r, 50));
      }
      return dictCache.get(type) || [];
    }
    loadingTypes.add(type);
    try {
      const list = await get<any[]>(`/admin/base/dicts/${type}`);
      const sorted = (list || []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0));
      dictCache.set(type, sorted);
      return sorted;
    } finally {
      loadingTypes.delete(type);
    }
  }

  function getDict(type: string): Array<{ label: string; value: string; sort: number }> {
    return dictCache.get(type) || [];
  }

  /** 根据 value 查 label */
  function dictLabel(type: string, value: string): string {
    const items = dictCache.get(type) || [];
    return items.find((i) => i.value === value)?.label || value;
  }

  function clearCache(type?: string): void {
    if (type) dictCache.delete(type);
    else dictCache.clear();
  }

  return { loadDict, getDict, dictLabel, clearCache };
}

// 单例缓存，跨组件复用
const _dictCache = useDict();
export default _dictCache;
