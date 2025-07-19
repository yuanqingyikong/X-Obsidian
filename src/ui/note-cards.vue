<template>
  <div class="note-cards-container">
    <div class="note-cards-header">
      <h2>笔记列表</h2>
      <div class="note-cards-filter">
        <input
          type="text"
          v-model="filterText"
          placeholder="搜索笔记..."
          class="note-cards-search"
        />
        <select v-model="sortBy" class="note-cards-sort">
          <option value="mtime-desc">最近修改</option>
          <option value="mtime-asc">最早修改</option>
          <option value="title-asc">标题升序</option>
          <option value="title-desc">标题降序</option>
        </select>
        <select v-model="pageSize" class="note-cards-pagesize">
          <option :value="10">10条/页</option>
          <option :value="20">20条/页</option>
          <option :value="50">50条/页</option>
        </select>
      </div>
    </div>
    <div class="note-cards-grid">
      <div v-for="note in displayNotes" :key="note.path" class="note-card" @click="openNote(note)">
        <div class="note-card-title">{{ note.basename }}</div>
        <div class="note-card-image">
          <template v-if="settings?.imageSource === 'none'">
            <svg viewBox="0 0 100 100" class="placeholder-image">
              <rect width="100" height="100" />
            </svg>
          </template>
          <template v-else>
            <img 
              :src="note.imageUrl" 
              class="note-card-img" 
              alt="笔记图片"
              :style="{
                width: settings?.imageWidth ? `${settings.imageWidth}px` : '200px',
                height: settings?.imageHeight ? `${settings.imageHeight}px` : '200px',
                objectFit: 'cover'
              }"
            />
          </template>
        </div>
        <div class="note-card-content">
          <div class="note-card-excerpt">{{ filterChineseText(note.excerpt) }}</div>
        </div>
      </div>
    </div>
    <div class="note-cards-pagination" v-if="totalPages > 1">
      <button 
        class="pagination-btn" 
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        上一页
      </button>
      <span class="pagination-info">{{ currentPage }} / {{ totalPages }}</span>
      <button 
        class="pagination-btn" 
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, computed } from 'vue';
import { TFile, App } from 'obsidian';
import { NoteCardsProcessor } from '@/processors/noteCardsProcessor';

const props = defineProps<{
  app: App;
  file: TFile;
  settings?: {
    imageSource: string;
    attachmentFolderPath: string;
    imageApiUrl: string;
    imageWidth?: number;
    imageHeight?: number;
  };
}>();

interface NoteInfo {
  path: string;
  basename: string;
  excerpt: string;
  stat: {
    mtime: number;
  };
  frontmatter?: {
    tags?: string[];
  };
  imageUrl?: string;
}

const notes = ref<NoteInfo[]>([]);
const filterText = ref('');
const sortBy = ref('mtime-desc');
const currentPage = ref(1);
const pageSize = ref(20);
const processor = new NoteCardsProcessor(props.app, props.settings || {
  imageSource: 'none',
  attachmentFolderPath: '',
  imageApiUrl: '',
  imageWidth: 200,
  imageHeight: 200
});

// 获取随机图片
const getRandomImage = () => {
  if (!props.settings) return null;

  switch (props.settings.imageSource) {
    case 'local': {
      if (!props.settings.attachmentFolderPath) return null;
      const attachmentFolder = props.app.vault.getAbstractFileByPath(props.settings.attachmentFolderPath);
      if (!attachmentFolder) return null;

      const files = props.app.vault.getFiles()
        .filter(file => {
          const isImage = file.extension.toLowerCase().match(/^(jpg|jpeg|png|gif|svg)$/);
          const isInFolder = file.path.startsWith(props.settings?.attachmentFolderPath || '');
          return isImage && isInFolder;
        });

      if (files.length === 0) return null;
      const randomFile = files[Math.floor(Math.random() * files.length)];
      // 添加随机参数以避免缓存
      const resourcePath = props.app.vault.getResourcePath(randomFile);
      const separator = resourcePath.includes('?') ? '&' : '?';
      return `${resourcePath}${separator}random=${Math.random()}`;
    }
    case 'api': {
      if (!props.settings.imageApiUrl) return null;
      // 使用更独特的随机参数
      const timestamp = Date.now();
      const random = Math.random();
      const separator = props.settings.imageApiUrl.includes('?') ? '&' : '?';
      return `${props.settings.imageApiUrl}${separator}t=${timestamp}&r=${random}`;
    }
    default:
      return null;
  }
};

// 过滤出中文文本
const filterChineseText = (text: string) => {
  const chineseRegex = /[\u4e00-\u9fa5]+/g;
  const matches = text.match(chineseRegex);
  return matches ? matches.join('') : '';
};

const filteredNotes = computed(() => {
  let filtered = notes.value;
  
  // 应用搜索过滤
  if (filterText.value) {
    const searchText = filterText.value.toLowerCase();
    filtered = filtered.filter(note => 
      note.basename.toLowerCase().includes(searchText) ||
      note.excerpt.toLowerCase().includes(searchText)
    );
  }
  
  // 应用排序
  const [field, order] = sortBy.value.split('-');
  filtered.sort((a, b) => {
    let aVal = field === 'mtime' ? a.stat.mtime : a.basename;
    let bVal = field === 'mtime' ? b.stat.mtime : b.basename;
    
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    
    if (order === 'desc') {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    } else {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }
  });
  
  return filtered;
});

const totalPages = computed(() => 
  Math.ceil(filteredNotes.value.length / pageSize.value)
);

const displayNotes = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  const pagedNotes = filteredNotes.value.slice(start, end);
  // 为每个笔记重新生成随机图片
  return pagedNotes.map(note => ({
    ...note,
    imageUrl: getRandomImage()
  }));
});

const openNote = (note: NoteInfo) => {
  const file = props.app.vault.getAbstractFileByPath(note.path);
  if (file instanceof TFile) {
    const leaf = props.app.workspace.getLeaf();
    leaf.openFile(file);
  }
};

const updateNotes = async () => {
  const result = await processor.processFile(props.file);
  notes.value = result.notes;
  currentPage.value = 1; // 重置页码
};

onMounted(() => {
  updateNotes();
});

watch(() => props.file, () => {
  updateNotes();
});

// 当筛选条件改变时，重置页码
watch([filterText, sortBy, pageSize], () => {
  currentPage.value = 1;
});
</script>

<style>
.note-cards-container {
  padding: 20px;
}

.note-cards-header {
  margin-bottom: 20px;
}

.note-cards-filter {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.note-cards-search,
.note-cards-sort,
.note-cards-pagesize {
  padding: 6px 10px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  background: var(--background-primary);
  color: var(--text-normal);
}

.note-cards-search {
  flex: 1;
}

.note-cards-sort,
.note-cards-pagesize {
  min-width: 120px;
}

.note-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.note-cards-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--background-modifier-border);
}

.pagination-btn {
  padding: 6px 12px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  background: var(--background-primary);
  color: var(--text-normal);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--background-modifier-hover);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  color: var(--text-muted);
  font-size: 0.9em;
}

.note-card {
  background: var(--background-primary-alt);
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 200px;
}

.note-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.note-card-title {
  font-size: 1.1em;
  font-weight: 600;
  color: var(--text-normal);
  text-align: center;
  padding-bottom: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--background-modifier-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-card-image {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
  width: 100%;
  border-radius: 2px;
  overflow: hidden;
}

.placeholder-image {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
}

.placeholder-image rect {
  fill: var(--text-muted);
  opacity: 0.2;
  rx: 8;
  ry: 8;
}

.note-card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.note-card-excerpt {
  font-size: 0.9em;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}
</style>