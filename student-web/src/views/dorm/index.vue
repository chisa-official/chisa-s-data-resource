<template>
  <div class="dorm-page">
    <PageHeader title="我的宿舍" subtitle="查看宿舍信息、卫生检查与违纪通报" />

    <!-- 宿舍信息卡片 -->
    <el-card v-if="dormInfo" class="mb-20" v-loading="loadingDorm">
      <template #header>
        <div class="card-header">
          <span>宿舍信息</span>
          <div>
            <el-button type="primary" size="small" @click="openDialog('transfer')">调宿申请</el-button>
            <el-button type="warning" size="small" @click="openDialog('checkout')">退宿申请</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="楼栋">{{ dormInfo.dorm?.building }}</el-descriptions-item>
        <el-descriptions-item label="房间号">{{ dormInfo.dorm?.roomNo }}</el-descriptions-item>
        <el-descriptions-item label="床号">{{ dormInfo.bedNo }}</el-descriptions-item>
        <el-descriptions-item label="容量">{{ dormInfo.dorm?.capacity }} 人</el-descriptions-item>
        <el-descriptions-item label="宿舍类型">
          <el-tag :type="dormInfo.dorm?.gender === 'MALE' ? 'primary' : 'danger'" size="small">
            {{ dormInfo.dorm?.gender === 'MALE' ? '男寝' : '女寝' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="入住状态">
          <el-tag :type="dormInfo.status === 'ACTIVE' ? 'success' : 'info'" size="small">
            {{ dormInfo.status === 'ACTIVE' ? '在住' : '已退宿' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="入住日期">{{ formatDate(dormInfo.moveInDate) }}</el-descriptions-item>
        <el-descriptions-item label="退宿日期">{{ dormInfo.moveOutDate ? formatDate(dormInfo.moveOutDate) : '—' }}</el-descriptions-item>
        <el-descriptions-item label="所有床位">
          <el-tag v-for="bed in bedList" :key="bed" :type="bed === dormInfo.bedNo ? 'success' : 'info'" size="small" class="bed-tag">
            {{ bed }}号
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-empty v-else-if="!loadingDorm" description="暂未分配宿舍" />

    <!-- 卫生检查 + 违纪通报 -->
    <el-row v-if="dormInfo" :gutter="20">
      <el-col :span="14">
        <el-card>
          <template #header>
            <span>卫生检查记录</span>
          </template>
          <el-table :data="inspections" v-loading="loadingInspections" size="small" border>
            <el-table-column label="检查日期" width="120">
              <template #default="{ row }">{{ formatDate(row.inspectedAt) }}</template>
            </el-table-column>
            <el-table-column label="评分" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="scoreTag(row.score)" size="small">{{ row.score }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="问题说明" prop="issues" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">{{ row.issues || '无' }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loadingInspections && !inspections.length" description="暂无检查记录" />
          <div v-if="inspPagination.total > inspPagination.pageSize" class="pagination-wrap">
            <el-pagination
              v-model:current-page="inspPagination.page"
              :total="inspPagination.total"
              :page-size="inspPagination.pageSize"
              layout="prev, pager, next"
              small
              @current-change="fetchInspections"
            />
          </div>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card>
          <template #header>
            <span>违纪通报</span>
          </template>
          <el-table :data="violations" v-loading="loadingViolations" size="small" border>
            <el-table-column label="类型" width="100" prop="type" />
            <el-table-column label="描述" prop="description" min-width="150" show-overflow-tooltip />
            <el-table-column label="日期" width="110">
              <template #default="{ row }">{{ formatDate(row.occurredAt) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loadingViolations && !violations.length" description="暂无违纪记录" />
          <div v-if="vioPagination.total > vioPagination.pageSize" class="pagination-wrap">
            <el-pagination
              v-model:current-page="vioPagination.page"
              :total="vioPagination.total"
              :page-size="vioPagination.pageSize"
              layout="prev, pager, next"
              small
              @current-change="fetchViolations"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 调宿/退宿申请弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'transfer' ? '调宿申请' : '退宿申请'"
      width="500px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item v-if="dialogType === 'transfer'" label="期望宿舍" prop="preferredDorm">
          <el-input v-model="form.preferredDorm" placeholder="如：5号楼302室（选填）" />
        </el-form-item>
        <el-form-item label="申请原因" prop="reason">
          <el-input
            v-model="form.reason"
            type="textarea"
            :rows="4"
            placeholder="请说明申请原因"
            maxlength="300"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { usePagination } from '@shared-web/composables/usePagination';
import {
  getMyDorm,
  getDormInspections,
  getDormViolations,
  applyDormTransfer,
  applyDormCheckout,
} from '@/api/dorm';
import type { DormAssignment, DormInspection, DormViolation } from '@shared-web/types';
import { formatDate } from '@shared-web/utils/format';

const loadingDorm = ref(false);
const loadingInspections = ref(false);
const loadingViolations = ref(false);
const dormInfo = ref<DormAssignment | null>(null);
const inspections = ref<DormInspection[]>([]);
const violations = ref<DormViolation[]>([]);
const { pagination: inspPagination } = usePagination(5);
const { pagination: vioPagination } = usePagination(5);

const dialogVisible = ref(false);
const dialogType = ref<'transfer' | 'checkout'>('transfer');
const submitting = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  reason: '',
  preferredDorm: '',
});

const rules: FormRules = {
  reason: [{ required: true, message: '请填写申请原因', trigger: 'blur' }],
};

const bedList = computed(() => {
  const beds = (dormInfo.value?.dorm as any)?.beds;
  if (!beds) return [];
  return Array.isArray(beds) ? beds : JSON.parse(beds);
});

function scoreTag(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 90) return 'success';
  if (score >= 75) return 'warning';
  return 'danger';
}

function openDialog(type: 'transfer' | 'checkout'): void {
  dialogType.value = type;
  form.reason = '';
  form.preferredDorm = '';
  dialogVisible.value = true;
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    if (dialogType.value === 'transfer') {
      await applyDormTransfer({ reason: form.reason, preferredDorm: form.preferredDorm || undefined });
    } else {
      await applyDormCheckout({ reason: form.reason });
    }
    ElMessage.success('申请已提交，请等待宿管处理');
    dialogVisible.value = false;
  } catch {
    // ignore
  } finally {
    submitting.value = false;
  }
}

async function fetchDorm(): Promise<void> {
  loadingDorm.value = true;
  try {
    dormInfo.value = await getMyDorm();
  } catch {
    // ignore
  } finally {
    loadingDorm.value = false;
  }
}

async function fetchInspections(): Promise<void> {
  loadingInspections.value = true;
  try {
    const data = await getDormInspections(inspPagination.page, inspPagination.pageSize);
    inspections.value = data.list;
    inspPagination.total = data.total;
  } catch {
    // ignore
  } finally {
    loadingInspections.value = false;
  }
}

async function fetchViolations(): Promise<void> {
  loadingViolations.value = true;
  try {
    const data = await getDormViolations(vioPagination.page, vioPagination.pageSize);
    violations.value = data.list;
    vioPagination.total = data.total;
  } catch {
    // ignore
  } finally {
    loadingViolations.value = false;
  }
}

onMounted(() => {
  fetchDorm().then(() => {
    if (dormInfo.value) {
      fetchInspections();
      fetchViolations();
    }
  });
});
</script>

<style scoped lang="scss">
.mb-20 {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bed-tag {
  margin-right: 4px;
}
.pagination-wrap {
  margin-top: 12px;
  text-align: right;
}
</style>
