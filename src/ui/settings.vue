<template>
  <div class="vertical-tab-container">
    <div class="vertical-tab-nav">
      <div class="vertical-tab-item" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">
        设置
      </div>
      <div class="vertical-tab-item" :class="{ active: activeTab === 'history' }" @click="activeTab = 'history'">
        发布历史
      </div>
    </div>

    <div class="vertical-tab-content">
      <!-- 设置页面 -->
      <div v-show="activeTab === 'settings'">
        <h2>笔记卡片设置</h2>
  <!-- 图片来源 -->
  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">封面图片来源</div>
      <div class="setting-item-description">
        选择笔记卡片中封面显示的图片来源
      </div>
    </div>
    <div class="setting-item-control">
      <select v-model="settings.imageSource">
        <option value="none">不显示图片</option>
        <option value="local">本地附件文件夹</option>
        <option value="api">网络图片API</option>
      </select>
    </div>
  </div>

  <!-- 图片尺寸 -->
  <div class="setting-item" v-if="settings.imageSource !== 'none'">
    <div class="setting-item-info">
      <div class="setting-item-name">封面图片尺寸</div>
      <div class="setting-item-description">
        设置笔记卡片中显示的封面图片尺寸
      </div>
    </div>
    <div class="setting-item-control">
      <div class="size-inputs">
        <div class="size-input-group">
          <label>宽度</label>
          <input
            type="number"
            v-model="settings.imageWidth"
            placeholder="200"
            min="50"
            max="800"
          />
          <span>px</span>
        </div>
        <div class="size-input-group">
          <label>高度</label>
          <input
            type="number"
            v-model="settings.imageHeight"
            placeholder="200"
            min="50"
            max="800"
          />
          <span>px</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 附件文件夹路径 -->
  <div class="setting-item" v-if="settings.imageSource === 'local'">
    <div class="setting-item-info">
      <div class="setting-item-name">附件文件夹路径</div>
      <div class="setting-item-description">
        指定包含图片的附件文件夹路径（相对于vault根目录）
      </div>
    </div>
    <div class="setting-item-control">
      <input
        type="text"
        v-model="settings.attachmentFolderPath"
        placeholder="例如：attachments/images"
      />
    </div>
  </div>

  <!-- 封面图片来源地址 -->
  <div class="setting-item" v-if="settings.imageSource === 'api'">
    <div class="setting-item-info">
      <div class="setting-item-name">封面图片来源地址</div>
      <div class="setting-item-description">
        输入返回随机图片的API地址
      </div>
    </div>
    <div class="setting-item-control">
      <input
        type="text"
        v-model="settings.imageApiUrl"
        placeholder="例如：https://picsum.photos/200"
      />
    </div>
  </div>

  <h2>热力图设置</h2>
  <!-- 活跃度阈值 -->
  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">活跃度阈值</div>
      <div class="setting-item-description">
        设置不同活跃度等级的阈值（修改次数）
      </div>
    </div>
  </div>
  <div class="threshold-container">
    <div class="threshold-inputs">
      <div class="threshold-input-group" v-for="(threshold, index) in settings.heatMapThresholds" :key="index">
        <label>等级{{ index + 1 }}</label>
        <input
          type="number"
          v-model="settings.heatMapThresholds[index]"
          :placeholder="threshold.toString()"
          min="0"
        />
        <span>次</span>
      </div>
    </div>
  </div>

  <!-- 活跃度颜色 -->
  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">活跃度颜色</div>
      <div class="setting-item-description">
        设置不同活跃度等级的颜色
      </div>
    </div>
  </div>
   <div class="threshold-container">
      <div class="color-inputs">
        <div class="color-input-group" v-for="(color, index) in settings.heatMapColors" :key="index">
          <label>等级{{ index }}</label>
          <input
            type="color"
            v-model="settings.heatMapColors[index]"
          />
        </div>
      </div>
    </div>

  <h2>Halo 博客设置</h2>
  
  <!-- Halo 连接状态 -->
  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">Halo 博客连接状态</div>
      <div class="setting-item-description">
        {{ haloConnectionStatus }}
      </div>
    </div>
    <div class="setting-item-control">
      <button @click="openHaloConfig">配置</button>
    </div>
  </div>

  <!-- Halo 配置概览 -->
  <div class="setting-item" v-if="settings.haloUrl && settings.haloToken">
    <div class="setting-item-info">
      <div class="setting-item-name">当前配置</div>
      <div class="setting-item-description">
        <div class="halo-overview">
          <div><strong>博客地址:</strong> {{ settings.haloUrl }}</div>
          <div><strong>访问令牌:</strong> {{ maskedToken }}</div>
          <div v-if="settings.haloDefaultCategory"><strong>默认分类:</strong> {{ settings.haloDefaultCategory }}</div>
          <div v-if="settings.haloDefaultTags.length > 0"><strong>默认标签:</strong> {{ settings.haloDefaultTags.join(', ') }}</div>
          <div><strong>自动发布:</strong> {{ settings.haloAutoPublish ? '是' : '否' }}</div>
        </div>
      </div>
    </div>
    <div class="setting-item-control">
      <button @click="testHaloConnection">测试连接</button>
    </div>
  </div>

  <h2>文章归档设置</h2>
  
  <!-- 启用归档 -->
  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">启用文章归档</div>
      <div class="setting-item-description">
        发布文章后，将文章复制到指定路径作为归档版本
      </div>
    </div>
    <div class="setting-item-control">
      <input
        type="checkbox"
        v-model="settings.enableArchive"
      />
    </div>
  </div>

  <!-- 归档文件夹路径 -->
  <div class="setting-item" v-if="settings.enableArchive">
    <div class="setting-item-info">
      <div class="setting-item-name">归档文件夹路径</div>
      <div class="setting-item-description">
        指定归档文件的保存路径（相对于vault根目录）
      </div>
    </div>
    <div class="setting-item-control">
      <input
        type="text"
        v-model="settings.archiveFolderPath"
        placeholder="例如：Archives"
      />
    </div>
  </div>
  <h2>图片上传设置</h2>
  
  <!-- 又拍云配置 -->
  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">又拍云存储</div>
      <div class="setting-item-description">
        配置又拍云存储用于上传图片
      </div>
    </div>
    <div class="setting-item-control">
      <button @click="openUpyunConfig">配置</button>
    </div>
  </div>
  
  <h2>高级设置</h2>
  
  <!-- 调试模式 -->
  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">启用调试模式</div>
      <div class="setting-item-description">
        启用后将显示更详细的日志信息，有助于排查问题
      </div>
    </div>
    <div class="setting-item-control">
      <input
        type="checkbox"
        v-model="settings.debugMode"
      />
    </div>
  </div>
  
  <!-- 日志设置 -->
  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">启用日志</div>
      <div class="setting-item-description">
        是否在控制台输出插件日志信息
      </div>
    </div>
    <div class="setting-item-control">
      <input
        type="checkbox"
        v-model="settings.enableLogging"
      />
    </div>
  </div>
  
  <!-- 日志级别 -->
  <div class="setting-item" v-if="settings.enableLogging">
    <div class="setting-item-info">
      <div class="setting-item-name">日志级别</div>
      <div class="setting-item-description">
        设置日志输出的详细程度
      </div>
    </div>
    <div class="setting-item-control">
      <select v-model="settings.logLevel">
        <option value="debug">调试 (Debug)</option>
        <option value="info">信息 (Info)</option>
        <option value="warn">警告 (Warn)</option>
        <option value="error">错误 (Error)</option>
      </select>
    </div>
  </div>
  
  <!-- 保存按钮 -->
  <div class="setting-item">
    <div class="setting-item-control">
      <button class="mod-cta" @click="saveSettings">保存设置</button>
    </div>
  </div>
