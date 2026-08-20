<template>
  <el-upload
    :action="uploadUrl"
    :headers="headers"
    :accept="accept"
    :limit="maxCount"
    :file-list="fileList"
    :list-type="listType"
    :before-upload="beforeUpload"
    :on-success="onSuccess"
    :on-remove="onRemove"
    :on-exceed="onExceed"
    :on-error="onError"
    :drag="drag"
    multiple
    class="file-uploader"
    :class="{ 'file-uploader--drag': drag, 'file-uploader--picture-card': listType === 'picture-card' }"
  >
    <template v-if="listType === 'picture-card'">
      <el-icon><Plus /></el-icon>
    </template>
    <template v-else-if="drag">
      <div class="file-uploader__drag-inner">
        <el-icon class="file-uploader__drag-icon" :size="40"><Upload /></el-icon>
        <div class="file-uploader__drag-text">
          <span class="file-uploader__drag-primary">点击上传，或将文件拖到此处</span>
          <span v-if="tip" class="file-uploader__drag-tip">{{ tip }}</span>
        </div>
      </div>
    </template>
    <template v-else>
      <el-button type="primary" :icon="Upload">点击上传</el-button>
      <template v-if="drag">
        <div class="el-upload__text">将文件拖到此处，或点击上传</div>
      </template>
    </template>
    <template #tip>
      <div class="file-uploader__tip">{{ tip }}</div>
    </template>
  </el-upload>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Upload } from '@element-plus/icons-vue';
import type { UploadFile, UploadFiles, UploadProps, UploadUserFile } from 'element-plus';

interface Props {
  /** 业务类型：avatar / leave_proof / notice_attach ... */
  bizType?: string;
  /** 接受的文件类型，如 'image/png,image/jpeg' */
  accept?: string;
  /** 最大文件大小 MB */
  maxSizeMB?: number;
  /** 最大数量 */
  maxCount?: number;
  /** 列表样式 */
  listType?: 'text' | 'picture' | 'picture-card';
  /** 拖拽上传 */
  drag?: boolean;
  /** 提示文字 */
  tip?: string;
  /** 已上传文件（v-model） */
  modelValue?: Array<{ id: string; filename: string; url: string; size?: number }>;
}

const props = withDefaults(defineProps<Props>(), {
  bizType: 'common',
  maxSizeMB: 10,
  maxCount: 5,
  listType: 'text',
  drag: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: Array<{ id: string; filename: string; url: string; size?: number }>): void;
}>();

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const uploadUrl = computed(() => `${baseURL}/shared/files/upload-multiple`);
const headers = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
}));

const fileList = ref<UploadUserFile[]>([]);

// 同步外部 modelValue 到内部 fileList
watch(
  () => props.modelValue,
  (val) => {
    if (!val) return;
    fileList.value = val.map((f, idx) => ({
      name: f.filename,
      url: f.url,
      uid: idx,
      status: 'success',
    }));
  },
  { immediate: true },
);

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const sizeMB = file.size / 1024 / 1024;
  if (sizeMB > props.maxSizeMB) {
    ElMessage.error(`文件大小不能超过 ${props.maxSizeMB}MB`);
    return false;
  }
  return true;
};

const uploadedItems: Array<{ id: string; filename: string; url: string; size?: number }> = [];

const onSuccess: UploadProps['onSuccess'] = (response: any, file: UploadFile) => {
  // 后端返回 { code, data: [{id, filename, url, size}, ...] }
  if (response.code !== 0) {
    ElMessage.error(response.message || '上传失败');
    return;
  }
  const arr = response.data || [];
  const item = arr[0] || arr;
  if (item && item.id) {
    uploadedItems.push(item);
    emit('update:modelValue', uploadedItems.slice());
  }
};

const onRemove: UploadProps['onRemove'] = (file: UploadFile, files: UploadFiles) => {
  const removed = uploadedItems.find((i) => i.filename === file.name);
  if (removed) {
    const idx = uploadedItems.indexOf(removed);
    if (idx >= 0) uploadedItems.splice(idx, 1);
    emit('update:modelValue', uploadedItems.slice());
  }
};

const onExceed: UploadProps['onExceed'] = () => {
  ElMessage.warning(`最多上传 ${props.maxCount} 个文件`);
};

const onError: UploadProps['onError'] = () => {
  ElMessage.error('上传失败，请重试');
};
</script>

<style scoped lang="scss">
.file-uploader {
  &__tip {
    color: $text-tertiary;
    font-size: $font-size-xs;
    margin-top: $space-2;
    line-height: $line-height-normal;
  }

  &--drag {
    :deep(.el-upload-dragger) {
      width: 100%;
      min-height: 160px;
      padding: $space-6;
      background: $bg-surface;
      border: 2px dashed $border-default;
      border-radius: $radius-xl;
      transition: all 0.2s;

      &:hover,
      &.is-dragover {
        border-color: $brand-primary;
        background: rgba(37, 99, 235, 0.02);
      }
    }
  }

  &__drag-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $space-3;
  }

  &__drag-icon {
    color: $brand-primary-lighter;
  }

  &__drag-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-1;
  }

  &__drag-primary {
    font-size: $font-size-base;
    color: $text-secondary;
    font-weight: $font-weight-medium;
  }

  &__drag-tip {
    font-size: $font-size-xs;
    color: $text-tertiary;
  }

  &--picture-card {
    :deep(.el-upload--picture-card) {
      border-color: $border-default;
      border-radius: $radius-lg;
      background: $bg-surface;
      color: $text-tertiary;
      transition: all 0.2s;

      &:hover {
        border-color: $brand-primary;
        color: $brand-primary;
        background: rgba(37, 99, 235, 0.04);
      }
    }

    :deep(.el-upload-list__item) {
      border-radius: $radius-lg;
      border-color: $border-light;
    }
  }

  // 文本列表缩略图样式
  :deep(.el-upload-list__item) {
    border-radius: $radius-md;
    transition: all 0.2s;

    &:hover {
      background: $bg-hover;
    }

    .el-upload-list__item-name {
      color: $text-secondary;
      font-size: $font-size-sm;

      &:hover {
        color: $brand-primary;
      }
    }
  }
}
</style>
