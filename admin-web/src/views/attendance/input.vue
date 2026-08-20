<template>
  <div class="input-page">
    <PageHeader title="考勤录入" subtitle="手动录入或批量导入考勤记录" />

    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="onAddRow">添加一行</el-button>
        <el-button type="success" :icon="Upload" :disabled="rows.length === 0" :loading="submitting" @click="onSubmit">批量提交</el-button>
        <el-button :icon="Delete" :disabled="rows.length === 0" @click="onClear">清空</el-button>
      </div>

      <el-table :data="rows" border row-key="idx" style="margin-top: 12px">
        <el-table-column label="学号" min-width="140">
          <template #default="{ row }">
            <el-input v-model="row.studentNo" placeholder="输入学号" />
          </template>
        </el-table-column>
        <el-table-column label="课程" min-width="180">
          <template #default="{ row }">
            <el-select v-model="row.courseId" filterable remote :remote-method="searchCourse" placeholder="搜索课程" style="width: 100%">
              <el-option v-for="c in courseOptions" :key="c.id" :label="`${c.code} - ${c.name}`" :value="c.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="排课ID" width="160">
          <template #default="{ row }">
            <el-input v-model="row.scheduleId" placeholder="排课记录ID" />
          </template>
        </el-table-column>
        <el-table-column label="日期" width="160">
          <template #default="{ row }">
            <el-date-picker v-model="row.date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="考勤状态" width="130">
          <template #default="{ row }">
            <el-select v-model="row.status" placeholder="状态" style="width: 100%">
              <el-option label="出勤" value="PRESENT" />
              <el-option label="缺勤" value="ABSENT" />
              <el-option label="迟到" value="LATE" />
              <el-option label="请假" value="LEAVE" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ $index }">
            <el-button type="danger" link :icon="Delete" @click="onRemoveRow($index)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-alert
      v-if="rows.length === 0"
      title="暂无录入数据，点击「添加一行」开始录入考勤记录"
      type="info"
      :closable="false"
      show-icon
      style="margin-top: 16px"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Upload, Delete } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { importAttendance, type AttendanceImportItem } from '@/api/attendance';
import { get } from '@shared-web/utils/request';
import { AttendanceStatus } from '@shared-web/types';

const submitting = ref(false);
const rows = ref<Array<AttendanceImportItem & { idx: number }>>([]);
const courseOptions = ref<Array<{ id: string; code: string; name: string }>>([]);
let rowIdx = 0;

async function searchCourse(keyword: string): Promise<void> {
  if (!keyword) return;
  try {
    const list = await get('/admin/base/courses', { keyword, pageSize: 20 });
    courseOptions.value = (list as any).list || [];
  } catch { /* ignore */ }
}

function onAddRow(): void {
  rows.value.push({
    idx: rowIdx++,
    studentNo: '',
    courseId: '',
    scheduleId: '',
    date: '',
    status: 'PRESENT' as AttendanceStatus,
  });
}

function onRemoveRow(index: number): void {
  rows.value.splice(index, 1);
}

function onClear(): void {
  rows.value = [];
}

async function onSubmit(): Promise<void> {
  const valid = rows.value.filter((r) => r.studentNo && r.courseId && r.scheduleId && r.date && r.status);
  if (valid.length === 0) {
    ElMessage.warning('请填写完整的考勤记录');
    return;
  }
  try {
    await ElMessageBox.confirm(`确认提交 ${valid.length} 条考勤记录？`, '录入确认', { type: 'warning' });
    submitting.value = true;
    const result = await importAttendance(valid.map(({ idx, ...rest }) => rest));
    ElMessage.success(`录入完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`);
    rows.value = [];
  } catch { /* cancel */ } finally {
    submitting.value = false;
  }
}
</script>

<style scoped lang="scss">
.input-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
.toolbar {
  display: flex;
  gap: 12px;
}
</style>
