<template>
  <div class="notice-list-page">
    <PageHeader title="通知列表" subtitle="发布与管理全校/院系/班级通知公告">
      <template #extra>
        <el-button type="primary" :icon="Plus" @click="onAdd">新建通知</el-button>
      </template>
    </PageHeader>

    <el-card>
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input v-model="query.title" placeholder="通知标题" clearable style="width: 200px" @keyup.enter="onSearch" />
        <el-select v-model="query.scope" placeholder="可见范围" clearable style="width: 140px" @change="onSearch">
          <el-option label="全校" value="SCHOOL" />
          <el-option label="院系" value="DEPARTMENT" />
          <el-option label="班级" value="CLASS" />
        </el-select>
        <el-select v-model="query.published" placeholder="发布状态" clearable style="width: 140px" @change="onSearch">
          <el-option label="草稿" :value="false" />
          <el-option label="已发布" :value="true" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <!-- 通知列表 -->
      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip />
        <el-table-column label="可见范围" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="scopeTagType(row.scope)" size="small">{{ scopeLabel(row.scope) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="!row.published" type="warning" size="small">草稿</el-tag>
            <el-tag v-else-if="isScheduled(row)" type="info" size="small">定时发布</el-tag>
            <el-tag v-else type="success" size="small">已发布</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="附件" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.attachments?.length" :size="16"><Paperclip /></el-icon>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.publishAt) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.published" type="primary" link :icon="Promotion" @click="onPublish(row)">发布</el-button>
            <el-button v-if="!row.published" type="primary" link :icon="Edit" @click="onEdit(row)">编辑</el-button>
            <el-button type="info" link :icon="DataAnalysis" @click="goReadStats(row)">统计</el-button>
            <el-button type="danger" link :icon="Delete" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="loadData"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑通知' : '新建通知'"
      width="780px"
      :close-on-click-modal="false"
      @close="onDialogClose"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="通知标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入通知标题" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="可见范围" prop="scope">
          <el-radio-group v-model="form.scope" @change="onScopeChange">
            <el-radio value="SCHOOL">全校</el-radio>
            <el-radio value="DEPARTMENT">指定院系</el-radio>
            <el-radio value="CLASS">指定班级</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.scope === 'DEPARTMENT'" label="目标院系" prop="targetId">
          <el-select v-model="form.targetId" filterable placeholder="请选择院系" style="width: 100%">
            <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.scope === 'CLASS'" label="目标班级" prop="targetId">
          <el-select v-model="form.targetId" filterable placeholder="请选择班级" style="width: 100%">
            <el-option v-for="c in classOptions" :key="c.id" :label="`${c.departmentName} / ${c.name}`" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="通知正文" prop="content">
          <RichEditor v-model="form.content" height="280px" placeholder="请输入通知正文..." />
        </el-form-item>
        <el-form-item label="附件">
          <FileUploader
            v-model="uploadedFiles"
            bizType="notice_attach"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png"
            :max-size-m-b="20"
            :max-count="10"
            tip="支持 PDF/Word/Excel/PPT/图片/压缩包，单文件 ≤ 20MB，最多 10 个"
          />
        </el-form-item>
        <el-form-item label="发布时间">
          <el-date-picker
            v-model="form.publishAt"
            type="datetime"
            placeholder="不选则创建后立即发布"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
          <div class="form-tip">选择未来时间可实现定时发布；留空则在点击「发布」后即时生效。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">保存草稿</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Edit, Delete, Search, Refresh, Promotion, DataAnalysis, Paperclip } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import FileUploader from '@shared-web/components/FileUploader.vue';
import RichEditor from '@/components/RichEditor.vue';
import {
  listNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  publishNotice,
  type NoticeResult,
} from '@/api/notice';
import { getDepartmentList, listClasses } from '@/api/base';
import { NoticeScope } from '@shared-web/types';
import type { Department } from '@shared-web/types';
import { formatDateTime } from '@shared-web/utils/format';

const router = useRouter();
const loading = ref(false);
const submitting = ref(false);
const list = ref<NoticeResult[]>([]);
const formRef = ref<FormInstance>();
const dialogVisible = ref(false);
const editingId = ref('');
const departments = ref<Department[]>([]);
const allClasses = ref<{ id: string; name: string; departmentId: string }[]>([]);
const uploadedFiles = ref<Array<{ id: string; filename: string; url: string; size?: number }>>([]);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  title: '',
  scope: undefined as NoticeScope | undefined,
  published: undefined as boolean | undefined,
});

const form = reactive({
  title: '',
  content: '',
  scope: 'SCHOOL' as NoticeScope,
  targetId: '' as string,
  publishAt: '' as string,
});

const rules: FormRules = {
  title: [{ required: true, message: '请输入通知标题', trigger: 'blur' }],
  scope: [{ required: true, message: '请选择可见范围', trigger: 'change' }],
  content: [{ required: true, message: '请输入通知正文', trigger: 'blur' }],
  targetId: [
    {
      validator: (_r, value, cb) => {
        if (form.scope !== 'SCHOOL' && !value) return cb(new Error('请选择目标院系或班级'));
        cb();
      },
      trigger: 'change',
    },
  ],
};

