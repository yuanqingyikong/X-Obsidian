<template>
  <div class="history-tab">
    <div class="history-header">
      <h2>发布历史记录</h2>
      <div class="history-actions">
        <button class="mod-warning" @click="confirmClearHistory" v-if="history.length > 0">
          清除历史记录
        </button>
      </div>
    </div>

    <div class="history-content">
      <div class="history-list" v-if="history.length > 0">
        <div v-for="(record, index) in history" :key="index" class="history-item" :class="{ 'success': record.success }">
          <div class="history-item-header">
            <span class="file-name">{{ record.fileName }}</span>
            <span class="publish-time">{{ formatTime(record.publishTime) }}</span>
          </div>
          <div class="history-item-content">
            <div class="post-name">{{ record.postName }}</div>
            <div v-if="record.error" class="error-message">{{ record.error }}</div>
            <div class="publish-status">
              <span :class="['status-badge', record.success ? 'success' : 'failed']">
                {{ record.success ? '发布成功' : '发布失败' }}
              </span>
              <span v-if="record.isUpdate" class="update-badge">更新</span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-history">
        暂无发布记录
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import type { PropType } from 'vue';
import type { PublishHistory } from '../starterIndex';
import { Notice } from 'obsidian';

const props = defineProps({
  plugin: {
    type: Object as PropType<any>,
    required: true
  }
});

const history = ref<PublishHistory[]>(props.plugin.getPublishHistory());

// 格式化时间
const formatTime = (timeStr: string) => {
  try {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return timeStr;
  }
};

// 确认清除历史记录
const confirmClearHistory = () => {
  const confirmMessage = '确定要清除所有发布历史记录吗？此操作不可撤销。';
  if (confirm(confirmMessage)) {
    props.plugin.clearPublishHistory();
    history.value = [];
    new Notice('发布历史记录已清除');
  }
};
</script>

<style>
.history-tab {
  padding: 0 10px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.history-header h2 {
  margin: 0;
}

.history-actions {
  display: flex;
  gap: 10px;
}

.history-content {
  max-width: 800px;
  margin: 0 auto;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  background-color: var(--background-secondary);
  border-radius: 6px;
  padding: 12px;
  border-left: 3px solid var(--text-muted);
  transition: all 0.2s ease;
}

.history-item:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.history-item.success {
  border-left-color: var(--interactive-accent);
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.file-name {
  font-weight: 500;
  color: var(--text-normal);
}

.publish-time {
  font-size: 12px;
  color: var(--text-muted);
}

.history-item-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.post-name {
  color: var(--text-muted);
  font-size: 14px;
}

.error-message {
  color: var(--text-error);
  font-size: 14px;
  margin-top: 4px;
  padding: 4px 8px;
  background-color: var(--background-modifier-error);
  border-radius: 4px;
}

.publish-status {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background-color: var(--interactive-accent);
  color: var(--text-on-accent);
}

.status-badge.failed {
  background-color: var(--text-error);
  color: white;
}

.update-badge {
  background-color: var(--text-muted);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.empty-history {
  text-align: center;
  color: var(--text-muted);
  padding: 40px 20px;
  background-color: var(--background-secondary);
  border-radius: 6px;
  font-size: 16px;
}

button.mod-warning {
  background-color: var(--text-error);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

button.mod-warning:hover {
  background-color: var(--text-error-hover);
}
</style>