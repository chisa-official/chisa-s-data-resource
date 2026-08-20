import * as echarts from 'echarts';

/**
 * 高校学生管理系统 ECharts 共享主题色板
 * 与 shared-web/styles/tokens.scss 保持一致
 */
export const eduChartPalette = [
  '#2563eb', // brand-primary
  '#10b981', // semantic-success
  '#f59e0b', // semantic-warning
  '#ef4444', // semantic-danger
  '#8b5cf6', // purple
  '#0ea5e9', // sky
];

export const eduChartColors = {
  primary: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  info: '#0ea5e9',
  gray: '#64748b',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  border: '#e2e8f0',
  splitLine: '#f1f5f9',
  surface: '#ffffff',
};

const eduTheme = {
  color: eduChartPalette,
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Helvetica, Arial, sans-serif",
  },
  title: {
    textStyle: {
      color: eduChartColors.textPrimary,
      fontSize: 16,
      fontWeight: 600,
    },
    subtextStyle: {
      color: eduChartColors.textSecondary,
      fontSize: 12,
    },
  },
  legend: {
    textStyle: {
      color: eduChartColors.textSecondary,
      fontSize: 12,
    },
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: eduChartColors.border,
    borderWidth: 1,
    textStyle: {
      color: '#334155',
      fontSize: 13,
    },
    extraCssText: 'box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); border-radius: 8px;',
  },
  categoryAxis: {
    axisLine: {
      lineStyle: {
        color: eduChartColors.border,
      },
    },
    axisTick: {
      show: false,
    },
    axisLabel: {
      color: eduChartColors.textSecondary,
      fontSize: 12,
    },
    splitLine: {
      show: false,
    },
  },
  valueAxis: {
    axisLine: {
      show: false,
    },
    axisTick: {
      show: false,
    },
    axisLabel: {
      color: eduChartColors.textSecondary,
      fontSize: 12,
    },
    splitLine: {
      lineStyle: {
        color: eduChartColors.splitLine,
        type: 'dashed',
      },
    },
  },
  bar: {
    itemStyle: {
      borderRadius: [4, 4, 0, 0],
    },
  },
  line: {
    smooth: true,
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: {
      width: 3,
    },
  },
  pie: {
    itemStyle: {
      borderColor: '#fff',
      borderWidth: 2,
      borderRadius: 6,
    },
  },
};

let registered = false;

export function registerEduTheme(): void {
  if (registered) return;
  echarts.registerTheme('edu', eduTheme);
  registered = true;
}

export default eduTheme;
