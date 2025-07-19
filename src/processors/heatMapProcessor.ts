import { App } from 'obsidian';

interface HeatMapData {
  date: string;
  count: number;
}

export class HeatMapProcessor {
  constructor(
    private app: App
  ) {}

  async processNotes(): Promise<HeatMapData[]> {
    const files = this.app.vault.getMarkdownFiles();
    const heatMapData = new Map<string, number>();
    
    // 获取日期范围
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // 今天
    const startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()); // 去年的今天

    // 初始化所有日期的计数为0
    for (let d = new Date(startDate); d <= targetDate; d.setDate(d.getDate() + 1)) {
      const dateStr = this.formatDate(d);
      heatMapData.set(dateStr, 0);
    }

    // 统计每个文件的修改日期
    for (const file of files) {
      const mtime = new Date(file.stat.mtime);
      if (mtime >= startDate && mtime <= targetDate) {
        const dateStr = this.formatDate(mtime);
        const count = heatMapData.get(dateStr) || 0;
        heatMapData.set(dateStr, count + 1);
      }
    }

    // 转换为数组格式并按日期排序
    return Array.from(heatMapData.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, count]) => ({
        date,
        count
      }));
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}