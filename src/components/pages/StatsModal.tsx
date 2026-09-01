import React, { useMemo } from 'react';
import { BarChart3, CheckCheck, X } from 'lucide-react';
import { SavedLink } from '../../../types';
import { domainOf } from '../../utils/urlUtils';
import { getReadLinks } from '../../utils/storage';
import { Button } from '../common';

interface StatsModalProps {
  isOpen: boolean;
  links: SavedLink[];
  onClose: () => void;
  onMarkAllRead: () => void;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // понедельник = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-center">
      <div className={`text-lg font-black leading-none ${accent || 'text-slate-800'}`}>{value}</div>
      <div className="text-[10px] text-slate-500 mt-1 leading-tight">{label}</div>
    </div>
  );
}

function Bars({ data, max }: { data: { label: string; count: number }[]; max: number }) {
  return (
    <div className="flex items-end gap-2 h-[64px] pt-1">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="flex-1 w-full flex items-end">
            <div
              className="w-full bg-indigo-500 rounded-t-md"
              style={{ height: item.count === 0 ? 3 : Math.max(8, (item.count / max) * 52) }}
              title={`${item.label}: ${item.count}`}
            />
          </div>
          <span className="text-[9px] text-slate-400 truncate w-full text-center">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, links, onClose, onMarkAllRead }) => {
  const stats = useMemo(() => {
    const catCount = new Map<string, number>();
    for (const l of links) {
      if (l.category) catCount.set(l.category, (catCount.get(l.category) || 0) + 1);
    }
    const topCategories = Array.from(catCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const domCount = new Map<string, number>();
    for (const l of links) {
      const d = domainOf(l.url);
      domCount.set(d, (domCount.get(d) || 0) + 1);
    }
    const topDomains = Array.from(domCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const now = new Date();
    const weeks: { label: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const wStart = startOfWeek(new Date(now.getTime() - i * WEEK_MS));
      const wEnd = wStart.getTime() + WEEK_MS;
      const count = links.filter((l) => {
        const t = new Date(l.date).getTime();
        return t >= wStart.getTime() && t < wEnd;
      }).length;
      weeks.push({ label: wStart.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), count });
    }
    const maxWeek = Math.max(1, ...weeks.map((w) => w.count));

    const read = getReadLinks();
    const readCount = links.filter((l) => read[l.url]).length;
    const unreadCount = links.length - readCount;

    const durations: number[] = [];
    for (const l of links) {
      const readAt = read[l.url];
      if (readAt) {
        const diff = new Date(readAt).getTime() - new Date(l.date).getTime();
        if (diff >= 0) durations.push(diff / DAY_MS);
      }
    }
    const avgUnreadDays = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

    return { topCategories, topDomains, weeks, maxWeek, readCount, unreadCount, avgUnreadDays };
  }, [links]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-900/40 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Статистика"
    >
      <div
        className="w-[420px] max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <span className="flex items-center gap-2 text-sm font-black text-slate-900">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Статистика
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Закрыть статистику"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div className="flex gap-2">
            <Stat label="Всего ссылок" value={links.length} />
            <Stat label="Прочитано" value={stats.readCount} accent="text-green-600" />
            <Stat label="Не прочитано" value={stats.unreadCount} accent="text-indigo-600" />
          </div>

          {stats.topCategories.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Топ категорий
              </p>
              <div className="space-y-1.5">
                {stats.topCategories.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <span className="w-32 truncate text-slate-600">{name}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: `${(count / stats.topCategories[0][1]) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-bold text-slate-700">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.topDomains.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Топ доменов
              </p>
              <div className="space-y-1.5">
                {stats.topDomains.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <span className="w-32 truncate text-slate-600 font-mono">{name}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${(count / stats.topDomains[0][1]) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-bold text-slate-700">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Сохранения за 8 недель
            </p>
            <Bars data={stats.weeks} max={stats.maxWeek} />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Среднее время до прочтения
            </p>
            <p className="text-sm font-bold text-slate-800">
              {stats.avgUnreadDays === null
                ? '— нет прочитанных ссылок'
                : `${stats.avgUnreadDays.toFixed(1)} дн.`}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Между датой сохранения и первым открытием ссылки.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={links.length === 0 || stats.unreadCount === 0}
            onClick={() => {
              onMarkAllRead();
              onClose();
            }}
            icon={<CheckCheck className="w-4 h-4" />}
          >
            Отметить все как прочитанные
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
