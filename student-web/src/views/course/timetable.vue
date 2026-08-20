<template>
  <div class="timetable-page">
    <PageHeader title="我的课表" subtitle="按周次查看课程安排">
      <template #extra>
        <el-select v-model="week" size="small" style="width: 110px" @change="fetchTimetable">
          <el-option v-for="w in 20" :key="w" :label="`第 ${w} 周`" :value="w" />
        </el-select>
      </template>
    </PageHeader>

    <el-card v-loading="loading">
      <div class="timetable-grid">
        <div class="timetable-grid__header">
          <div class="timetable-grid__time">节次</div>
          <div v-for="d in weekDays" :key="d.value" class="timetable-grid__day">{{ d.label }}</div>
        </div>
        <div v-for="section in sections" :key="section" class="timetable-grid__row">
          <div class="timetable-grid__time">第{{ section }}节</div>
          <div v-for="d in 7" :key="d" class="timetable-grid__cell">
            <div
              v-for="item in getCellItems(d, section)"
              :key="item.id"
              class="course-block"
              :class="`course-block--${item.course.type.toLowerCase()}`"
            >
              <div class="course-block__name">{{ item.course.name }}</div>
              <div class="course-block__teacher">{{ item.course.teacher?.name }}</div>
              <div class="course-block__room">{{ item.classroom }}</div>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-if="!loading && !timetable.length" description="本周暂无课程" />
    </el-card>

    <div class="legend">
      <span class="legend__item"><i class="legend__color legend__color--required"></i>必修</span>
      <span class="legend__item"><i class="legend__color legend__color--elective"></i>选修</span>
      <span class="legend__item"><i class="legend__color legend__color--public"></i>公共</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { getTimetable, type TimetableItem } from '@/api/course';

const loading = ref(false);
const week = ref(1);
const timetable = ref<TimetableItem[]>([]);

const weekDays = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
];

const sections = [1, 2, 3, 4, 5, 6, 7, 8];

function getCellItems(weekDay: number, section: number): TimetableItem[] {
  return timetable.value.filter(
    (item) => item.weekDay === weekDay && section >= item.startSection && section <= item.endSection,
  );
}

async function fetchTimetable(): Promise<void> {
  loading.value = true;
  try {
    timetable.value = await getTimetable('2025-2026-1', week.value);
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchTimetable();
});
</script>

<style scoped lang="scss">
.timetable-grid {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  gap: 4px;
  font-size: 12px;

  &__header,
  &__row {
    display: contents;
  }
  &__time,
  &__day,
  &__cell {
    border: 1px solid var(--el-border-color-lighter);
    padding: 6px;
    min-height: 56px;
  }
  &__time {
    background: var(--el-fill-color-light);
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }
  &__day {
    background: var(--el-fill-color-lighter);
    text-align: center;
    font-weight: 600;
    min-height: 36px;
  }
  &__cell {
    vertical-align: top;
  }
}

.course-block {
  border-radius: 4px;
  padding: 6px;
  margin-bottom: 4px;
  color: #fff;
  &__name {
    font-weight: 600;
    margin-bottom: 2px;
  }
  &__teacher,
  &__room {
    font-size: 11px;
    opacity: 0.9;
  }
  &--required {
    background: #409eff;
  }
  &--elective {
    background: #67c23a;
  }
  &--public {
    background: #e6a23c;
  }
}

.legend {
  margin-top: 16px;
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  &__item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  &__color {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
    &--required {
      background: #409eff;
    }
    &--elective {
      background: #67c23a;
    }
    &--public {
      background: #e6a23c;
    }
  }
}
</style>
