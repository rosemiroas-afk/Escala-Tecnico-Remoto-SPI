import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Technician, TechnicianSchedule, ShiftType, SHIFT_TYPES, OFFICIAL_LEGEND_ITEMS, OffRequest, SchedulePeriod } from '../types';
import { formatDisplayDate, parseDateKey, isSaturday, isSunday, MONTHS_PT } from '../utils/dateUtils';
import { AuditResult, isOffShift, isWorkingShift, validateSchedule } from '../utils/validator';
import { DDD_INFO } from '../data/defaultTechnicians';
import { Filter, Search, AlertTriangle, Star, Trash2, Check, FileSpreadsheet, X, HelpCircle, Upload, RotateCcw, Eye, Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

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
  onUploadScheduleFile?: (file: File) => void;
  onOpenGenerator?: () => void;
  readOnly?: boolean;
}

interface ActiveCellPicker {
  techId: string;
  techName: string;
  date: string;
  currentShift: ShiftType;
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
  onLoadOfficialSchedule,
  onUploadScheduleFile,
  onOpenGenerator,
  readOnly = false
}) => {
  const [selectedDDD, setSelectedDDD] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePicker, setActivePicker] = useState<ActiveCellPicker | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadScheduleFile) {
      onUploadScheduleFile(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

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

  // Available months extracted from dates (e.g. ['2026-11', '2026-12'])
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const d of dates) {
      if (d && d.length >= 7) {
        set.add(d.slice(0, 7));
      }
    }
    return Array.from(set).sort();
  }, [dates]);

  // Selected Month Filter: 'all' or 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Keep selectedMonth synchronized if availableMonths change
  useEffect(() => {
    if (selectedMonth !== 'all' && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth('all');
    }
  }, [availableMonths, selectedMonth]);

  // Filtered dates based on selectedMonth
  const displayDates = useMemo(() => {
    if (selectedMonth === 'all') return dates;
    return dates.filter(d => d.startsWith(selectedMonth));
  }, [dates, selectedMonth]);

  // Dynamic audit specifically for displayDates
  const filteredAuditResult = useMemo(() => {
    if (selectedMonth === 'all') return auditResult;
    return validateSchedule(technicians, schedules, displayDates, offRequests);
  }, [technicians, schedules, displayDates, offRequests, selectedMonth, auditResult]);

  // Month navigation helpers
  const currentMonthIndex = selectedMonth === 'all' ? -1 : availableMonths.indexOf(selectedMonth);

  const handlePrevMonth = () => {
    if (availableMonths.length === 0) return;
    if (currentMonthIndex <= 0) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    } else {
      setSelectedMonth(availableMonths[currentMonthIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    if (availableMonths.length === 0) return;
    if (currentMonthIndex === -1 || currentMonthIndex >= availableMonths.length - 1) {
      setSelectedMonth(availableMonths[0]);
    } else {
      setSelectedMonth(availableMonths[currentMonthIndex + 1]);
    }
  };

  const getCycleBadge = (mKey: string) => {
    if (mKey === 'all') return null;
    const m = Number(mKey.split('-')[1]);
    if (m === 2) return 'Transição Fev';
    return m % 2 !== 0 ? 'Mês 1 (Mestre)' : 'Mês 2 (Mestre)';
  };

  // Split displayDates by month for header grouping
  const monthGroups: { monthName: string; year: number; dates: string[] }[] = [];
  let currentMonthKey = '';
  let currentGroup: { monthName: string; year: number; dates: string[] } | null = null;

  for (const d of displayDates) {
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

  const handleCellClick = (tech: Technician, date: string, currentShift: ShiftType | '-') => {
    if (readOnly) return;
    setActivePicker({
      techId: tech.id,
      techName: tech.name,
      date,
      currentShift: currentShift === '-' ? 'TB' : currentShift
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

          {/* Month Selector Bar na Guia Matriz */}
          <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3 ml-1 flex-wrap">
            <div className="flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mr-1">
              <Calendar className="w-3.5 h-3.5" />
              Mês da Escala:
            </div>

            {/* Mês Anterior */}
            <button
              onClick={handlePrevMonth}
              title="Ir para o Mês Anterior"
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Botões dos Meses Disponíveis */}
            {availableMonths.map(mKey => {
              const [y, m] = mKey.split('-').map(Number);
              const monthNum = String(m).padStart(2, '0');
              const monthName = MONTHS_PT[m - 1] || '';
              const isSelected = selectedMonth === mKey;
              const cycleBadge = getCycleBadge(mKey);
              return (
                <button
                  key={mKey}
                  onClick={() => setSelectedMonth(mKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                  title={`Visualizar apenas a escala de ${monthName} de ${y}`}
                >
                  <span>{monthNum}/{y}</span>
                  <span className={`text-[10px] font-normal ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    ({monthName.slice(0, 3)})
                  </span>
                  {cycleBadge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}>
                      {cycleBadge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Próximo Mês */}
            <button
              onClick={handleNextMonth}
              title="Ir para o Próximo Mês"
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Todos os Meses */}
            <button
              onClick={() => setSelectedMonth('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
              title="Exibir todos os meses na matriz"
            >
              Todos
            </button>

            </div>
          </div>

        {/* Search, Clear & Save Roster */}
        <div className="flex items-center gap-2">
          {readOnly ? (
            <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Modo Somente Leitura (Sem edição)</span>
            </div>
          ) : (
            <>
              {/* Hidden File Input for CSV/Text Upload */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.txt,.tsv"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Importar Escala da Planilha (Selecione arquivo CSV ou Texto longo do seu computador)"
              >
                <Upload className="w-3.5 h-3.5 text-white" />
                <span>Escala da Planilha</span>
              </button>

              {onLoadOfficialSchedule && (
                <button
                  onClick={onLoadOfficialSchedule}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Restaurar a Escala Oficial caso tenha limpado ou alterado por engano"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Restaurar Escala Oficial</span>
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
            </>
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
              <th className="sticky left-0 z-40 bg-slate-100 dark:bg-slate-800 px-3 py-2 min-w-[220px] w-[220px] border-r border-slate-200 dark:border-slate-700">
                Técnico & Região
              </th>
              <th className="sticky left-[220px] z-40 bg-slate-100 dark:bg-slate-800 px-2 py-2 min-w-[110px] w-[110px] text-center border-r border-slate-200 dark:border-slate-700 text-[11px]">
                Escala (Horário)
              </th>
              <th className="sticky left-[330px] z-40 bg-slate-100 dark:bg-slate-800 px-2 py-2 min-w-[65px] w-[65px] text-center border-r border-slate-200 dark:border-slate-700 text-[11px]">
                TB (Trab)
              </th>
              <th className="sticky left-[395px] z-40 bg-slate-100 dark:bg-slate-800 px-2 py-2 min-w-[65px] w-[65px] text-center border-r border-slate-200 dark:border-slate-700 text-[11px]">
                Folgas
              </th>
              <th className="sticky left-[460px] z-40 bg-slate-100 dark:bg-slate-800 px-2 py-2 min-w-[70px] w-[70px] text-center border-r-2 border-slate-300 dark:border-slate-700 text-[11px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]">
                FD (Dupla)
              </th>

              {monthGroups.map((mg, i) => (
                <th
                  key={i}
                  colSpan={mg.dates.length}
                  className="px-4 py-2 text-center border-r border-slate-300 dark:border-slate-700 bg-indigo-100 dark:bg-slate-800 text-indigo-900 dark:text-indigo-300 font-bold uppercase tracking-wider text-[11px]"
                >
                  {mg.monthName} {mg.year} ({mg.dates.length} dias)
                </th>
              ))}
            </tr>

            {/* Second Header Row: Days of Week */}
            <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 sticky top-[33px] z-30">
              <th className="sticky left-0 z-40 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 min-w-[220px] w-[220px] border-r border-slate-200 dark:border-slate-700">
                {filteredTechs.length} técnicos
              </th>
              <th className="sticky left-[220px] z-40 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 min-w-[110px] w-[110px] text-center border-r border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                Turno
              </th>
              <th className="sticky left-[330px] z-40 bg-slate-100 dark:bg-slate-800 px-1 py-1.5 min-w-[65px] w-[65px] text-center border-r border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                Total
              </th>
              <th className="sticky left-[395px] z-40 bg-slate-100 dark:bg-slate-800 px-1 py-1.5 min-w-[65px] w-[65px] text-center border-r border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                Total
              </th>
              <th className="sticky left-[460px] z-40 bg-slate-100 dark:bg-slate-800 px-1 py-1.5 min-w-[70px] w-[70px] text-center border-r-2 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]">
                2 Dias
              </th>

              {displayDates.map(d => {
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

            {/* Third Header Row: ATUANTES DIA */}
            <tr className="bg-emerald-100 dark:bg-emerald-950 text-[10px] font-black text-emerald-950 dark:text-emerald-100 border-b-2 border-slate-300 sticky top-[65px] z-30">
              <th className="sticky left-0 z-40 bg-emerald-100 dark:bg-emerald-950 px-3 py-1.5 min-w-[220px] w-[220px] border-r border-slate-200 uppercase tracking-wider text-emerald-950 dark:text-emerald-100">
                ATUANTES DIA
              </th>
              <th className="sticky left-[220px] z-40 bg-emerald-100 dark:bg-emerald-950 px-2 py-1.5 min-w-[110px] w-[110px] text-center border-r border-slate-200">
                -
              </th>
              <th className="sticky left-[330px] z-40 bg-emerald-100 dark:bg-emerald-950 px-1 py-1.5 min-w-[65px] w-[65px] text-center border-r border-slate-200">
                -
              </th>
              <th className="sticky left-[395px] z-40 bg-emerald-100 dark:bg-emerald-950 px-1 py-1.5 min-w-[65px] w-[65px] text-center border-r border-slate-200">
                -
              </th>
              <th className="sticky left-[460px] z-40 bg-emerald-100 dark:bg-emerald-950 px-1 py-1.5 min-w-[70px] w-[70px] text-center border-r-2 border-slate-300 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]">
                -
              </th>

              {displayDates.map(d => {
                let workingCount = 0;
                for (const t of filteredTechs) {
                  const s = schedules[t.id]?.days[d]?.shift;
                  if (s && isWorkingShift(s)) workingCount++;
                }

                return (
                  <th
                    key={d}
                    className="px-1 py-1 text-center border-r border-slate-200 font-extrabold text-[11px] text-emerald-900 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950"
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
              const stats = hasSchedule ? (filteredAuditResult.techStats[tech.id] || {
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

              const isTechOnVacation = stats.totalOffDays > 20 && techSched && Object.values(techSched.days).some(d => d.shift === 'FR' || d.shift === 'FE');
              const hasMissingDouble = hasSchedule && stats.doubleWeekendsCount === 0 && !isTechOnVacation;
              const hasConsecutiveViolation = hasSchedule && stats.maxConsecutiveWorkDays > 6;
              const dddConfig = DDD_INFO[tech.ddd];

              return (
                <tr
                  key={tech.id}
                  className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                >
                  {/* Sticky Column 1: Name and DDD */}
                  <td className="sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 px-3 py-1.5 min-w-[220px] w-[220px] border-r border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-1">
                      <div className="truncate max-w-[165px]">
                        <span className="font-normal text-slate-800 dark:text-slate-100 block text-xs truncate">
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
                              : `Sem folga duplada (FD) programada!`
                          }
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Sticky Column 2: Shift Hours (ESCALA) */}
                  <td className="sticky left-[220px] z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 px-2 py-1.5 min-w-[110px] w-[110px] text-center border-r border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    {tech.shiftHours || '08:00 AS 16:20'}
                  </td>

                  {/* Sticky Column 3: Total Work */}
                  <td className="sticky left-[330px] z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 px-1 py-1.5 min-w-[65px] w-[65px] text-center border-r border-slate-200 dark:border-slate-800 font-bold text-emerald-800 dark:text-emerald-400 text-xs">
                    {hasSchedule ? stats.totalWorkDays : '-'}
                  </td>

                  {/* Sticky Column 4: Total Offs */}
                  <td className="sticky left-[395px] z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 px-1 py-1.5 min-w-[65px] w-[65px] text-center border-r border-slate-200 dark:border-slate-800 font-bold text-yellow-900 dark:text-yellow-400 text-xs">
                    {hasSchedule ? stats.totalOffDays : '-'}
                  </td>

                  {/* Sticky Column 5: Double Weekends */}
                  <td className="sticky left-[460px] z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 px-1 py-1.5 min-w-[70px] w-[70px] text-center border-r-2 border-slate-300 dark:border-slate-700 text-xs shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]">
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
                  {displayDates.map(dateKey => {
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
                        onClick={readOnly ? undefined : () => handleCellClick(tech, dateKey, (shift === '-' ? 'TB' : shift) as ShiftType)}
                        className={`p-0.5 text-center border-r border-slate-100 dark:border-slate-800 transition-all relative ${
                          readOnly ? 'cursor-default' : 'cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:z-10'
                        } ${cellBg}`}
                        title={
                          readOnly
                            ? `${tech.name} - ${formatDisplayDate(dateKey)}: ${shift}`
                            : `${tech.name} - ${formatDisplayDate(dateKey)}: ${shift} - Clique para alterar a escala`
                        }
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
                              onClick={readOnly ? undefined : (e) => {
                                e.stopPropagation();
                                onOpenRequests(tech.id);
                              }}
                              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 shadow-2xs ${
                                readOnly ? 'cursor-default' : 'cursor-pointer'
                              } ${
                                (offReq.status === 'aprovado' || offReq.status === 'atendido')
                                  ? 'bg-emerald-500 ring-1 ring-emerald-300'
                                  : (offReq.status === 'reprovado' || offReq.status === 'recusado')
                                  ? 'bg-rose-500 ring-1 ring-rose-300'
                                  : 'bg-amber-400 animate-pulse ring-1 ring-amber-200'
                              }`}
                              title={
                                (offReq.status === 'aprovado' || offReq.status === 'atendido')
                                  ? `Folga Aprovada (Verde): ${offReq.reasonCategory} - ${offReq.notes.join(', ')}`
                                  : (offReq.status === 'reprovado' || offReq.status === 'recusado')
                                  ? `Folga Reprovada (Vermelha): ${offReq.reasonCategory} - ${offReq.notes.join(', ')}`
                                  : `Solicitação em Análise (Amarela): ${offReq.reasonCategory} - ${offReq.notes.join(', ')}`
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

      {/* Centered Shift Selection Modal - Exact match of Reference Image 2 */}
      {activePicker && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActivePicker(null)}
        >
          <div
            ref={pickerRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Alterar Escala do Dia
                </h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  {activePicker.techName} &bull; {formatDisplayDate(activePicker.date)} (Atual: {activePicker.currentShift})
                </p>
              </div>
              <button
                onClick={() => setActivePicker(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs font-semibold text-slate-500 mb-2">
              Selecione qualquer nomenclatura da legenda oficial:
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
              {OFFICIAL_LEGEND_ITEMS.map(item => (
                <button
                  key={item.type}
                  onClick={() => selectShiftForCell(item.type)}
                  style={{
                    backgroundColor: item.bgColor,
                    color: item.textColor,
                    borderColor: item.borderColor
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl border text-left cursor-pointer hover:brightness-95 hover:scale-[1.02] transition-all shadow-2xs"
                >
                  <span className="w-8 h-6 flex items-center justify-center text-xs font-black rounded-sm bg-white border border-slate-300 shadow-2xs shrink-0 text-black">
                    {item.shortLabel}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate leading-tight text-black">
                      {item.label}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>⚠️ Todas interrompem a contagem de dias exceto TB</span>
              <button
                onClick={() => setActivePicker(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Fechar
              </button>
            </div>
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
            ⚠️ Regra: Todas as nomenclaturas interrompem a contagem de dias seguidos, exceto <strong>TB</strong> (Dia Trabalhado).
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
                className="w-9 h-6 flex items-center justify-center font-black text-xs rounded-xs bg-white border border-slate-300 shadow-2xs shrink-0 text-black"
              >
                {item.shortLabel}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-normal text-xs truncate text-black">
                  {item.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
          {readOnly ? (
            <span>🔒 <strong>Modo Somente Leitura:</strong> Esta conta possui acesso exclusivo de visualização da matriz e do dashboard de análises. Nenhuma alteração na escala é permitida.</span>
          ) : (
            <span>💡 Para alterar a escala de qualquer colaborador em qualquer dia, basta <strong>clicar sobre a célula do dia</strong> na tabela e escolher a opção desejada.</span>
          )}
        </div>
      </div>
    </div>
  );
};
