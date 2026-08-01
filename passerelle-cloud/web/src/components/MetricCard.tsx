import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IconActivity } from '../Icons';
import type { GpuInfo } from '../useSystemStats';

const GIB = 1024 * 1024 * 1024;

export function formatGiga(bytes: number, unit: string): string {
  if (!bytes || bytes <= 0) return `0${unit}`;
  const value = bytes / GIB;
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)}${unit}`;
}

interface SparklineProps {
  values: number[];
  color?: string;
}

function Sparkline({ values, color = '#4ade80' }: SparklineProps) {
  const width = 100;
  const height = 34;
  if (values.length < 2) return <div className="sparkline-empty" />;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - (Math.min(100, Math.max(0, v)) / 100) * height).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#grad-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  percent: number;
  detail: string;
  history: number[];
  color?: string;
}

export function MetricCard({ icon, label, percent, detail, history, color = '#4ade80' }: MetricCardProps) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div className="perf-card">
      <div className="perf-card-top">
        <div className="perf-card-head">
          <span className="perf-card-icon">{icon}</span>
          <div className="perf-card-titles">
            <span className="perf-card-label">{label}</span>
            <span className="perf-card-detail">{detail}</span>
          </div>
        </div>
        <span className="perf-card-value">{pct.toFixed(0)}%</span>
      </div>
      <Sparkline values={history} color={color} />
      <div className="perf-bar-track">
        <div className="perf-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function GpuCard({ gpu, history }: { gpu: GpuInfo; history: number[] }) {
  const { t } = useTranslation();
  const unit = t('perf.unit');
  return (
    <MetricCard
      icon={<IconActivity width={18} height={18} />}
      label={gpu.name}
      percent={gpu.utilization}
      detail={gpu.memTotal > 0 ? `(${formatGiga(gpu.memUsed, unit)}/${formatGiga(gpu.memTotal, unit)})` : ''}
      history={history}
    />
  );
}