import { useTranslation } from 'react-i18next';
import { IconActivity, IconCpu, IconServer } from './Icons';
import type { GpuInfo, SystemStatsState } from './useSystemStats';
import { MetricCard, GpuCard, formatGiga } from './components/MetricCard';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

interface PerformanceMonitorProps {
  stats: SystemStatsState;
  compact?: boolean;
}

export function PerformanceMonitor({ stats, compact = false }: PerformanceMonitorProps) {
  const { t } = useTranslation();
  const { current, history, error, loading } = stats;
  const unit = t('perf.unit');

  if (loading && !current) {
    return (
      <div className="perf-loading">
        <span className="mono">{t('common.loading')}</span>
      </div>
    );
  }

  if (error && !current) return <p className="logs-error">{t('perf.error')}</p>;
  if (!current) return null;

  const cpuHistory = history.map((s) => s.cpuPercent);
  const memHistory = history.map((s) => s.memPercent);
  const gpus = current.gpus || [];
  const gpuHistories: number[][] = gpus.map((_, idx) =>
    history.map((s) => s.gpus?.[idx]?.utilization).filter((v): v is number => typeof v === 'number'),
  );

  if (compact) {
    return (
      <div className="perf-strip">
        <div className="perf-strip-item">
          <IconCpu width={14} height={14} />
          <span className="perf-strip-label">{t('perf.cpu')}</span>
          <div className="perf-bar-track-sm">
            <div className="perf-bar-fill" style={{ width: `${current.cpuPercent}%` }} />
          </div>
          <span className="perf-strip-val">{current.cpuPercent.toFixed(0)}%</span>
        </div>
        <div className="perf-strip-item">
          <IconServer width={14} height={14} />
          <span className="perf-strip-label">{t('perf.memory')}</span>
          <span className="perf-strip-detail">({formatGiga(current.memUsed, unit)}/{formatGiga(current.memTotal, unit)})</span>
          <div className="perf-bar-track-sm">
            <div className="perf-bar-fill" style={{ width: `${current.memPercent}%` }} />
          </div>
          <span className="perf-strip-val">{current.memPercent.toFixed(0)}%</span>
        </div>
        {gpus.slice(0, 1).map((gpu: GpuInfo, i: number) => (
          <div className="perf-strip-item" key={i}>
            <IconActivity width={14} height={14} />
            <span className="perf-strip-label">{t('perf.gpu')}</span>
            <div className="perf-bar-track-sm">
              <div className="perf-bar-fill" style={{ width: `${gpu.utilization}%` }} />
            </div>
            <span className="perf-strip-val">{gpu.utilization.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <h2 className="perf-title">{t('perf.title')}</h2>
      <p className="perf-subtitle">{t('perf.subtitle')}</p>

      <div className="perf-grid">
        <MetricCard
          icon={<IconCpu width={18} height={18} />}
          label={t('perf.cpu')}
          percent={current.cpuPercent}
          detail={t('perf.cores', { count: current.cores })}
          history={cpuHistory}
        />
        <MetricCard
          icon={<IconServer width={18} height={18} />}
          label={t('perf.memory')}
          percent={current.memPercent}
          detail={`(${formatGiga(current.memUsed, unit)}/${formatGiga(current.memTotal, unit)})`}
          history={memHistory}
        />
        {gpus.map((gpu: GpuInfo, idx: number) => (
          <GpuCard key={idx} gpu={gpu} history={gpuHistories[idx] || []} />
        ))}
      </div>

      <div className="perf-meta-row">
        <div className="perf-meta-item">
          <span className="perf-meta-label">{t('perf.uptime')}</span>
          <span className="perf-meta-value">{formatUptime(current.uptime)}</span>
        </div>
        {current.hostname && (
          <div className="perf-meta-item">
            <span className="perf-meta-label">{t('perf.host')}</span>
            <span className="perf-meta-value">{current.hostname}</span>
          </div>
        )}
      </div>
    </>
  );
}