</div>
      <!-- 历史记录页面 -->
      <div v-show="activeTab === 'history'">
        <HistoryTab :plugin="plugin" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import type { PropType } from 'vue';
import type MyPlugin from '../starterIndex';
import HistoryTab from './history-tab.vue';

const props = defineProps({
  plugin: {
    type: Object as PropType<MyPlugin>,
    required: true
  }
});

const settings = ref(props.plugin.settings);
const activeTab = ref('settings');

// Halo 连接状态
const haloConnectionStatus = computed(() => {
  if (settings.value.haloUrl && settings.value.haloToken) {
    return `已配置 - ${settings.value.haloUrl}`;
  }
  return '未配置';
});

// 隐藏的访问令牌
const maskedToken = computed(() => {
  if (settings.value.haloToken && settings.value.haloToken.length > 10) {
    return settings.value.haloToken.substring(0, 10) + '...';
  }
  return settings.value.haloToken;
});

// 打开 Halo 配置弹窗
const openHaloConfig = () => {
  // 通过插件实例访问 HaloConfigModal
  const HaloConfigModal = (window as any).HaloConfigModal;
  if (HaloConfigModal) {
    new HaloConfigModal(props.plugin.app, props.plugin).open();
  } else {
    new Notice('Halo 配置功能暂时不可用');
  }
};

const openUpyunConfig = () => {
  const UpyunConfigModal = (window as any).UpyunConfigModal;
  if (UpyunConfigModal) {
    const modal = new UpyunConfigModal(props.plugin.app, props.plugin);
    // 在Vue 3中，我们通过props和emit来处理事件
    // 设置将在upyun-config-modal组件中通过emit更新
    modal.open();
  } else {
    new Notice('又拍云配置功能暂时不可用');
  }
};

