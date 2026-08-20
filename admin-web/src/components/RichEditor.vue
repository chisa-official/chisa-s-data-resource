<template>
  <div class="rich-editor" :class="{ disabled: disabled }">
    <Toolbar v-if="!disabled" :editor="editorRef" :defaultConfig="toolbarConfig" mode="default" />
    <Editor
      :style="{ height: height, overflowY: 'hidden' }"
      v-model="valueHtml"
      :defaultConfig="editorConfig"
      mode="default"
      @onCreated="handleCreated"
      @onChange="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onBeforeUnmount, watch } from 'vue';
// @ts-ignore - wangeditor 无类型声明
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import '@wangeditor/editor/dist/css/style.css';

const props = withDefaults(defineProps<{
  modelValue?: string;
  height?: string;
  disabled?: boolean;
  placeholder?: string;
}>(), {
  modelValue: '',
  height: '300px',
  disabled: false,
  placeholder: '请输入内容...',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const editorRef = shallowRef();
const valueHtml = ref(props.modelValue);

watch(() => props.modelValue, (val) => {
  if (val !== valueHtml.value) valueHtml.value = val;
});

const toolbarConfig = {
  excludeKeys: ['group-video', 'fullScreen'],
};

const editorConfig = {
  placeholder: props.placeholder,
  readOnly: props.disabled,
  MENU_CONF: {},
};

function handleCreated(editor: any): void {
  editorRef.value = editor;
}

function handleChange(editor: any): void {
  emit('update:modelValue', editor.getHtml());
}

onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor) editor.destroy();
});
</script>

<style scoped lang="scss">
.rich-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  :deep(.w-e-toolbar) {
    border-bottom: 1px solid var(--el-border-color);
  }
  :deep(.w-e-text-container) {
    background: #fff;
  }
}
</style>
