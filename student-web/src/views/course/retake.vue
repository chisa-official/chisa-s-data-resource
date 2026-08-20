<template>
  <div class="retake-page">
    <PageHeader title="重修与补考" subtitle="不及格课程的重修报名与补考报名" />

    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <el-tab-pane label="重修报名" name="retake">
        <el-card v-loading="retakeLoading">
          <template #header>
            <span>可重修课程（不及格记录）</span>
          </template>
          <el-table :data="retakeableCourses" size="small" border>
            <el-table-column label="学期" prop="semester" width="120" />
            <el-table-column label="课程代码" prop="course.code" width="100" />
            <el-table-column label="课程名称" prop="course.name" min-width="150" />
            <el-table-column label="学分" prop="course.credit" width="70" align="center" />
            <el-table-column label="授课教师" width="100">
              <template #default="{ row }">{{ row.course.teacher?.name }}</template>
            </el-table-column>
            <el-table-column label="总评成绩" prop="finalScore" width="90" align="center">
              <template #default="{ row }">
                <span class="score-fail">{{ row.finalScore }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  :loading="operatingId === row.courseId"
                  @click="onApplyRetake(row.courseId)"
                >
                  报名重修
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!retakeLoading && !retakeableCourses.length" description="暂无可重修课程" />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="补考报名" name="exam">
        <el-card v-loading="examLoading">
          <template #header>
            <span>补考报名列表</span>
          </template>
          <el-table :data="examRetakeList" size="small" border>
            <el-table-column label="学期" prop="semester" width="120" />
            <el-table-column label="课程代码" prop="course.code" width="100" />
            <el-table-column label="课程名称" prop="course.name" min-width="150" />
            <el-table-column label="学分" prop="course.credit" width="70" align="center" />
            <el-table-column label="总评成绩" prop="finalScore" width="90" align="center">
              <template #default="{ row }">
                <span class="score-fail">{{ row.finalScore }}</span>
              </template>
            </el-table-column>
            <el-table-column label="补考状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.retake" type="warning" size="small">已报名</el-tag>
                <el-tag v-else type="info" size="small">未报名</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="!row.retake"
                  type="primary"
                  size="small"
                  :loading="operatingId === row.id"
                  @click="onApplyExamRetake(row.id)"
                >
                  报名补考
                </el-button>
                <span v-else class="text-muted">已报名</span>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!examLoading && !examRetakeList.length" description="暂无需补考课程" />
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  getRetakeableCourses,
  applyRetake,
  getExamRetakeList,
  applyExamRetake,
  type ScoreWithCourse,
} from '@/api/course';

const activeTab = ref('retake');
const retakeLoading = ref(false);
const examLoading = ref(false);
const operatingId = ref<string>('');
const retakeableCourses = ref<ScoreWithCourse[]>([]);
const examRetakeList = ref<ScoreWithCourse[]>([]);

async function fetchRetakeable(): Promise<void> {
  retakeLoading.value = true;
  try {
    retakeableCourses.value = await getRetakeableCourses();
  } catch {
    // ignore
  } finally {
    retakeLoading.value = false;
  }
}

async function fetchExamRetake(): Promise<void> {
  examLoading.value = true;
  try {
    examRetakeList.value = await getExamRetakeList();
  } catch {
    // ignore
  } finally {
    examLoading.value = false;
  }
}

function onTabChange(name: string | number): void {
  if (name === 'retake' && !retakeableCourses.value.length) {
    fetchRetakeable();
  } else if (name === 'exam' && !examRetakeList.value.length) {
    fetchExamRetake();
  }
}

async function onApplyRetake(courseId: string): Promise<void> {
  operatingId.value = courseId;
  try {
    await applyRetake(courseId);
    ElMessage.success('重修报名成功');
    await fetchRetakeable();
  } catch {
    // ignore
  } finally {
    operatingId.value = '';
  }
}

async function onApplyExamRetake(scoreId: string): Promise<void> {
  operatingId.value = scoreId;
  try {
    await applyExamRetake(scoreId);
    ElMessage.success('补考报名成功');
    await fetchExamRetake();
  } catch {
    // ignore
  } finally {
    operatingId.value = '';
  }
}

onMounted(() => {
  fetchRetakeable();
});
</script>

<style scoped lang="scss">
.score-fail {
  color: var(--el-color-danger);
  font-weight: 600;
}
.text-muted {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}
</style>
