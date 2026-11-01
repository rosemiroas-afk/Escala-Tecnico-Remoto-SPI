import React, { useMemo, useState } from 'react';
import { Technician, TechnicianSchedule, SchedulePeriod, OffRequest, OFFICIAL_LEGEND_ITEMS, SHIFT_TYPES } from '../types';
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
  HeartHandshake,
  Sun,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Coffee,
  CalendarDays,
  UserCheck
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
  // Determine today's date or closest date in range
  const defaultToday = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    return dates.includes(todayStr) ? todayStr : (dates[0] || '2026-11-01');
  }, [dates]);

  const [selectedDay, setSelectedDay] = useState<string>(defaultToday);
  const [dayStatusFilter, setDayStatusFilter] = useState<'all' | 'working' | 'vacation' | 'off' | 'leave'>('all');

  // Compute stats for the selected day (Hoje)
  const currentDayStats = useMemo(() => {
    const activeTechs = technicians.filter(t => t.active);
    const totalActive = activeTechs.length;

    const working: Array<{ tech: Technician; shift: string; label: string; badgeClass?: string; bgColor?: string }> = [];
    const vacation: Array<{ tech: Technician; shift: string; label: string; badgeClass?: string; bgColor?: string }> = [];
    const off: Array<{ tech: Technician; shift: string; label: string; badgeClass?: string; bgColor?: string }> = [];
    const leave: Array<{ tech: Technician; shift: string; label: string; badgeClass?: string; bgColor?: string }> = [];

    activeTechs.forEach(tech => {
      const dayData = schedules[tech.id]?.days?.[selectedDay];
      const shift = dayData?.shift || 'TB';
      const shiftMeta = SHIFT_TYPES[shift] || SHIFT_TYPES['TB'];

      if (shift === 'TB' || shift === 'T') {
        working.push({
          tech,
          shift: 'TB',
          label: 'Dia Trabalhado',
          badgeClass: shiftMeta.badgeClass,
          bgColor: shiftMeta.bgColor
        });
      } else if (shift === 'FR' || shift === 'FE') {
        vacation.push({
          tech,
          shift: 'FR',
          label: 'Férias',
          badgeClass: shiftMeta.badgeClass,
          bgColor: shiftMeta.bgColor
        });
      } else if (shift === 'LIC' || shift === 'LI' || shift === 'A' || shift === 'LP' || shift === 'TR') {
        let label = 'Afastado';
        if (shift === 'LIC' || shift === 'LI') label = 'Afastado / Licença';
        else if (shift === 'LP') label = 'Licença';
        else if (shift === 'TR') label = 'Treinamento';
        leave.push({
          tech,
          shift,
          label,
          badgeClass: shiftMeta.badgeClass,
          bgColor: shiftMeta.bgColor
        });
      } else {
        // Folgas (FD, FB, FP, FG, FC, FM, FN)
        let label = 'Folga Regular';
        if (shift === 'FD') label = 'Folga Duplada';
        else if (shift === 'FB') label = 'Folga Banco';
        else if (shift === 'FP') label = 'Folga Parcial';
        else if (shift === 'FC') label = 'Folga Compensada';
        else if (shift === 'FM') label = 'Folga Municipal';
        else if (shift === 'FN') label = 'Feriado Nacional';
        off.push({
          tech,
          shift,
          label,
          badgeClass: shiftMeta.badgeClass,
          bgColor: shiftMeta.bgColor
        });
      }
    });

    const workPct = totalActive > 0 ? Math.round((working.length / totalActive) * 100) : 0;
    const vacationPct = totalActive > 0 ? Math.round((vacation.length / totalActive) * 100) : 0;
    const offPct = totalActive > 0 ? Math.round((off.length / totalActive) * 100) : 0;
    const leavePct = totalActive > 0 ? Math.round((leave.length / totalActive) * 100) : 0;

    return {
      totalActive,
      working,
      vacation,
      off,
      leave,
      workPct,
      vacationPct,
      offPct,
      leavePct
    };
  }, [technicians, schedules, selectedDay]);

  // Navigate day by offset
  const handleDayOffset = (offset: number) => {
    const currentIndex = dates.indexOf(selectedDay);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + offset;
    if (nextIndex >= 0 && nextIndex < dates.length) {
      setSelectedDay(dates[nextIndex]);
    }
  };

  const isToday = selectedDay === defaultToday;

  // Format full date label in Portuguese
  const formatFullDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      const weekday = dt.toLocaleDateString('pt-BR', { weekday: 'long' });
      const monthName = dt.toLocaleDateString('pt-BR', { month: 'long' });
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      return `${d} de ${monthName} de ${y} (${capitalizedWeekday})`;
    } catch {
      return dateStr;
    }
  };

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

  // Filtered technicians for the selected day inspector
  const filteredDayTechs = useMemo(() => {
    if (dayStatusFilter === 'working') return currentDayStats.working;
    if (dayStatusFilter === 'vacation') return currentDayStats.vacation;
    if (dayStatusFilter === 'off') return currentDayStats.off;
    if (dayStatusFilter === 'leave') return currentDayStats.leave;
    return [
      ...currentDayStats.working,
      ...currentDayStats.vacation,
      ...currentDayStats.off,
      ...currentDayStats.leave
    ];
  }, [dayStatusFilter, currentDayStats]);

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

      {/* NOVO: STATUS DA ESCALA DO DIA ATUAL (HOJE) NO TOPO DO DASHBOARD */}
      <div className={`p-6 rounded-3xl border shadow-md transition-all ${
        darkMode
          ? 'bg-gradient-to-b from-slate-900 to-slate-900/90 border-slate-800 text-white'
          : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 text-slate-900'
      }`}>
        {/* Header do Dia Atual */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Status da Escala Diária
                </span>
                {isToday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white animate-pulse">
                    DIA ATUAL (HOJE)
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-black mt-0.5 text-slate-900 dark:text-white">
                {formatFullDate(selectedDay)}
              </h3>
            </div>
          </div>

          {/* Controles de Navegação de Dia */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isToday && (
              <button
                onClick={() => setSelectedDay(defaultToday)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                title="Voltar para a data de hoje"
              >
                <span>Ir para Hoje</span>
              </button>
            )}

            <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-2xs">
              <button
                onClick={() => handleDayOffset(-1)}
                disabled={dates.indexOf(selectedDay) <= 0}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Dia anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
                className="text-xs font-bold px-2 py-1.5 bg-transparent border-x border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden"
              >
                {dates.map(d => (
                  <option key={d} value={d} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {formatDateLabel(d)} {d === defaultToday ? '★ Hoje' : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleDayOffset(1)}
                disabled={dates.indexOf(selectedDay) >= dates.length - 1}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Próximo dia"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Cards de Métricas do Dia: Trabalhando %, Férias %, Folga %, Afastados % */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* Card Trabalhando (TB) */}
          <div
            onClick={() => setDayStatusFilter(dayStatusFilter === 'working' ? 'all' : 'working')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] shadow-xs ${
              dayStatusFilter === 'working' ? 'ring-2 ring-emerald-500' : ''
            } ${
              darkMode
                ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-100'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Trabalhando (TB)
              </span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-600 text-white shadow-2xs">
                {currentDayStats.workPct}%
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {currentDayStats.working.length}
              </span>
              <span className="text-xs font-semibold text-emerald-800/80 dark:text-emerald-300/80">
                de {currentDayStats.totalActive} colaboradores
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Efetivo técnico ativo no campo</span>
            </p>
          </div>

          {/* Card Em Férias (FR) */}
          <div
            onClick={() => setDayStatusFilter(dayStatusFilter === 'vacation' ? 'all' : 'vacation')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] shadow-xs ${
              dayStatusFilter === 'vacation' ? 'ring-2 ring-sky-500' : ''
            } ${
              darkMode
                ? 'bg-sky-950/30 border-sky-900/60 text-sky-100'
                : 'bg-sky-50/70 border-sky-200 text-sky-950'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                Em Férias (FR)
              </span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-sky-600 text-white shadow-2xs">
                {currentDayStats.vacationPct}%
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-sky-600 dark:text-sky-400">
                {currentDayStats.vacation.length}
              </span>
              <span className="text-xs font-semibold text-sky-800/80 dark:text-sky-300/80">
                de {currentDayStats.totalActive} colaboradores
              </span>
            </div>
            <p className="text-[11px] text-sky-700 dark:text-sky-400 mt-2 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" />
              <span>Em período oficial de férias</span>
            </p>
          </div>

          {/* Card Em Folga (FG/FD/FB/FP) */}
          <div
            onClick={() => setDayStatusFilter(dayStatusFilter === 'off' ? 'all' : 'off')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] shadow-xs ${
              dayStatusFilter === 'off' ? 'ring-2 ring-amber-500' : ''
            } ${
              darkMode
                ? 'bg-amber-950/30 border-amber-900/60 text-amber-100'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Em Folga (FD/FB/FP/FG)
              </span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-amber-600 text-white shadow-2xs">
                {currentDayStats.offPct}%
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                {currentDayStats.off.length}
              </span>
              <span className="text-xs font-semibold text-amber-800/80 dark:text-amber-300/80">
                de {currentDayStats.totalActive} colaboradores
              </span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5" />
              <span>Folga semanal, banco ou duplada</span>
            </p>
          </div>

          {/* Card Afastados / Licença (LIC/A/LP) */}
          <div
            onClick={() => setDayStatusFilter(dayStatusFilter === 'leave' ? 'all' : 'leave')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] shadow-xs ${
              dayStatusFilter === 'leave' ? 'ring-2 ring-purple-500' : ''
            } ${
              darkMode
                ? 'bg-purple-950/30 border-purple-900/60 text-purple-100'
                : 'bg-purple-50/70 border-purple-200 text-purple-950'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Afastado / Licença
              </span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-purple-600 text-white shadow-2xs">
                {currentDayStats.leavePct}%
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                {currentDayStats.leave.length}
              </span>
              <span className="text-xs font-semibold text-purple-800/80 dark:text-purple-300/80">
                de {currentDayStats.totalActive} colaboradores
              </span>
            </div>
            <p className="text-[11px] text-purple-700 dark:text-purple-400 mt-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Licença médica ou afastamento</span>
            </p>
          </div>
        </div>

        {/* Visualizador Rápido de Quem está em Qual Status no Dia */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <UserCheck className="w-4 h-4 text-indigo-500" />
              <span>Colaboradores por Situação em {selectedDay.split('-')[2]}/{selectedDay.split('-')[1]}:</span>
            </div>

            {/* Filtros em Pílulas */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setDayStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dayStatusFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Todos ({currentDayStats.totalActive})
              </button>
              <button
                onClick={() => setDayStatusFilter('working')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dayStatusFilter === 'working'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                Trabalhando ({currentDayStats.working.length} • {currentDayStats.workPct}%)
              </button>
              <button
                onClick={() => setDayStatusFilter('vacation')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dayStatusFilter === 'vacation'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                }`}
              >
                Férias ({currentDayStats.vacation.length} • {currentDayStats.vacationPct}%)
              </button>
              <button
                onClick={() => setDayStatusFilter('off')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dayStatusFilter === 'off'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                Folga ({currentDayStats.off.length} • {currentDayStats.offPct}%)
              </button>
              {currentDayStats.leave.length > 0 && (
                <button
                  onClick={() => setDayStatusFilter('leave')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dayStatusFilter === 'leave'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  }`}
                >
                  Afastados ({currentDayStats.leave.length} • {currentDayStats.leavePct}%)
                </button>
              )}
            </div>
          </div>

          {/* Grid de Chips dos Técnicos no Dia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {filteredDayTechs.length === 0 ? (
              <div className="col-span-full py-4 text-center text-xs text-slate-400">
                Nenhum colaborador nesta categoria para o dia selecionado.
              </div>
            ) : (
              filteredDayTechs.map(item => (
                <div
                  key={item.tech.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 shadow-2xs transition-colors ${
                    darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block truncate" title={item.tech.name}>
                      {item.tech.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      DDD {item.tech.ddd} • {item.tech.shiftHours || 'Normal'}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 border ${
                      item.badgeClass || 'bg-slate-100 text-slate-800 border-slate-300'
                    }`}
                    title={item.label}
                  >
                    {item.shift}
                  </span>
                </div>
              ))
            )}
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