const testUpyunConnection = async () => {
  if (!settings.value.upyunBucket || !settings.value.upyunOperator || !settings.value.upyunPassword) {
    new Notice('请先完成又拍云配置');
    return;
  }

  try {
    await props.plugin.testUpyunConnection();
    new Notice('又拍云连接测试成功！');
  } catch (error) {
    console.error('又拍云连接测试失败:', error);
    new Notice(`又拍云连接测试失败: ${error.message}`);
  }
};

// 测试 Halo 连接
const testHaloConnection = async () => {
  if (!settings.value.haloUrl || !settings.value.haloToken) {
    new Notice('请先配置 Halo 地址和访问令牌');
    return;
  }

  try {
    const url = `${settings.value.haloUrl.replace(/\/$/, '')}/apis/content.halo.run/v1alpha1/posts?page=1&size=1`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.value.haloToken}`
      }
    });

    if (response.ok) {
      new Notice('连接测试成功！');
    } else {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    console.error('连接测试失败:', error);
    new Notice(`连接测试失败: ${error.message}`);
  }
};

const saveSettings = async () => {
  await props.plugin.saveSettings();
  new Notice('设置已保存');
};

watch(
  () => settings.value,
  () => {
    Object.assign(props.plugin.settings, settings.value);
  },
  { deep: true }
);
</script>

<style>
.setting-item {
  padding: 18px 0;
  border-top: 1px solid var(--background-modifier-border);
}

.setting-item:first-child {
  border-top: none;
}

.setting-item-info {
  margin-bottom: 12px;
}

.setting-item-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.setting-item-description {
  color: var(--text-muted);
  font-size: 14px;
}

.setting-item-control {
  display: flex;
  gap: 8px;
}

.halo-overview {
  background-color: var(--background-secondary);
  padding: 12px;
  border-radius: 6px;
  margin-top: 8px;
}

.halo-overview div {
  margin-bottom: 6px;
}

.halo-overview div:last-child,
.upyun-overview div:last-child {
  margin-bottom: 0;
}

.halo-overview strong,
.upyun-overview strong {
  color: var(--text-accent);
  margin-right: 8px;
}

.upyun-overview {
  background-color: var(--background-secondary);
  padding: 10px;
  border-radius: 4px;
  margin-top: 8px;
}

.setting-item-control input[type="text"],
.setting-item-control select {
  width: 100%;
  border-radius: 4px;
  background-color: var(--background-primary);
  color: var(--text-normal);
}

.setting-item-control button {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
}

.setting-item-control button.mod-cta {
  background-color: var(--interactive-accent);
  color: var(--text-on-accent);
}

.size-inputs {
  display: flex;
  gap: 16px;
  width: 100%;
}

.size-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.size-input-group label {
  font-size: 14px;
  color: var(--text-muted);
}

.size-input-group input[type="number"] {
  width: 80px;
  padding: 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  background-color: var(--background-primary);
  color: var(--text-normal);
}

.size-input-group span {
  font-size: 14px;
  color: var(--text-muted);
}

.threshold-container {
  padding: 12px 0;
}

.threshold-inputs {
  display: flex;
  flex-direction: row;
  gap: 8px;
  width: 100%;
}

.threshold-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.threshold-input-group label {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 30px;
  white-space: nowrap;
}

.threshold-input-group input[type="number"] {
  width: 40px;
  padding: 6px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  background-color: var(--background-primary);
  color: var(--text-normal);
}

.threshold-input-group span {
  font-size: 12px;
  color: var(--text-muted);
}

.color-inputs {
  display: flex;
  flex-direction: row;
  gap: 12px;
  width: 100%;
}

.color-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input-group label {
  font-size: 14px;
  color: var(--text-muted);
  min-width: 40px;
}

.color-input-group input[type="color"] {
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 0;
  cursor: pointer;
}

.color-input-group input[type="text"] {
  width: 200px;
  padding: 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  background-color: var(--background-primary);
  color: var(--text-normal);
}
/* 垂直标签页样式 */
.vertical-tab-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  margin-top: 20px;
}

.vertical-tab-nav {
  display: flex;
  gap: 10px;
  border-bottom: 2px solid var(--background-modifier-border);
  padding: 0 48px;
  margin-bottom: 20px;
}

.vertical-tab-item {
  padding: 8px 16px;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-muted);
  margin-bottom: -2px;
  border: 2px solid transparent;
}

.vertical-tab-item:hover {
  color: var(--text-normal);
  border-bottom-color: var(--background-modifier-border);
}

.vertical-tab-item.active {
  color: var(--text-accent);
  border-bottom-color: var(--text-accent);
  background-color: var(--background-primary);
}

.vertical-tab-content {
  flex: 1;
  min-width: 0;
  padding: 32px 48px 64px 48px;
}

.vertical-tab-content h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.5em;
  color: var(--text-normal);
}
</style>
