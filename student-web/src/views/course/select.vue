<template>
  <div class="select-page">
    <PageHeader title="选课" subtitle="选修/公共课程选择与退选">
      <template #extra>
        <el-button type="primary" size="small" @click="fetchData">刷新</el-button>
      </template>
    </PageHeader>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="可选课程" name="selectable">
        <el-card v-loading="loading">
          <el-table :data="selectableCourses" size="small" border>
            <el-table-column label="课程代码" prop="code" width="100" />
            <el-table-column label="课程名称" prop="name" min-width="150" />
            <el-table-column label="类型" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="courseTypeTag(row.type)">{{ courseTypeLabel(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="学分" prop="credit" width="70" align="center" />
            <el-table-column label="授课教师" width="100">
              <template #default="{ row }">{{ row.teacher?.name }}</template>
            </el-table-column>
            <el-table-column label="上课时间" min-width="160">
              <template #default="{ row }">
                <span v-for="(s, i) in row.schedules" :key="i">
                  {{ formatSchedule(s) }}{{ i < row.schedules.length - 1 ? '；' : '' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="容量" width="100" align="center">
              <template #default="{ row }">
                <span :class="{ 'capacity-full': row.remaining <= 0 }">
                  {{ row.selectedCount }}/{{ row.capacity }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="!row.isSelected"
                  type="primary"
                  size="small"
                  :disabled="row.remaining <= 0"
                  :loading="operatingId === row.id"
                  @click="onSelect(row.id)"
                >
                  {{ row.remaining <= 0 ? '已满' : '选课' }}
                </el-button>
                <el-tag v-else type="success" size="small">已选</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && !selectableCourses.length" description="暂无可选课程" />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="我的已选" name="selected">
        <el-card v-loading="loading">
          <el-table :data="mySelections" size="small" border>
            <el-table-column label="课程代码" prop="course.code" width="100" />
            <el-table-column label="课程名称" prop="course.name" min-width="150" />
            <el-table-column label="类型" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="courseTypeTag(row.course.type)">{{ courseTypeLabel(row.course.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="学分" prop="course.credit" width="70" align="center" />
            <el-table-column label="授课教师" width="100">
              <template #default="{ row }">{{ row.course.teacher?.name }}</template>
            </el-table-column>
            <el-table-column label="上课时间" min-width="160">
              <template #default="{ row }">
                <span v-for="(s, i) in row.course.schedules" :key="i">
                  {{ formatSchedule(s) }}{{ i < row.course.schedules.length - 1 ? '；' : '' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="danger"
                  size="small"
                  plain
                  :loading="operatingId === row.id"
                  @click="onDrop(row.id)"
                >
                  退选
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && !mySelections.length" description="暂无已选课程" />
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  getSelectableCourses,
  getMySelections,
  selectCourse,
  dropCourse,
  type SelectableCourse,
  type MySelection,
} from '@/api/course';

const activeTab = ref('selectable');
const loading = ref(false);
const operatingId = ref<string>('');
const selectableCourses = ref<SelectableCourse[]>([]);
const mySelections = ref<MySelection[]>([]);

function courseTypeLabel(type: string): string {
  const map: Record<string, string> = { REQUIRED: '必修', ELECTIVE: '选修', PUBLIC: '公共' };
  return map[type] || type;
}

function courseTypeTag(type: string): 'primary' | 'success' | 'warning' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
    REQUIRED: 'primary',
    ELECTIVE: 'success',
    PUBLIC: 'warning',
  };
  return map[type] || 'info';
}

function formatSchedule(s: { weekDay: number; startSection: number; endSection: number; classroom: string }): string {
  const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return `${days[s.weekDay]}第${s.startSection}-${s.endSection}节@${s.classroom}`;
}

async function fetchSelectable(): Promise<void> {
  try {
    selectableCourses.value = await getSelectableCourses();
  } catch {
    // ignore
  }
}

async function fetchMySelections(): Promise<void> {
  try {
    mySelections.value = await getMySelections();
  } catch {
    // ignore
  }
}

async function fetchData(): Promise<void> {
  loading.value = true;
  try {
    await Promise.all([fetchSelectable(), fetchMySelections()]);
  } finally {
    loading.value = false;
  }
}

async function onSelect(courseId: string): Promise<void> {
  operatingId.value = courseId;
  try {
    await selectCourse(courseId);
    ElMessage.success('选课成功');
    await fetchData();
  } catch {
    // ignore
  } finally {
    operatingId.value = '';
  }
}

async function onDrop(selectionId: string): Promise<void> {
  try {
    await ElMessageBox.confirm('确定要退选该课程吗？退选后不可恢复。', '退选确认', {
      type: 'warning',
    });
  } catch {
    return;
  }
  operatingId.value = selectionId;
  try {
    await dropCourse(selectionId);
    ElMessage.success('退选成功');
    await fetchData();
  } catch {
    // ignore
  } finally {
    operatingId.value = '';
  }
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped lang="scss">
.capacity-full {
  color: var(--el-color-danger);
  font-weight: 600;
}
</style>
