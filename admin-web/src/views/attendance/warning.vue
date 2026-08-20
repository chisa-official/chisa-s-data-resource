<template>
  <div class="warning-page">
    <PageHeader title="考勤预警名单" subtitle="旷课次数超过阈值的学生名单">
      <template #extra>
        <el-alert
          v-if="threshold"
          :title="`当前预警阈值：旷课 ${threshold} 次`"
          type="warning"
          :closable="false"
          show-icon
          style="padding: 4px 12px"
        />
      </template>
    </PageHeader>

    <el-card>
      <div class="search-bar">
        <el-button type="primary" :icon="Search" @click="loadData">刷新名单</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="studentId">
        <el-table-column prop="studentNo" label="学号" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="className" label="班级" min-width="140" />
        <el-table-column prop="departmentName" label="院系" min-width="140" />
        <el-table-column label="旷课次数" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.absentCount >= threshold * 2 ? 'danger' : 'warning'" size="default">
              {{ row.absentCount }} 次
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预警级别" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="warningLevel(row.absentCount).type" size="small" effect="dark">
              {{ warningLevel(row.absentCount).text }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-alert
        v-if="!loading && list.length === 0"
        title="暂无预警学生，所有学生考勤正常"
        type="success"
        :closable="false"
        show-icon
        style="margin-top: 16px"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Search } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { getAttendanceWarnings, type AttendanceWarning } from '@/api/attendance';

const loading = ref(false);
const list = ref<AttendanceWarning[]>([]);
const threshold = ref(0);

const warningLevel = (count: number): { type: 'warning' | 'danger'; text: string } => {
  if (count >= threshold.value * 2) return { type: 'danger', text: '严重预警' };
  return { type: 'warning', text: '一般预警' };
};

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const result = await getAttendanceWarnings({});
    list.value = result.list;
    threshold.value = result.threshold;
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.warning-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
