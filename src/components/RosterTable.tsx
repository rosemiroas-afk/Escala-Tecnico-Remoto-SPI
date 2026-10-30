import React, { useState, useEffect, useRef } from 'react';
import { Technician, TechnicianSchedule, ShiftType, SHIFT_TYPES, OFFICIAL_LEGEND_ITEMS, OffRequest, SchedulePeriod } from '../types';
import { formatDisplayDate, parseDateKey, isSaturday, isSunday, MONTHS_PT } from '../utils/dateUtils';
import { AuditResult, isOffShift, isWorkingShift } from '../utils/validator';
import { DDD_INFO } from '../data/defaultTechnicians';
import { Filter, Search, AlertTriangle, Star, Trash2, Check, FileSpreadsheet, X, HelpCircle } from 'lucide-react';

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
  onSave?: () => void;
  onLoadOfficialSchedule?: () => void;
}

interface ActiveCellPicker {
  techId: string;
  techName: string;
  date: string;
  currentShift: ShiftType;
  top: number;
  left: number;
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
  onClearSchedule,
  onSave,
  onLoadOfficialSchedule
}) => {
  const [selectedDDD, setSelectedDDD] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePicker, setActivePicker] = useState<ActiveCellPicker | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click or escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivePicker(null);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setActivePicker(null);
      }
    };
    if (activePicker) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activePicker]);

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

  const handleCellClick = (e: React.MouseEvent, tech: Technician, date: string, currentShift: ShiftType) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Calculate picker popover position safely within viewport
    let left = rect.left + window.scrollX - 120;
    let top = rect.bottom + window.scrollY + 6;

    if (left + 320 > windowWidth) {
      left = windowWidth - 330;
    }
    if (left < 10) left = 10;

    if (top + 260 > windowHeight + window.scrollY) {
      top = rect.top + window.scrollY - 270;
    }

    setActivePicker({
      techId: tech.id,
      techName: tech.name,
      date,
      currentShift,
      top,
      left
    });
  };

  const selectShiftForCell = (shift: ShiftType) => {
    if (!activePicker) return;
    onUpdateShift(activePicker.techId, activePicker.date, shift);
    setActivePicker(null);
  };

  const getShiftBadgeStyle = (shift: string) => {
    const norm = shift === 'T' ? 'TB' : shift === 'F' ? 'FG' : shift === 'FE' ? 'FR' : shift === 'LI' ? 'LIC' : shift === 'AT' ? 'A' : shift;
    const item = SHIFT_TYPES[norm];
    if (item && item.badgeClass) {
      return item.badgeClass;
    }
    return 'bg-white text-slate-800 border-slate-300 font-bold';
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

        {/* Search, Clear & Save Roster */}
        <div className="flex items-center gap-2">
          {onLoadOfficialSchedule && (
            <button
              onClick={onLoadOfficialSchedule}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Carregar Escala Oficial da Planilha (Novembro e Dezembro 2026)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Escala da Planilha</span>
            </button>
          )}

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

          <button
            onClick={() => {
              if (window.confirm('Deseja salvar todas as alterações na escala?')) {
                onSave?.();
              }
            }}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Salvar alterações no Supabase"
          >
            <Check className="w-3.5 h-3.5 text-white" />
            <span>Salvar Escala</span>
          </button>

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
                        onClick={(e) => handleCellClick(e, tech, dateKey, (shift === '-' ? 'TB' : shift) as ShiftType)}
                        className={`p-0.5 text-center border-r border-slate-100 dark:border-slate-800 cursor-pointer transition-all relative hover:ring-2 hover:ring-indigo-500 hover:z-10 ${cellBg}`}
                        title={`${tech.name} - ${formatDisplayDate(dateKey)}: ${shift} - Clique para alterar a escala`}
                      >
                        <div className="w-full h-7 flex items-center justify-center relative">
                          <span
                            className={`w-7 h-5 flex items-center justify-center text-[10px] rounded-xs transition-transform ${badgeStyle}`}
                          >
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

      {/* Floating Shift Picker Popover */}
      {activePicker && (
        <div
          ref={pickerRef}
          style={{ top: `${activePicker.top}px`, left: `${activePicker.left}px` }}
          className="fixed z-50 w-[310px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border-2 border-indigo-500 p-3 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="truncate max-w-[220px]">
              <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                {activePicker.techName}
              </div>
              <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                {formatDisplayDate(activePicker.date)} (Atual: {activePicker.currentShift})
              </div>
            </div>
            <button
              onClick={() => setActivePicker(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Selecione a Escala / Folga:
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-[290px] overflow-y-auto pr-0.5">
            {OFFICIAL_LEGEND_ITEMS.map(item => {
              const isSelected = activePicker.currentShift === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => selectShiftForCell(item.type)}
                  style={{
                    backgroundColor: item.bgColor,
                    color: item.textColor,
                    borderColor: item.borderColor
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer hover:brightness-95 hover:scale-[1.02] shadow-2xs ${
                    isSelected ? 'ring-2 ring-indigo-600 font-black' : ''
                  }`}
                  title={`${item.shortLabel}: ${item.label} (${item.isWork ? 'Trabalho' : 'Quebra 7 dias'})`}
                >
                  <span className="w-7 h-5 flex items-center justify-center text-[10px] font-extrabold rounded-xs bg-white/70 shadow-2xs shrink-0">
                    {item.shortLabel}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold truncate leading-tight">
                      {item.label}
                    </div>
                    <div className="text-[9px] opacity-80 truncate leading-tight">
                      {item.isWork ? 'Dia Trabalhado' : 'Quebra 7 dias'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>💡 Esc = fechar</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Salva automaticamente</span>
          </div>
        </div>
      )}

      {/* Official Legenda matching User's Exact Reference Image */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-[#e2efda] text-[#274e13] border border-[#c5e0b4] font-black text-xs uppercase tracking-wider shadow-2xs">
              LEGENDA OFICIAL SPI
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Disponível para seleção em todos os dias e colaboradores
            </span>
          </div>
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 px-2.5 py-1 rounded-lg">
            ⚠️ Regra: Todas as nomenclaturas quebram os 7 dias seguidos, exceto <strong>TB</strong> (Dia Trabalhado).
          </div>
        </div>

        {/* Legend grid formatted exactly as the reference table */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {OFFICIAL_LEGEND_ITEMS.map(item => (
            <div
              key={item.type}
              style={{
                backgroundColor: item.bgColor,
                borderColor: item.borderColor
              }}
              className="flex items-center gap-2 p-2 rounded-lg border shadow-2xs transition-transform hover:scale-[1.01]"
            >
              <span
                style={{
                  color: item.textColor,
                  borderColor: item.borderColor
                }}
                className="w-9 h-6 flex items-center justify-center font-black text-xs rounded-xs bg-white/80 border shadow-2xs shrink-0"
              >
                {item.shortLabel}
              </span>
              <div className="min-w-0 flex-1">
                <div style={{ color: item.textColor }} className="font-extrabold text-xs truncate">
                  {item.label}
                </div>
                <div style={{ color: item.textColor }} className="text-[10px] opacity-80 truncate">
                  {item.isWork ? 'Dia Trabalhado' : 'Quebra 7 dias'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
          💡 Para alterar a escala de qualquer colaborador em qualquer dia, basta <strong>clicar sobre a célula do dia</strong> na tabela e escolher a opção desejada.
        </div>
      </div>
    </div>
  );
};