const classOptions = computed(() =>
  allClasses.value.map((c) => {
    const dept = departments.value.find((d) => d.id === c.departmentId);
    return { ...c, departmentName: dept?.name || '' };
  }),
);

// ========== 工具函数 ==========

function scopeLabel(scope: NoticeScope): string {
  return { SCHOOL: '全校', DEPARTMENT: '院系', CLASS: '班级' }[scope] || scope;
}

function scopeTagType(scope: NoticeScope): 'danger' | 'primary' | 'success' {
  return { SCHOOL: 'danger', DEPARTMENT: 'primary', CLASS: 'success' }[scope] || 'primary';
}

function isScheduled(row: NoticeResult): boolean {
  return row.published && new Date(row.publishAt).getTime() > Date.now();
}

// ========== 数据加载 ==========

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listNotices({
      page: pagination.page,
      pageSize: pagination.pageSize,
      title: query.title || undefined,
      scope: query.scope,
      published: query.published,
    });
    list.value = res.list;
    pagination.total = res.total;
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

async function loadDepartments(): Promise<void> {
  try {
    departments.value = await getDepartmentList();
  } catch { /* ignore */ }
}

async function loadClasses(): Promise<void> {
  try {
    const res = await listClasses({ page: 1, pageSize: 1000 });
    allClasses.value = res.list.map((c) => ({ id: c.id, name: c.name, departmentId: c.departmentId }));
  } catch { /* ignore */ }
}

// ========== 搜索 ==========

function onSearch(): void {
  pagination.page = 1;
  loadData();
}

function onReset(): void {
  query.title = '';
  query.scope = undefined;
  query.published = undefined;
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

// ========== 弹窗 ==========

function onAdd(): void {
  editingId.value = '';
  form.title = '';
  form.content = '';
  form.scope = 'SCHOOL';
  form.targetId = '';
  form.publishAt = '';
  uploadedFiles.value = [];
  dialogVisible.value = true;
}

async function onEdit(row: NoticeResult): Promise<void> {
  editingId.value = row.id;
  form.title = row.title;
  form.content = row.content;
  form.scope = row.scope;
  form.targetId = row.targetId || '';
  form.publishAt = row.publishAt?.slice(0, 19) || '';
  // 还原附件
  const atts = row.attachments;
  if (Array.isArray(atts) && atts.length) {
    uploadedFiles.value = atts.map((url: string, idx: number) => ({
      id: String(idx),
      filename: url.split(/[\\/]/).pop() || `附件${idx + 1}`,
      url,
    }));
  } else {
    uploadedFiles.value = [];
  }
  dialogVisible.value = true;
}

function onScopeChange(): void {
  form.targetId = '';
}

function onDialogClose(): void {
  formRef.value?.resetFields();
  uploadedFiles.value = [];
}

async function onSubmit(): Promise<void> {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    const attachments = uploadedFiles.value.map((f) => f.url);
    const payload: any = {
      title: form.title,
      content: form.content,
      scope: form.scope,
      targetId: form.scope === 'SCHOOL' ? undefined : form.targetId,
      attachments: attachments.length ? attachments : undefined,
      publishAt: form.publishAt || undefined,
    };
    if (editingId.value) {
      await updateNotice(editingId.value, payload);
      ElMessage.success('更新成功');
    } else {
      await createNotice(payload);
      ElMessage.success('创建成功（草稿状态，点击「发布」后学生可见）');
    }
    dialogVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

// ========== 发布 ==========

async function onPublish(row: NoticeResult): Promise<void> {
  const isFuture = new Date(row.publishAt).getTime() > Date.now();
  const tip = isFuture
    ? `通知「${row.title}」将设为定时发布（${formatDateTime(row.publishAt)}），到时间后学生端自动可见。确认发布？`
    : `通知「${row.title}」将立即对学生可见。确认发布？`;
  try {
    await ElMessageBox.confirm(tip, '发布确认', { type: 'warning' });
    await publishNotice(row.id);
    ElMessage.success('发布成功');
    await loadData();
  } catch { /* cancel */ }
}

// ========== 删除 ==========

async function onDelete(row: NoticeResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除通知「${row.title}」？删除后不可恢复。`, '删除确认', { type: 'warning' });
    await deleteNotice(row.id);
    ElMessage.success('已删除');
    await loadData();
  } catch { /* cancel */ }
}

// ========== 跳转阅读统计 ==========

function goReadStats(row: NoticeResult): void {
  router.push({ path: '/notice/read-stats', query: { id: row.id } });
}

// ========== 初始化 ==========

onMounted(() => {
  loadData();
  loadDepartments();
  loadClasses();
});
</script>

<style scoped lang="scss">
.notice-list-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  margin-top: 4px;
}
</style>
