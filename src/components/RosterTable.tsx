import React, { useState } from 'react';
import { Technician, TechnicianSchedule, ShiftType, SHIFT_TYPES, OffRequest, SchedulePeriod } from '../types';
import { formatDisplayDate, parseDateKey, isSaturday, isSunday, MONTHS_PT } from '../utils/dateUtils';
import { AuditResult, isOffShift, isWorkingShift } from '../utils/validator';
import { DDD_INFO } from '../data/defaultTechnicians';
import { Filter, Search, AlertTriangle, Star, Clock, Trash2 } from 'lucide-react';

interface RosterTableProps {
  technicians: Technician[];
  schedules: Record<string, TechnicianSchedule>;
  dates: string[];
  period: SchedulePeriod;
  auditResult: AuditResult;
  offRequests: OffRequest[];
  onUpdateShift: (techId: string, date: string, shift: ShiftType, notes?: string) => void;
  onOpenRequests: (techId?: string) => void;
  onClearSchedule?: () => void;
}

export const RosterTable: React.FC<RosterTableProps> = ({
  technicians,
  schedules,
  dates,
  period,
  auditResult,
  offRequests,
  onUpdateShift,
  onOpenRequests,
  onClearSchedule
}) => {
  const [selectedDDD, setSelectedDDD] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter technicians
  const filteredTechs = technicians.filter(tech => {
    if (!tech.active) return false;
    if (selectedDDD !== 'all' && tech.ddd !== Number(selectedDDD)) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return tech.name.toLowerCase().includes(q) || String(tech.ddd).includes(q);
    }
    return true;
  });

  // Split dates by month for header grouping
  const monthGroups: { monthName: string; year: number; dates: string[] }[] = [];
  let currentMonthKey = '';
  let currentGroup: { monthName: string; year: number; dates: string[] } | null = null;

  for (const d of dates) {
    const dObj = parseDateKey(d);
    const m = dObj.getMonth();
    const y = dObj.getFullYear();
    const key = `${y}-${m}`;

    if (key !== currentMonthKey) {
      currentMonthKey = key;
      currentGroup = {
        monthName: MONTHS_PT[m],
        year: y,
        dates: [d]
      };
      monthGroups.push(currentGroup);
    } else if (currentGroup) {
      currentGroup.dates.push(d);
    }
  }

  // Pre-index off requests
  const requestsMap = new Map<string, OffRequest>();
  for (const req of offRequests) {
    requestsMap.set(`${req.technicianId}__${req.date}`, req);
  }

  const handleCellClick = (techId: string, date: string, currentShift: ShiftType) => {
    // Cycle: TB -> FG -> FD -> FC -> TB
    const s = currentShift === 'T' ? 'TB' : currentShift === 'F' ? 'FG' : currentShift;
    if (s === 'TB') {
      onUpdateShift(techId, date, 'FG');
    } else if (s === 'FG') {
      onUpdateShift(techId, date, 'FD');
    } else if (s === 'FD') {
      onUpdateShift(techId, date, 'FC');
    } else {
      onUpdateShift(techId, date, 'TB');
    }
  };

  const getShiftBadgeStyle = (shift: string) => {
    const norm = shift === 'T' ? 'TB' : shift === 'F' ? 'FG' : shift;
    switch (norm) {
      case 'TB':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold';
      case 'FG':
        return 'bg-yellow-200 text-yellow-950 border-yellow-400 font-bold';
      case 'FD':
        return 'bg-orange-300 text-orange-950 border-orange-400 font-black shadow-xs';
      case 'FC':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold';
      case 'FN':
        return 'bg-sky-200 text-sky-950 border-sky-400 font-bold';
      case 'FR':
      case 'FE':
        return 'bg-amber-200 text-amber-950 border-amber-400 font-bold';
      case 'LIC':
      case 'LI':
      case 'LP':
        return 'bg-slate-200 text-slate-800 border-slate-300 font-bold';
      case 'FB':
        return 'bg-teal-200 text-teal-900 border-teal-400 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 font-medium';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-colors">
      {/* Top Filter and Search Bar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5" />
            Região DDD:
          </div>

          <button
            onClick={() => setSelectedDDD('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedDDD === 'all'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Todos ({technicians.filter(t => t.active).length})
          </button>

          {[13, 14, 15, 19].map(ddd => {
            const count = technicians.filter(t => t.active && t.ddd === ddd).length;
            const isSelected = selectedDDD === String(ddd);
            return (
              <button
                key={ddd}
                onClick={() => setSelectedDDD(String(ddd))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>DDD {ddd}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Clear Roster */}
        <div className="flex items-center gap-2">
          {onClearSchedule && (
            <button
              onClick={onClearSchedule}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Limpar toda a escala gerada"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Limpar Escala</span>
            </button>
          )}

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar técnico..."
              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Roster Matrix Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] border-t border-slate-100 dark:border-slate-800">
        <table className="w-full text-left border-collapse min-w-max select-none">
          <thead>
            {/* Top Month Group Headers */}
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30">
              <th className="sticky left-0 z-40 bg-slate-100 dark:bg-slate-800 px-3 py-2 min-w-[220px] border-r border-slate-200 dark:border-slate-700 shadow-xs">
                Técnico & Região
              </th>
              <th className="sticky left-[220px] z-40 bg-slate-100 dark:bg-slate-800 px-2 py-2 min-w-[110px] text-center border-r border-slate-200 dark:border-slate-700 text-[11px]">
                Escala (Horário)
              </th>
              <th className="sticky left-[330px] z-40 bg-slate-100 dark:bg-slate-800 px-2 py-2 w-[65px] text-center border-r border-slate-200 dark:border-slate-700 text-[11px]">
                TB (Trab)
              </th>
              <th className="sticky left-[395px] z-40 bg-slate-100 dark:bg-slate-800 px-2 py-2 w-[65px] text-center border-r border-slate-200 dark:border-slate-700 text-[11px]">
                Folgas
              </th>
              <th className="sticky left-[460px] z-40 bg-slate-100 dark:bg-slate-800 px-2 py-2 w-[70px] text-center border-r border-slate-300 dark:border-slate-700 text-[11px] shadow-r">
                FD (Dupla)
              </th>

              {monthGroups.map((mg, i) => (
                <th
                  key={i}
                  colSpan={mg.dates.length}
                  className="px-4 py-2 text-center border-r border-slate-300 dark:border-slate-700 bg-gradient-to-r from-slate-100 to-indigo-50/50 dark:from-slate-800 dark:to-indigo-950/60 text-indigo-900 dark:text-indigo-300 font-bold uppercase tracking-wider text-[11px]"
                >
                  {mg.monthName} {mg.year} ({mg.dates.length} dias)
                </th>
              ))}
            </tr>

            {/* Second Header Row: Days of Week */}
            <tr className="bg-slate-50 dark:bg-slate-850 dark:bg-slate-800/90 text-[10px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 sticky top-[33px] z-30">
              <th className="sticky left-0 z-40 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 border-r border-slate-200 dark:border-slate-700">
                {filteredTechs.length} técnicos
              </th>
              <th className="sticky left-[220px] z-40 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400">
                Turno
              </th>
              <th className="sticky left-[330px] z-40 bg-slate-50 dark:bg-slate-800 px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400">
                Total
              </th>
              <th className="sticky left-[395px] z-40 bg-slate-50 dark:bg-slate-800 px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400">
                Total
              </th>
              <th className="sticky left-[460px] z-40 bg-slate-50 dark:bg-slate-800 px-1 py-1.5 text-center border-r border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-400 shadow-r">
                Sáb+Dom
              </th>

              {dates.map(d => {
                const dateObj = parseDateKey(d);
                const isSat = isSaturday(d);
                const isSun = isSunday(d);

                let headerBg = 'bg-slate-50 text-slate-700';
                if (isSun) headerBg = 'bg-yellow-100 text-yellow-950 font-black';
                else if (isSat) headerBg = 'bg-rose-100 text-rose-950 font-black';

                return (
                  <th
                    key={d}
                    className={`px-1 py-1 text-center min-w-[34px] w-[34px] border-r border-slate-200 text-[10px] uppercase tracking-tighter ${headerBg}`}
                    title={formatDisplayDate(d)}
                  >
                    <div>{isSun ? 'Dom' : isSat ? 'Sáb' : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'][dateObj.getDay() - 1]}</div>
                    <div className="font-extrabold text-[11px]">{dateObj.getDate()}</div>
                  </th>
                );
              })}
            </tr>

            {/* Third Header Row: ATUANTES DIA (From user's exact spreadsheet!) */}
            <tr className="bg-emerald-50/90 text-[10px] font-black text-emerald-950 border-b-2 border-slate-300 sticky top-[65px] z-30">
              <th className="sticky left-0 z-40 bg-emerald-100 px-3 py-1.5 border-r border-slate-200 uppercase tracking-wider text-emerald-950">
                ATUANTES DIA
              </th>
              <th className="sticky left-[220px] z-40 bg-emerald-100 px-2 py-1.5 text-center border-r border-slate-200">
                -
              </th>
              <th className="sticky left-[330px] z-40 bg-emerald-100 px-1 py-1.5 text-center border-r border-slate-200">
                -
              </th>
              <th className="sticky left-[395px] z-40 bg-emerald-100 px-1 py-1.5 text-center border-r border-slate-200">
                -
              </th>
              <th className="sticky left-[460px] z-40 bg-emerald-100 px-1 py-1.5 text-center border-r border-slate-300 shadow-r">
                -
              </th>

              {dates.map(d => {
                let workingCount = 0;
                for (const t of filteredTechs) {
                  const s = schedules[t.id]?.days[d]?.shift;
                  if (s && isWorkingShift(s)) workingCount++;
                }

                return (
                  <th
                    key={d}
                    className="px-1 py-1 text-center border-r border-slate-200 font-extrabold text-[11px] text-emerald-900 bg-emerald-100/70"
                    title={`${workingCount} técnicos trabalhando`}
                  >
                    {workingCount}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredTechs.map(tech => {
              const techSched = schedules[tech.id];
              const hasSchedule = !!techSched && Object.keys(techSched.days).length > 0;
              const stats = hasSchedule ? (auditResult.techStats[tech.id] || {
                totalWorkDays: 0,
                totalOffDays: 0,
                doubleWeekendsCount: 0,
                maxConsecutiveWorkDays: 0
              }) : {
                totalWorkDays: 0,
                totalOffDays: 0,
                doubleWeekendsCount: 0,
                maxConsecutiveWorkDays: 0
              };

              const hasMissingDouble = hasSchedule && stats.doubleWeekendsCount === 0;
              const hasConsecutiveViolation = hasSchedule && stats.maxConsecutiveWorkDays > 6;
              const dddConfig = DDD_INFO[tech.ddd];

              return (
                <tr
                  key={tech.id}
                  className="hover:bg-indigo-50/20 dark:hover:bg-slate-800/60 transition-colors group"
                >
                  {/* Sticky Column: Name and DDD */}
                  <td className="sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-indigo-50/30 dark:group-hover:bg-slate-800 px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between gap-1">
                      <div className="truncate max-w-[165px]">
                        <span className="font-bold text-slate-800 dark:text-slate-100 block text-xs truncate">
                          {tech.name}
                        </span>
                        <span className={`inline-block text-[9px] px-1.5 py-0.1 rounded-md font-bold border ${dddConfig?.badge || 'bg-slate-100'}`}>
                          DDD {tech.ddd}
                        </span>
                      </div>

                      {/* Warnings if any */}
                      {(hasMissingDouble || hasConsecutiveViolation) && (
                        <div
                          className="text-rose-500 p-0.5 cursor-help"
                          title={
                            hasConsecutiveViolation
                              ? `Atingiu ${stats.maxConsecutiveWorkDays} dias seguidos (limite: 6).`
                              : `Sem fim de semana duplado programado!`
                          }
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Sticky Column: Shift Hours (ESCALA) */}
                  <td className="sticky left-[220px] z-20 bg-white dark:bg-slate-900 group-hover:bg-indigo-50/30 dark:group-hover:bg-slate-800 px-2 py-1.5 text-center border-r border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    {tech.shiftHours || '08:00 AS 16:20'}
                  </td>

                  {/* Sticky Stats Columns */}
                  <td className="sticky left-[330px] z-20 bg-white dark:bg-slate-900 group-hover:bg-indigo-50/30 dark:group-hover:bg-slate-800 px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-800 font-bold text-emerald-800 dark:text-emerald-400 text-xs">
                    {hasSchedule ? stats.totalWorkDays : '-'}
                  </td>
                  <td className="sticky left-[395px] z-20 bg-white dark:bg-slate-900 group-hover:bg-indigo-50/30 dark:group-hover:bg-slate-800 px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-800 font-bold text-yellow-900 dark:text-yellow-400 text-xs">
                    {hasSchedule ? stats.totalOffDays : '-'}
                  </td>
                  <td className="sticky left-[460px] z-20 bg-white dark:bg-slate-900 group-hover:bg-indigo-50/30 dark:group-hover:bg-slate-800 px-1 py-1.5 text-center border-r border-slate-300 dark:border-slate-700 text-xs shadow-r">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold text-[10px] ${
                        !hasSchedule
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : stats.doubleWeekendsCount > 0
                          ? 'bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      }`}
                    >
                      {hasSchedule && stats.doubleWeekendsCount > 0 && <Star className="w-2.5 h-2.5 fill-orange-600" />}
                      {hasSchedule ? stats.doubleWeekendsCount : '-'}
                    </span>
                  </td>

                  {/* Day cells */}
                  {dates.map(dateKey => {
                    const day = techSched?.days[dateKey];
                    const rawShift = day?.shift;
                    const shift = rawShift ? (rawShift === 'T' ? 'TB' : rawShift === 'F' ? 'FG' : rawShift) : '-';
                    const isSat = isSaturday(dateKey);
                    const isSun = isSunday(dateKey);
                    const offReq = requestsMap.get(`${tech.id}__${dateKey}`);

                    const badgeStyle = shift === '-' ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-normal border border-slate-200 dark:border-slate-700' : getShiftBadgeStyle(shift);
                    const cellBg = isSun
                      ? 'bg-yellow-50/30 dark:bg-yellow-950/20'
                      : isSat
                      ? 'bg-rose-50/20 dark:bg-rose-950/20'
                      : '';

                    return (
                      <td
                        key={dateKey}
                        onClick={() => handleCellClick(tech.id, dateKey, shift as ShiftType)}
                        className={`p-0.5 text-center border-r border-slate-100 dark:border-slate-800 cursor-pointer transition-colors relative hover:ring-2 hover:ring-indigo-400 hover:z-10 ${cellBg}`}
                        title={`${tech.name} - ${formatDisplayDate(dateKey)}: ${shift} - Clique para alternar`}
                      >
                        <div className="w-full h-7 flex items-center justify-center relative">
                          <span className={`w-7 h-5 flex items-center justify-center text-[10px] rounded-xs transition-transform ${badgeStyle}`}>
                            {shift}
                          </span>

                          {/* Indicator for Off Request */}
                          {offReq && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenRequests(tech.id);
                              }}
                              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 cursor-pointer ${
                                offReq.status === 'atendido' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                              }`}
                              title={
                                offReq.status === 'atendido'
                                  ? `Folga Concedida: ${offReq.reasonCategory} - ${offReq.notes.join(', ')}`
                                  : `Solicitação em Análise: ${offReq.reasonCategory} - ${offReq.notes.join(', ')}`
                              }
                            />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Official Legenda matching User's Spreadsheet */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-extrabold text-slate-900 dark:text-white text-xs">LEGENDA SPI:</span>

          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">TB</span>
            <span>Dia Trabalhado</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-yellow-200 text-yellow-950 border border-yellow-400">FG</span>
            <span>Folga Regular</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-black bg-orange-300 text-orange-950 border border-orange-400">FD</span>
            <span className="font-semibold text-orange-950">Folga Duplada (Sáb+Dom)</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">FC</span>
            <span>Folga Compensada</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-sky-200 text-sky-950 border border-sky-400">FN</span>
            <span>Feriado Nacional</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-amber-200 text-amber-950 border border-amber-400">FR</span>
            <span>Férias</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-teal-200 text-teal-900 border border-teal-400">FB</span>
            <span>Folga Banco</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">LIC</span>
            <span>Afastado</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          💡 Clique em qualquer célula para alternar entre <strong>TB</strong> (Trabalho), <strong>FG</strong> (Folga), <strong>FD</strong> (Folga Dupla) e <strong>FC</strong> (Compensada).
        </div>
      </div>
    </div>
  );
};
