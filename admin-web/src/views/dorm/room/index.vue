<template>
  <div class="room-page">
    <PageHeader title="宿舍床位管理" subtitle="楼栋/宿舍/床位维护与入住状态查看">
      <template #extra>
        <el-button type="primary" :icon="Plus" @click="onAdd">新增宿舍</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.building" placeholder="楼栋" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-input v-model="query.roomNo" placeholder="房间号" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-select v-model="query.gender" placeholder="性别" clearable style="width: 120px" @change="onSearch">
          <el-option label="男寝" value="MALE" />
          <el-option label="女寝" value="FEMALE" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column prop="building" label="楼栋" width="100" />
        <el-table-column prop="roomNo" label="房间号" width="100" />
        <el-table-column label="性别" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.gender === 'MALE' ? 'primary' : 'danger'" size="small">{{ row.gender === 'MALE' ? '男寝' : '女寝' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="capacity" label="容量" width="80" align="center" />
        <el-table-column label="床位占用" width="160" align="center">
          <template #default="{ row }">
            <el-progress :percentage="row.vacantCount + row.occupiedCount === 0 ? 0 : Math.round(row.occupiedCount / (row.vacantCount + row.occupiedCount) * 100)" :format="() => `${row.occupiedCount}/${row.occupiedCount + row.vacantCount}`" />
          </template>
        </el-table-column>
        <el-table-column label="已住/空余" width="110" align="center">
          <template #default="{ row }">
            <span style="color: #67c23a">{{ row.occupiedCount }}</span> / <span style="color: #909399">{{ row.vacantCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="info" link :icon="View" @click="onViewBeds(row)">查看床位</el-button>
            <el-button type="primary" link :icon="Edit" @click="onEdit(row)">编辑</el-button>
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

    <el-dialog v-model="formVisible" :title="isEdit ? '编辑宿舍' : '新增宿舍'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="楼栋" prop="building">
          <el-input v-model="form.building" placeholder="如：1号楼" />
        </el-form-item>
        <el-form-item label="房间号" prop="roomNo">
          <el-input v-model="form.roomNo" placeholder="如：101" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="form.gender">
            <el-radio value="MALE">男寝</el-radio>
            <el-radio value="FEMALE">女寝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="容量" prop="capacity">
          <el-input-number v-model="form.capacity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="床位号" prop="bedsInput">
          <el-input v-model="form.bedsInput" placeholder="逗号分隔，如：1,2,3,4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="bedsVisible" :title="`床位入住 - ${currentDorm?.building} ${currentDorm?.roomNo}`" width="560px">
      <div v-loading="bedsLoading" class="beds-grid">
        <div v-for="bed in beds" :key="bed.bedNo" class="bed-card" :class="{ occupied: bed.occupied }">
          <div class="bed-no">{{ bed.bedNo }} 号床</div>
          <div v-if="bed.occupied" class="bed-student">
            <el-icon><User /></el-icon>
            {{ bed.student?.name }}（{{ bed.student?.studentNo }}）
          </div>
          <div v-else class="bed-empty">空床位</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus';
import { Plus, Edit, Delete, Search, Refresh, View, User } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { listDorms, createDorm, updateDorm, deleteDorm, getDormBeds, type DormListResult, type DormBed } from '@/api/dorm';
import { Gender } from '@shared-web/types';

const loading = ref(false);
const submitting = ref(false);
const list = ref<DormListResult[]>([]);
const formVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const editId = ref('');

const bedsVisible = ref(false);
const bedsLoading = ref(false);
const beds = ref<DormBed[]>([]);
const currentDorm = ref<DormListResult | null>(null);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  building: '',
  roomNo: '',
  gender: undefined as Gender | undefined,
});

const form = reactive({
  building: '',
  roomNo: '',
  gender: 'MALE' as Gender,
  capacity: 4,
  bedsInput: '1,2,3,4',
});

const rules = {
  building: [{ required: true, message: '请输入楼栋', trigger: 'blur' }],
  roomNo: [{ required: true, message: '请输入房间号', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  capacity: [{ required: true, message: '请输入容量', trigger: 'blur' }],
  bedsInput: [{ required: true, message: '请输入床位号', trigger: 'blur' }],
};

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listDorms({
      page: pagination.page,
      pageSize: pagination.pageSize,
      building: query.building || undefined,
      roomNo: query.roomNo || undefined,
      gender: query.gender,
    });
    list.value = res.list;
    pagination.total = res.total;
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  pagination.page = 1;
  loadData();
}

function onReset(): void {
  query.building = '';
  query.roomNo = '';
  query.gender = undefined;
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

function onAdd(): void {
  isEdit.value = false;
  editId.value = '';
  form.building = '';
  form.roomNo = '';
  form.gender = 'MALE';
  form.capacity = 4;
  form.bedsInput = '1,2,3,4';
  formVisible.value = true;
}

function onEdit(row: DormListResult): void {
  isEdit.value = true;
  editId.value = row.id;
  form.building = row.building;
  form.roomNo = row.roomNo;
  form.gender = row.gender;
  form.capacity = row.capacity;
  form.bedsInput = (row.beds || []).join(',');
  formVisible.value = true;
}

async function onSubmit(): Promise<void> {
  await formRef.value?.validate();
  const beds = form.bedsInput.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  if (beds.length === 0) {
    ElMessage.warning('床位号不能为空');
    return;
  }
  submitting.value = true;
  try {
    const payload = { building: form.building, roomNo: form.roomNo, gender: form.gender, capacity: form.capacity, beds };
    if (isEdit.value) {
      await updateDorm(editId.value, payload);
      ElMessage.success('更新成功');
    } else {
      await createDorm(payload);
      ElMessage.success('创建成功');
    }
    formVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

async function onDelete(row: DormListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除宿舍「${row.building}-${row.roomNo}」？`, '删除确认', { type: 'warning' });
    await deleteDorm(row.id);
    ElMessage.success('已删除');
    await loadData();
  } catch { /* cancel */ }
}

async function onViewBeds(row: DormListResult): Promise<void> {
  currentDorm.value = row;
  bedsVisible.value = true;
  bedsLoading.value = true;
  try {
    const res = await getDormBeds(row.id);
    beds.value = res.beds;
  } catch { /* ignore */ } finally {
    bedsLoading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.room-page {
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
.beds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  min-height: 100px;
}
.bed-card {
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  padding: 12px;
  text-align: center;
  &.occupied {
    border-color: #67c23a;
    background: #f0f9eb;
  }
  .bed-no {
    font-weight: 600;
    margin-bottom: 6px;
  }
  .bed-student {
    color: #67c23a;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .bed-empty {
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }
}
</style>
