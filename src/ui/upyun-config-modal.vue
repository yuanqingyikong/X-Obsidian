<template>
  <div class="upyun-modal-container">
    <!-- 模态框头部 -->
    <div class="upyun-modal-header">
      <h2 class="upyun-modal-title">又拍云存储配置</h2>
    </div>

    <!-- 模态框内容 -->
    <div class="upyun-modal-content">
      <p class="upyun-modal-description">
        请配置您的又拍云存储信息。如果您还没有又拍云账号，请先注册并创建存储空间。
      </p>

      <!-- 配置表单 -->
      <div class="upyun-config-form">
        <!-- 存储空间 -->
        <div class="upyun-form-item">
          <label class="upyun-form-label">存储空间名称</label>
          <p class="upyun-form-description">您的又拍云存储空间名称</p>
          <input
            type="text"
            class="upyun-form-input"
            v-model="tempSettings.upyunBucket"
            placeholder="your-bucket-name"
            spellcheck="false"
          />
        </div>

        <!-- 操作员 -->
        <div class="upyun-form-item">
          <label class="upyun-form-label">操作员名称</label>
          <p class="upyun-form-description">用于访问存储空间的操作员账号</p>
          <input
            type="text"
            class="upyun-form-input"
            v-model="tempSettings.upyunOperator"
            placeholder="operator-name"
            spellcheck="false"
          />
        </div>

        <!-- 操作员密码 -->
        <div class="upyun-form-item">
          <label class="upyun-form-label">操作员密码</label>
          <p class="upyun-form-description">操作员的访问密码</p>
          <input
            type="password"
            class="upyun-form-input"
            v-model="tempSettings.upyunPassword"
            placeholder="operator-password"
            spellcheck="false"
          />
        </div>

        <!-- 加速域名 -->
        <div class="upyun-form-item">
          <label class="upyun-form-label">加速域名</label>
          <p class="upyun-form-description">存储空间绑定的域名，用于访问上传的图片</p>
          <input
            type="text"
            class="upyun-form-input"
            v-model="tempSettings.upyunDomain"
            placeholder="https://your-domain.com"
            spellcheck="false"
          />
        </div>
      </div>
    </div>

    <!-- 模态框底部按钮 -->
    <div class="upyun-modal-footer">
      <button class="upyun-btn upyun-btn-secondary" @click="testConnection">测试连接</button>
      <button class="upyun-btn upyun-btn-primary" @click="saveSettings">保存设置</button>
      <button class="upyun-btn upyun-btn-default" @click="closeModal">取消</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import type { PropType } from 'vue';
import type MyPlugin from '../starterIndex';
import { Notice } from 'obsidian';

const props = defineProps({
  plugin: {
    type: Object as PropType<MyPlugin>,
    required: true
  },
  onSettingsUpdate: {
    type: Function as PropType<(settings: any) => void>,
    required: true
  },
  onClose: {
    type: Function as PropType<() => void>,
    required: true
  }
});

const tempSettings = ref({
  upyunBucket: props.plugin.settings.upyunBucket || '',
  upyunOperator: props.plugin.settings.upyunOperator || '',
  upyunPassword: props.plugin.settings.upyunPassword || '',
  upyunDomain: props.plugin.settings.upyunDomain || ''
});

const saveSettings = async () => {
  // 验证必填字段
  if (!tempSettings.value.upyunBucket || !tempSettings.value.upyunOperator || 
      !tempSettings.value.upyunPassword || !tempSettings.value.upyunDomain) {
    new Notice('请填写完整的又拍云配置信息');
    return;
  }

  // 验证域名格式
  if (!tempSettings.value.upyunDomain.startsWith('http')) {
    new Notice('加速域名必须以 http:// 或 https:// 开头');
    return;
  }

  // 通过回调函数更新设置
  const newSettings = {
    ...props.plugin.settings,
    upyunBucket: tempSettings.value.upyunBucket,
    upyunOperator: tempSettings.value.upyunOperator,
    upyunPassword: tempSettings.value.upyunPassword,
    upyunDomain: tempSettings.value.upyunDomain
  };
  props.onSettingsUpdate(newSettings);

  new Notice('又拍云配置已保存');
  closeModal();
};

const testConnection = async () => {
  // 验证必填字段
  if (!tempSettings.value.upyunBucket || !tempSettings.value.upyunOperator || 
      !tempSettings.value.upyunPassword || !tempSettings.value.upyunDomain) {
    new Notice('请填写完整的又拍云配置信息');
    return;
  }

  // 验证域名格式
  if (!tempSettings.value.upyunDomain.startsWith('http')) {
    new Notice('加速域名必须以 http:// 或 https:// 开头');
    return;
  }

  // 临时应用新设置用于测试
  const testSettings = {
    ...props.plugin.settings,
    upyunBucket: tempSettings.value.upyunBucket,
    upyunOperator: tempSettings.value.upyunOperator,
    upyunPassword: tempSettings.value.upyunPassword,
    upyunDomain: tempSettings.value.upyunDomain
  };

  try {
    await props.plugin.testUpyunConnection(testSettings);
  } finally {
    // 不需要恢复原始设置，因为我们没有修改props
  }
};

const closeModal = () => {
  props.onClose();
};
</script>

<style scoped>
/* 又拍云模态框容器 */
.upyun-modal-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--background-primary);
  overflow: hidden;
}

/* 模态框头部 */
.upyun-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
}

.upyun-modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-normal);
}



/* 模态框内容 */
.upyun-modal-content {
  flex: 1;
  padding: 20px 24px;
  overflow: hidden;
}

.upyun-modal-description {
  margin: 0 0 16px 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.4;
}

/* 配置表单 */
.upyun-config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upyun-form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.upyun-form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-normal);
  margin: 0;
}

.upyun-form-description {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.4;
}

.upyun-form-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  background: var(--background-primary);
  color: var(--text-normal);
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.upyun-form-input:focus {
  outline: none;
  border-color: var(--interactive-accent);
  box-shadow: 0 0 0 2px var(--interactive-accent-hover);
}

.upyun-form-input::placeholder {
  color: var(--text-faint);
}

/* 模态框底部 */
.upyun-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
}

/* 按钮样式 */
.upyun-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.upyun-btn-default {
  background: var(--background-modifier-border);
  color: var(--text-normal);
}

.upyun-btn-default:hover {
  background: var(--background-modifier-hover);
}

.upyun-btn-secondary {
  background: var(--interactive-normal);
  color: var(--text-normal);
  border: 1px solid var(--background-modifier-border);
}

.upyun-btn-secondary:hover {
  background: var(--interactive-hover);
}

.upyun-btn-primary {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
}

.upyun-btn-primary:hover {
  background: var(--interactive-accent-hover);
}

.upyun-btn:active {
  transform: translateY(1px);
}

/* 响应式设计 */
@media (max-width: 600px) {
  .upyun-modal-container {
    max-width: 90vw;
    min-height: 70vh;
  }
  
  .upyun-modal-header,
  .upyun-modal-content,
  .upyun-modal-footer {
    padding-left: 16px;
    padding-right: 16px;
  }
  
  .upyun-modal-footer {
    flex-direction: column;
  }
  
  .upyun-btn {
    width: 100%;
  }
}
</style>