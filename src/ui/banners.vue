<template>
  <div v-if="isModal" class="banner-modal-content">
    <div class="banner-section">
      <h3>Banner 图片</h3>
      <div class="banner-input-group">
        <input 
          type="text" 
          v-model="localBannerData.banner" 
          placeholder="输入图片路径或URL"
          class="banner-input"
        />
        <button @click="selectLocalImage" class="banner-btn">选择本地图片</button>
      </div>
      
      <div v-if="localBannerData.banner" class="banner-preview">
        <img :src="getBannerUrl(localBannerData.banner)" alt="Banner preview" />
      </div>
    </div>

    <div class="banner-section">
      <h3>位置调整</h3>
      <div class="position-controls">
        <label>
          水平位置: {{ Math.round(localBannerData.banner_x * 100) }}%
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            v-model.number="localBannerData.banner_x"
          />
        </label>
        <label>
          垂直位置: {{ Math.round(localBannerData.banner_y * 100) }}%
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            v-model.number="localBannerData.banner_y"
          />
        </label>
      </div>
    </div>



    <div class="banner-actions">
      <button @click="saveBanner" class="banner-btn primary">保存</button>
      <button @click="cancelModal" class="banner-btn">取消</button>
    </div>

    <input 
      ref="fileInput" 
      type="file" 
      accept="image/*" 
      @change="handleFileSelect" 
      style="display: none;"
    />
  </div>

  <div v-else class="pixel-banner-display">
    <div 
      class="banner-image-container"
      :style="bannerImageStyle"
      @mouseenter="showControls = true"
      @mouseleave="showControls = false"
    >
      <img 
        :src="getBannerUrl(bannerData.banner)" 
        :style="imagePositionStyle"
        alt="Banner"
        class="banner-image"
      />
      
      <div v-if="showControls" class="banner-controls">
        <button @click="editBanner" class="control-btn" title="编辑Banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
        <button @click="removeBanner" class="control-btn" title="移除Banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>


    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { App, TFile } from 'obsidian'

interface BannerData {
  banner: string
  banner_x: number
  banner_y: number
  banner_lock: boolean
}

interface Props {
  app: App
  file: TFile
  bannerData?: BannerData
  modal?: any
  isModal?: boolean
  plugin?: any
}

const props = withDefaults(defineProps<Props>(), {
  isModal: false,
  bannerData: () => ({
    banner: '',
    banner_x: 0.5,
    banner_y: 0.5,
    banner_lock: false
  })
})

const showControls = ref(false)
const fileInput = ref<HTMLInputElement>()
const localBannerData = ref<BannerData>({ ...props.bannerData })

const bannerImageStyle = computed(() => ({
  height: '300px',
  width: '100%',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '8px',
  marginBottom: '20px'
}))

const imagePositionStyle = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  objectPosition: `${props.bannerData.banner_x * 100}% ${props.bannerData.banner_y * 100}%`
}))

function getBannerUrl(banner: string): string {
  if (!banner) return ''
  
  // 如果是URL，直接返回
  if (banner.startsWith('http://') || banner.startsWith('https://')) {
    return banner
  }
  
  // 如果是Obsidian内部链接格式 ![[filename]]
  if (banner.startsWith('![[') && banner.endsWith(']]')) {
    const filename = banner.slice(3, -2)
    const file = props.app.vault.getAbstractFileByPath(filename)
    if (file) {
      return props.app.vault.getResourcePath(file as TFile)
    }
  }
  
  // 如果是相对路径
  const file = props.app.vault.getAbstractFileByPath(banner)
  if (file) {
    return props.app.vault.getResourcePath(file as TFile)
  }
  
  return banner
}

function selectLocalImage() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    // 这里可以实现文件上传到vault的逻辑
    // 暂时使用文件名
    localBannerData.value.banner = file.name
  }
}

function editBanner() {
  // 触发编辑模式
  console.log('editBanner called', { plugin: props.plugin, file: props.file });
  
  if (props.plugin && props.file) {
    try {
      // 直接通过插件的命令系统调用
      const commands = (props.plugin as any).commands;
      if (commands && commands.length > 0) {
        const addBannerCommand = commands.find((cmd: any) => cmd.id === 'add-change-banner');
        if (addBannerCommand && addBannerCommand.callback) {
          addBannerCommand.callback();
          return;
        }
      }
      
      // 备用方案：通过app.commands调用
      const allCommands = (props.app as any).commands.commands;
      const pluginId = props.plugin.manifest?.id || 'obsidian-vue-starter';
      const commandId = `${pluginId}:add-change-banner`;
      
      if (allCommands[commandId]) {
        allCommands[commandId].callback();
        return;
      }
      
      // 最后的备用方案：显示提示
      new (props.app as any).Notice('请使用命令面板中的"添加/更改 Banner"命令');
      
    } catch (error) {
      console.error('Failed to execute edit banner command:', error);
      new (props.app as any).Notice('打开Banner设置失败: ' + error.message);
    }
  } else {
    console.log('Missing plugin or file', { plugin: !!props.plugin, file: !!props.file });
    new (props.app as any).Notice('无法打开Banner设置：缺少必要参数');
  }
}

function removeBanner() {
  // 触发移除命令
  if (props.plugin && props.file) {
    // 直接调用插件的removeBanner方法
    props.plugin.removeBanner(props.file);
  } else {
    // 备用方案：通过命令调用
    props.app.commands.executeCommandById('remove-banner');
  }
}

function saveBanner() {
  if (props.modal && props.modal.updateBanner) {
    props.modal.updateBanner(localBannerData.value)
  }
}

function cancelModal() {
  if (props.modal && props.modal.close) {
    props.modal.close()
  }
}

onMounted(() => {
  if (props.isModal && props.bannerData) {
    localBannerData.value = { ...props.bannerData }
  }
})
</script>

<style scoped>
.banner-modal-content {
  padding: 20px;
  max-width: 600px;
}

.banner-section {
  margin-bottom: 24px;
}

.banner-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-normal);
}

.banner-input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.banner-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  background: var(--background-primary);
  color: var(--text-normal);
  font-size: 14px;
}

.banner-input:focus {
  outline: none;
  border-color: var(--interactive-accent);
}

.banner-btn {
  padding: 8px 16px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  background: var(--background-secondary);
  color: var(--text-normal);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.banner-btn:hover {
  background: var(--background-modifier-hover);
}

.banner-btn.primary {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  border-color: var(--interactive-accent);
}

.banner-btn.primary:hover {
  background: var(--interactive-accent-hover);
}

.banner-preview {
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  overflow: hidden;
  max-height: 200px;
}

.banner-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.position-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.position-controls label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  color: var(--text-normal);
}

.position-controls input[type="range"] {
  width: 100%;
}

.banner-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* Banner Display Styles */
.pixel-banner-display {
  margin: 0 0 20px 0;
}

.banner-image-container {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.banner-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.banner-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.banner-image-container:hover .banner-controls {
  opacity: 1;
}

.control-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.05);
}


</style>