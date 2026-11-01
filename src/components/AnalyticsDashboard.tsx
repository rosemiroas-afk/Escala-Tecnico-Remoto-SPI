import React, { useMemo } from 'react';
import { Technician, TechnicianSchedule, SchedulePeriod, OffRequest, OFFICIAL_LEGEND_ITEMS } from '../types';
import { AuditResult } from '../utils/validator';
import {
  BarChart3,
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  ShieldCheck,
  PieChart,
  Activity,
  Layers,
  MapPin,
  HeartHandshake
} from 'lucide-react';

interface AnalyticsDashboardProps {
  technicians: Technician[];
  schedules: Record<string, TechnicianSchedule>;
  dates: string[];
  period: SchedulePeriod;
  auditResult: AuditResult;
  offRequests: OffRequest[];
  darkMode: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  technicians,
  schedules,
  dates,
  period,
  auditResult,
  offRequests,
  darkMode
}) => {
  // Compute analytics metrics
  const stats = useMemo(() => {
    let totalWorkDays = 0;
    let totalOffDays = 0;
    const shiftTypeCounts: Record<string, number> = {};
    const dddCounts: Record<number, number> = { 13: 0, 14: 0, 15: 0, 19: 0 };
    const dailyWorkingCounts: Record<string, number> = {};

    // Initialize shift counts
    OFFICIAL_LEGEND_ITEMS.forEach(item => {
      shiftTypeCounts[item.type] = 0;
    });

    dates.forEach(d => {
      dailyWorkingCounts[d] = 0;
    });

    technicians.forEach(t => {
      // DDD count
      if (dddCounts[t.ddd] !== undefined) {
        dddCounts[t.ddd]++;
      } else {
        dddCounts[t.ddd] = (dddCounts[t.ddd] || 0) + 1;
      }

      const techSched = schedules[t.id];
      if (techSched && techSched.days) {
        dates.forEach(d => {
          const dayInfo = techSched.days[d];
          const shift = dayInfo?.shift || 'TB';
          shiftTypeCounts[shift] = (shiftTypeCounts[shift] || 0) + 1;

          if (shift === 'TB') {
            totalWorkDays++;
            dailyWorkingCounts[d] = (dailyWorkingCounts[d] || 0) + 1;
          } else {
            totalOffDays++;
          }
        });
      }
    });

    const totalCells = technicians.length * dates.length;
    const workPercentage = totalCells > 0 ? Math.round((totalWorkDays / totalCells) * 100) : 0;

    // Pending vs approved requests
    const pendingReqs = offRequests.filter(r => r.status === 'pendente').length;
    const approvedReqs = offRequests.filter(r => r.status === 'aprovado' || r.status === 'atendido').length;

    // Daily average working
    const avgDailyWorking = dates.length > 0 ? Math.round(totalWorkDays / dates.length) : 0;

    return {
      totalWorkDays,
      totalOffDays,
      totalCells,
      workPercentage,
      shiftTypeCounts,
      dddCounts,
      dailyWorkingCounts,
      pendingReqs,
      approvedReqs,
      avgDailyWorking
    };
  }, [technicians, schedules, dates, offRequests]);

  // Format date for daily breakdown display (e.g. "01/11 Seg")
  const formatDateLabel = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      const weekday = dt.toLocaleDateString('pt-BR', { weekday: 'short' });
      return `${d}/${m} (${weekday})`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        darkMode
          ? 'bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border-indigo-800/80 text-white'
          : 'bg-gradient-to-r from-indigo-50 via-white to-blue-50 border-indigo-100 text-slate-900'
      }`}>
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Dashboard & Análise Operacional
            </h2>
          </div>
          <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Visão gerencial consolidada da Escala {period.regime || '6x1'} • Período: {period.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-2xl border text-center ${
            darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <span className="block text-[10px] uppercase font-bold tracking-wider opacity-75">Conformidade Legal</span>
            <span className="text-lg font-black text-emerald-500">{auditResult.score}%</span>
          </div>

          <div className={`px-4 py-2 rounded-2xl border text-center ${
            darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <span className="block text-[10px] uppercase font-bold tracking-wider opacity-75">Colaboradores</span>
            <span className="text-lg font-black text-indigo-500">{technicians.length}</span>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Total de Dias Trabalhados
            </p>
            <h3 className="text-2xl font-black mt-1 text-indigo-500">{stats.totalWorkDays}</h3>
            <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Média de {stats.avgDailyWorking} técnicos por dia
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
            darkMode ? 'bg-indigo-950 text-indigo-400 border border-indigo-800' : 'bg-indigo-50 text-indigo-600'
          }`}>
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2 */}
        <div className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Folgas e Afastamentos
            </p>
            <h3 className="text-2xl font-black mt-1 text-amber-500">{stats.totalOffDays}</h3>
            <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {Math.round((stats.totalOffDays / stats.totalCells) * 100)}% do total de blocos
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
            darkMode ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-amber-50 text-amber-600'
          }`}>
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3 */}
        <div className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Solicitações de Folga
            </p>
            <h3 className="text-2xl font-black mt-1 text-emerald-500">{stats.approvedReqs}</h3>
            <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {stats.pendingReqs} pendentes de análise
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
            darkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-50 text-emerald-600'
          }`}>
            <HeartHandshake className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4 */}
        <div className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Auditoria & Conflitos
            </p>
            <h3 className="text-2xl font-black mt-1 text-purple-500">{auditResult.issues.length}</h3>
            <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {auditResult.issues.length === 0 ? 'Nenhum conflito detetado' : 'Requer atenção do gestor'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
            darkMode ? 'bg-purple-950 text-purple-400 border border-purple-800' : 'bg-purple-50 text-purple-600'
          }`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Breakdown Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Shift Types Distribution */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border shadow-sm ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-base flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-500" />
              <span>Distribuição de Siglas e Tipos de Escala</span>
            </h3>
            <span className={`text-xs px-2.5 py-1 rounded-xl font-bold border ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              {dates.length} dias no período
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {OFFICIAL_LEGEND_ITEMS.map(item => {
              const count = stats.shiftTypeCounts[item.type] || 0;
              const percentage = stats.totalCells > 0 ? Math.round((count / stats.totalCells) * 100) : 0;
              return (
                <div key={item.type} className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                  darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${item.badgeClass}`}>
                      {item.shortLabel}
                    </span>
                    <span className="text-xs font-bold opacity-75">{percentage}%</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold truncate" title={item.label}>{item.label}</h4>
                    <p className="text-lg font-black mt-0.5 text-indigo-500">{count} <span className="text-[10px] font-normal opacity-75">vezes</span></p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: DDD Breakdown & Regional Staffing */}
        <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div>
            <h3 className="font-bold text-base flex items-center gap-2 mb-5">
              <MapPin className="w-5 h-5 text-indigo-500" />
              <span>Colaboradores por DDD</span>
            </h3>

            <div className="space-y-3.5">
              {[
                { ddd: 13, name: 'Baixada Santista e Litoral', count: stats.dddCounts[13] || 0 },
                { ddd: 14, name: 'Bauru, Marília e Botucatu', count: stats.dddCounts[14] || 0 },
                { ddd: 15, name: 'Sorocaba e Itapetininga', count: stats.dddCounts[15] || 0 },
                { ddd: 19, name: 'Campinas e Piracicaba', count: stats.dddCounts[19] || 0 }
              ].map(region => {
                const percentage = technicians.length > 0 ? Math.round((region.count / technicians.length) * 100) : 0;
                return (
                  <div key={region.ddd} className={`p-3.5 rounded-2xl border ${
                    darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-indigo-600 text-white">
                        DDD {region.ddd}
                      </span>
                      <span className="text-xs font-bold">{region.count} técnicos ({percentage}%)</span>
                    </div>
                    <p className={`text-[11px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {region.name}
                    </p>
                    <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`mt-5 p-3.5 rounded-2xl border text-xs ${
            darkMode ? 'bg-indigo-950/40 border-indigo-800 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}>
            <span className="font-bold block mb-0.5">💡 Análise de Cobertura:</span>
            Equipe 100% alocada no São Paulo Interior para atendimento GPON de alta disponibilidade.
          </div>
        </div>
      </div>

      {/* Daily Analysis Section */}
      <div className={`p-6 rounded-3xl border shadow-sm ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            <span>Análise Diária de Efetivo Trabalhando (São Paulo Interior)</span>
          </h3>
          <span className={`text-xs px-2.5 py-1 rounded-xl font-bold border ${
            darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            Total: {dates.length} dias monitorados
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {dates.map(dateStr => {
            const workingCount = stats.dailyWorkingCounts[dateStr] || 0;
            const offCount = technicians.length - workingCount;
            const ratio = technicians.length > 0 ? Math.round((workingCount / technicians.length) * 100) : 0;
            const isWeekend = (() => {
              try {
                const [y, m, d] = dateStr.split('-');
                const dt = new Date(Number(y), Number(m) - 1, Number(d));
                const day = dt.getDay();
                return day === 0 || day === 6;
              } catch {
                return false;
              }
            })();

            return (
              <div key={dateStr} className={`p-3 rounded-2xl border flex flex-col justify-between ${
                darkMode
                  ? isWeekend ? 'bg-amber-950/20 border-amber-900/60' : 'bg-slate-800/60 border-slate-700'
                  : isWeekend ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold">{formatDateLabel(dateStr)}</span>
                  {isWeekend && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                      Fim de semana
                    </span>
                  )}
                </div>

                <div className="space-y-1 my-1">
                  <div className="flex justify-between text-xs">
                    <span className="opacity-75">Trabalhando:</span>
                    <strong className="text-emerald-500">{workingCount}</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="opacity-75">Folga/Ausente:</span>
                    <strong className="text-amber-500">{offCount}</strong>
                  </div>
                </div>

                <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div
                    className={`h-full rounded-full ${ratio > 60 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${ratio}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
