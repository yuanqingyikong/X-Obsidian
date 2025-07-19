<template>
  <div class="heat-map-container" :style="dynamicStyles">
    <div class="heat-map-header">
      <h2>笔记热力图</h2>
      <div class="heat-map-legend">
        <span class="legend-text">活跃度：</span>
        <div class="legend-items">
          <div class="legend-item" v-for="level in props.settings.heatMapColors.length" :key="level" :class="`level-${level - 1}`"></div>
        </div>
      </div>
    </div>
    <div class="heat-map-grid">
      <div class="month-labels">
        <div 
          v-for="month in displayMonths" 
          :key="month.text"
          class="month-label"
          :style="{ 
            gridColumnStart: month.startColumn,
            '--span': month.span 
          }"
        >
          {{ month.text }}
        </div>
      </div>
      <div class="heat-map-content">
        <div class="day-labels">
          <div class="day-label" v-for="(day, index) in ['一', '二', '三', '四', '五', '六', '日']" :key="day" :style="{ gridRow: index + 1 }">
            {{ day }}
          </div>
        </div>
        <div class="heat-map-cells">
          <div
            v-for="(cell, index) in displayCells"
            :key="index"
            class="heat-map-cell"
            :class="[`level-${getActivityLevel(cell.count)}`]"
            :style="{
              gridColumn: cell.column,
              gridRow: cell.row
            }"
            :title="cell.date ? `${formatDate(cell.date)}: ${cell.count} 次修改` : ''"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import type { App } from 'obsidian';
import { HeatMapProcessor } from '@/processors/heatMapProcessor';

const props = defineProps<{
  app: App;
  settings: {
    heatMapThresholds: number[];
    heatMapColors: string[];
  };
}>();

interface HeatMapCell {
  date: string;
  count: number;
  column: number;
  row: number;
}

interface MonthLabel {
  text: string;
  startColumn: number;
  span: number;
}

const cells = ref<HeatMapCell[]>([]);
const processor = new HeatMapProcessor(props.app);

// 格式化日期为 YYYY-MM-DD
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

// 获取今天（不含时间）
function getToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// 获取去年的今天（不含时间）
function getLastYearToday() {
  const today = getToday();
  return new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
}

// 向前调整到最近的周一（周一为每周第一天）
function adjustToPreviousMonday(date: Date): Date {
  const day = date.getDay();
  // 周日(0)向前推6天，其他天向前推 day 天
  const diff = day === 0 ? 6 : day;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff);
}

// 计算两个日期之间的周数差，周以周一为起点
function getWeekDiff(start: Date, end: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const startMonday = adjustToPreviousMonday(start);
  const endMonday = adjustToPreviousMonday(end);
  return Math.floor((endMonday.getTime() - startMonday.getTime()) / msPerWeek);
}

// 根据星期几返回对应行号（周一=1，周二=2，...，周日=7）
function getRowByWeekday(day: number): number {
  return day === 0 ? 7 : day;
}

const endDate = computed(() => getToday());

const startDate = computed(() => {
  const lastYearToday = getLastYearToday();
  return lastYearToday;
});

// 计算月份标签
const displayMonths = computed<MonthLabel[]>(() => {
  if (!cells.value.length) return [];

  const monthLabels: MonthLabel[] = [];
  const start = startDate.value;
  const end = endDate.value;

  // 按月份分组热力图单元格
  const cellsByMonth = new Map<string, HeatMapCell[]>();
  
  for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    const weekNumber = getWeekDiff(start, d);
    const cell = {
      date: `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`,
      count: 0,
      column: weekNumber + 1,
      row: getRowByWeekday(d.getDay())
    };
    
    if (!cellsByMonth.has(monthKey)) {
      cellsByMonth.set(monthKey, []);
    }
    cellsByMonth.get(monthKey)!.push(cell);
  }

  // 为每个月份创建标签
  cellsByMonth.forEach((cells, monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    const minColumn = Math.min(...cells.map(cell => cell.column));
    const maxColumn = Math.max(...cells.map(cell => cell.column));
    
    monthLabels.push({
      text: `${month + 1}月`,
      startColumn: minColumn,
      span: maxColumn - minColumn + 1
    });
  });

  // 按开始列排序
  return monthLabels.sort((a, b) => a.startColumn - b.startColumn);
});

// 计算热力图单元格数据
const displayCells = computed<HeatMapCell[]>(() => {
  if (!cells.value.length) return [];

  const result: HeatMapCell[] = [];
  const start = startDate.value;
  const end = endDate.value;

  const dateCountMap = new Map(cells.value.map(cell => [cell.date, cell.count]));

  for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    // 使用本地日期格式化，避免时区问题
    const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    const weekNumber = getWeekDiff(start, d);
    result.push({
      date: dateStr,
      count: dateCountMap.get(dateStr) || 0,
      column: weekNumber + 1,
      row: getRowByWeekday(d.getDay())
    });
  }

  return result;
});

// 根据修改次数返回活跃度等级 0-4
const getActivityLevel = (count: number) => {
  const thresholds = props.settings.heatMapThresholds;
  if (count === 0) return 0;
  
  for (let i = 0; i < thresholds.length; i++) {
    if (count <= thresholds[i]) {
      return i;
    }
  }
  
  return thresholds.length; // 超过最高阈值
};

// 动态生成颜色样式
const dynamicStyles = computed(() => {
  const styles: Record<string, string> = {};
  props.settings.heatMapColors.forEach((color, index) => {
    styles[`--level-${index}-color`] = color;
  });
  return styles;
});

onMounted(async () => {
  cells.value = await processor.processNotes();
});
</script>

<style>
.heat-map-container {
  padding: 20px;
  background: var(--background-primary);
  border-radius: 8px;
  width: 100%;
  box-sizing: border-box;
}

.heat-map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.heat-map-legend {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-text {
  font-size: 12px;
  color: var(--text-muted);
}

.legend-items {
  display: flex;
  gap: 2px;
}

.legend-item {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.heat-map-grid {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 10px;
}

.month-labels {
  display: grid;
  grid-template-columns: repeat(53, minmax(11px, 1fr));
  grid-template-rows: 1fr;
  padding-left: 30px;
  column-gap: 6px;
  margin-bottom: 4px;
}

.month-label {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  grid-row: 1;
  grid-column-end: span var(--span, 1);
}

.heat-map-content {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 1px;
}

.day-labels {
  display: grid;
  grid-template-rows: repeat(7, minmax(11px, 1fr));
  gap: 3px;
  align-items: center;
}

.day-label {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.heat-map-cells {
  display: grid;
  grid-template-columns: repeat(53, minmax(11px, 1fr));
  grid-auto-flow: dense;
  grid-template-rows: repeat(7, minmax(11px, 1fr));
  column-gap: 6px;
  row-gap: 6px;
}

.heat-map-cell {
  width: 100%;
  padding-bottom: 100%;
  position: relative;
  border-radius: 2px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.heat-map-cell:hover {
  /* transform: scale(1.2); */
  z-index: 10;
}

/* 活跃度颜色 */
.level-0 {
  background-color: var(--level-0-color, var(--background-modifier-border));
}

.level-1 {
  background-color: var(--level-1-color, #9be9a8);
}

.level-2 {
  background-color: var(--level-2-color, #40c463);
}

.level-3 {
  background-color: var(--level-3-color, #30a14e);
}

.level-4 {
  background-color: var(--level-4-color, #216e39);
}
</style>
