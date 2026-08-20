import { ref, reactive } from 'vue';

/** 分页逻辑复用：page、pageSize、total、onChange */
export function usePagination(defaultPageSize = 10) {
  const pagination = reactive({
    page: 1,
    pageSize: defaultPageSize,
    total: 0,
  });

  const loading = ref(false);

  function setPage(page: number): void {
    pagination.page = page;
  }

  function setPageSize(size: number): void {
    pagination.pageSize = size;
    pagination.page = 1;
  }

  function setTotal(total: number): void {
    pagination.total = total;
  }

  /** 暴露给接口的查询参数 */
  function pageParams(): { page: number; pageSize: number } {
    return { page: pagination.page, pageSize: pagination.pageSize };
  }

  return {
    pagination,
    loading,
    setPage,
    setPageSize,
    setTotal,
    pageParams,
  };
}
