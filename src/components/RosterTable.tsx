import React, { useState } from 'react';
import { Technician, TechnicianSchedule, ShiftType, SHIFT_TYPES, OffRequest, SchedulePeriod } from '../types';
import { formatDisplayDate, parseDateKey, isSaturday, isSunday, MONTHS_PT } from '../utils/dateUtils';
import { AuditResult } from '../utils/validator';
import { DDD_INFO } from '../data/defaultTechnicians';
import { Filter, Search, AlertTriangle, Star, MessageSquare } from 'lucide-react';

interface RosterTableProps {
  technicians: Technician[];
  schedules: Record<string, TechnicianSchedule>;
  dates: string[];
  period: SchedulePeriod;
  auditResult: AuditResult;
  offRequests: OffRequest[];
  onUpdateShift: (techId: string, date: string, shift: ShiftType, notes?: string) => void;
  onOpenRequests: (techId?: string) => void;
}

export const RosterTable: React.FC<RosterTableProps> = ({
  technicians,
  schedules,
  dates,
  period,
  auditResult,
  offRequests,
  onUpdateShift,
  onOpenRequests
}) => {
  const [selectedDDD, setSelectedDDD] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCellPopover, setActiveCellPopover] = useState<{ techId: string; date: string } | null>(null);

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

  // Pre-index off requests by techId and date for fast lookup
  const requestsMap = new Map<string, OffRequest>();
  for (const req of offRequests) {
    requestsMap.set(`${req.technicianId}__${req.date}`, req);
  }

  const handleCellClick = (techId: string, date: string, currentShift: ShiftType) => {
    // Quick toggle: T -> F -> FD -> T
    if (currentShift === 'T') {
      onUpdateShift(techId, date, 'F');
    } else if (currentShift === 'F') {
      onUpdateShift(techId, date, 'FD');
    } else {
      onUpdateShift(techId, date, 'T');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      {/* Top Filter and Search Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5" />
            Região DDD:
          </div>

          <button
            onClick={() => setSelectedDDD('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedDDD === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
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
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>DDD {ddd}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar técnico..."
            className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Main Roster Matrix Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] border-t border-slate-100">
        <table className="w-full text-left border-collapse min-w-max select-none">
          <thead>
            {/* Top Month Group Headers */}
            <tr className="bg-slate-100/90 text-slate-700 text-xs font-semibold border-b border-slate-200 sticky top-0 z-30">
              <th className="sticky left-0 z-40 bg-slate-100 px-4 py-2.5 min-w-[200px] border-r border-slate-200 shadow-xs">
                Técnico & Região
              </th>
              <th className="sticky left-[200px] z-40 bg-slate-100 px-3 py-2.5 w-[70px] text-center border-r border-slate-200">
                Trab.
              </th>
              <th className="sticky left-[270px] z-40 bg-slate-100 px-3 py-2.5 w-[70px] text-center border-r border-slate-200">
                Folgas
              </th>
              <th className="sticky left-[340px] z-40 bg-slate-100 px-3 py-2.5 w-[85px] text-center border-r border-slate-300 shadow-r">
                F. Dupla
              </th>

              {monthGroups.map((mg, i) => (
                <th
                  key={i}
                  colSpan={mg.dates.length}
                  className="px-4 py-2 text-center border-r border-slate-300 bg-gradient-to-r from-slate-100 to-indigo-50/50 text-indigo-900 font-bold uppercase tracking-wider text-[11px]"
                >
                  {mg.monthName} {mg.year} ({mg.dates.length} dias)
                </th>
              ))}
            </tr>

            {/* Second Header Row: Day numbers and Weekday */}
            <tr className="bg-slate-50 text-[11px] font-medium text-slate-600 border-b border-slate-200 sticky top-[37px] z-30">
              <th className="sticky left-0 z-40 bg-slate-50 px-4 py-2 border-r border-slate-200 font-semibold text-slate-700">
                {filteredTechs.length} técnicos listados
              </th>
              <th className="sticky left-[200px] z-40 bg-slate-50 px-1 py-2 text-center border-r border-slate-200 text-[10px] text-slate-500">
                Total
              </th>
              <th className="sticky left-[270px] z-40 bg-slate-50 px-1 py-2 text-center border-r border-slate-200 text-[10px] text-slate-500">
                Total
              </th>
              <th className="sticky left-[340px] z-40 bg-slate-50 px-1 py-2 text-center border-r border-slate-300 text-[10px] text-slate-500 shadow-r">
                Sáb+Dom
              </th>

              {dates.map(d => {
                const dateObj = parseDateKey(d);
                const dayNum = dateObj.getDate();
                const isSat = isSaturday(d);
                const isSun = isSunday(d);

                let headerBg = 'bg-slate-50 text-slate-700';
                if (isSun) headerBg = 'bg-blue-100/80 text-blue-900 font-bold';
                else if (isSat) headerBg = 'bg-indigo-100/80 text-indigo-900 font-bold';

                return (
                  <th
                    key={d}
                    className={`px-1 py-1.5 text-center min-w-[34px] w-[34px] border-r border-slate-200 ${headerBg}`}
                    title={formatDisplayDate(d)}
                  >
                    <div className="text-[11px] font-bold leading-tight">{dayNum}</div>
                    <div className="text-[9px] uppercase tracking-tighter opacity-80">
                      {isSun ? 'Dom' : isSat ? 'Sáb' : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'][dateObj.getDay() - 1]}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredTechs.map(tech => {
              const techSched = schedules[tech.id];
              const stats = auditResult.techStats[tech.id] || {
                totalWorkDays: 0,
                totalOffDays: 0,
                doubleWeekendsCount: 0,
                maxConsecutiveWorkDays: 0
              };

              const hasMissingDouble = stats.doubleWeekendsCount === 0;
              const hasConsecutiveViolation = stats.maxConsecutiveWorkDays > 6;
              const dddConfig = DDD_INFO[tech.ddd];

              return (
                <tr
                  key={tech.id}
                  className="hover:bg-indigo-50/30 transition-colors group"
                >
                  {/* Sticky Column: Name and DDD */}
                  <td className="sticky left-0 z-20 bg-white group-hover:bg-indigo-50/40 px-4 py-2 border-r border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between gap-1">
                      <div className="truncate max-w-[150px]">
                        <span className="font-semibold text-slate-800 block text-xs truncate">
                          {tech.name}
                        </span>
                        <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded-md font-semibold border ${dddConfig?.badge || 'bg-slate-100'}`}>
                          DDD {tech.ddd}
                        </span>
                      </div>

                      {/* Warnings if any */}
                      {(hasMissingDouble || hasConsecutiveViolation) && (
                        <div
                          className="text-rose-500 p-1 cursor-help"
                          title={
                            hasConsecutiveViolation
                              ? `Atingiu ${stats.maxConsecutiveWorkDays} dias seguidos de trabalho (limite legal: 6).`
                              : `Nenhum fim de semana duplado programado!`
                          }
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Sticky Stats Columns */}
                  <td className="sticky left-[200px] z-20 bg-white group-hover:bg-indigo-50/40 px-2 py-2 text-center border-r border-slate-200 font-semibold text-emerald-700 text-xs">
                    {stats.totalWorkDays}
                  </td>
                  <td className="sticky left-[270px] z-20 bg-white group-hover:bg-indigo-50/40 px-2 py-2 text-center border-r border-slate-200 font-semibold text-blue-700 text-xs">
                    {stats.totalOffDays}
                  </td>
                  <td className="sticky left-[340px] z-20 bg-white group-hover:bg-indigo-50/40 px-2 py-2 text-center border-r border-slate-300 text-xs shadow-r">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold text-[10px] ${
                        stats.doubleWeekendsCount > 0
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {stats.doubleWeekendsCount > 0 && <Star className="w-2.5 h-2.5 fill-purple-700" />}
                      {stats.doubleWeekendsCount}
                    </span>
                  </td>

                  {/* Day cells */}
                  {dates.map(dateKey => {
                    const day = techSched?.days[dateKey];
                    const shift = day?.shift || 'T';
                    const isSat = isSaturday(dateKey);
                    const isSun = isSunday(dateKey);
                    const offReq = requestsMap.get(`${tech.id}__${dateKey}`);

                    // Styling for shift
                    let cellBg = '';
                    let badgeClass = '';

                    if (shift === 'T') {
                      cellBg = isSun ? 'bg-blue-50/40' : isSat ? 'bg-indigo-50/30' : '';
                      badgeClass = 'text-slate-400 hover:text-slate-700 text-[11px] font-medium';
                    } else if (shift === 'F') {
                      badgeClass = 'bg-blue-600 text-white font-bold rounded-md shadow-2xs';
                    } else if (shift === 'FD') {
                      badgeClass = 'bg-purple-600 text-white font-bold rounded-md shadow-2xs ring-1 ring-purple-400';
                    } else {
                      const sInfo = SHIFT_TYPES[shift];
                      badgeClass = `${sInfo?.badgeClass || 'bg-slate-200'} font-bold rounded-md`;
                    }

                    return (
                      <td
                        key={dateKey}
                        onClick={() => handleCellClick(tech.id, dateKey, shift)}
                        className={`p-0.5 text-center border-r border-slate-100 cursor-pointer transition-colors relative hover:ring-2 hover:ring-indigo-400 hover:z-10 ${cellBg}`}
                        title={`${tech.name} - ${formatDisplayDate(dateKey)}: ${
                          shift === 'T' ? 'Trabalho' : shift === 'FD' ? 'Folga Dupla (Sáb+Dom)' : 'Folga'
                        }${day?.notes ? ` (${day.notes})` : ''} - Clique para alterar`}
                      >
                        <div className="w-full h-8 flex items-center justify-center relative">
                          <span className={`w-7 h-6 flex items-center justify-center text-[11px] transition-transform ${badgeClass}`}>
                            {shift}
                          </span>

                          {/* Indicator for Off Request */}
                          {offReq && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenRequests(tech.id);
                              }}
                              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white"
                              title={`Solicitação de folga: ${offReq.reasonCategory} - ${offReq.notes.join(', ')}`}
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

          {/* Bottom Summary Rows */}
          <tfoot>
            {/* Total Working */}
            <tr className="bg-emerald-50/80 text-xs font-semibold text-emerald-900 border-t-2 border-slate-300">
              <td className="sticky left-0 z-20 bg-emerald-100/90 px-4 py-2 border-r border-slate-200 shadow-xs font-bold">
                Técnicos Trabalhando
              </td>
              <td className="sticky left-[200px] z-20 bg-emerald-100/90 px-2 py-2 text-center border-r border-slate-200 font-bold">
                -
              </td>
              <td className="sticky left-[270px] z-20 bg-emerald-100/90 px-2 py-2 text-center border-r border-slate-200 font-bold">
                -
              </td>
              <td className="sticky left-[340px] z-20 bg-emerald-100/90 px-2 py-2 text-center border-r border-slate-300 font-bold shadow-r">
                -
              </td>

              {dates.map(d => {
                let workingCount = 0;
                for (const t of filteredTechs) {
                  const s = schedules[t.id]?.days[d]?.shift || 'T';
                  if (s === 'T') workingCount++;
                }

                return (
                  <td key={d} className="px-1 py-1.5 text-center border-r border-slate-200 font-bold text-[11px]">
                    {workingCount}
                  </td>
                );
              })}
            </tr>

            {/* Total Off */}
            <tr className="bg-blue-50/80 text-xs font-semibold text-blue-900 border-t border-slate-200">
              <td className="sticky left-0 z-20 bg-blue-100/90 px-4 py-2 border-r border-slate-200 shadow-xs font-bold">
                Técnicos de Folga
              </td>
              <td className="sticky left-[200px] z-20 bg-blue-100/90 px-2 py-2 text-center border-r border-slate-200 font-bold">
                -
              </td>
              <td className="sticky left-[270px] z-20 bg-blue-100/90 px-2 py-2 text-center border-r border-slate-200 font-bold">
                -
              </td>
              <td className="sticky left-[340px] z-20 bg-blue-100/90 px-2 py-2 text-center border-r border-slate-300 font-bold shadow-r">
                -
              </td>

              {dates.map(d => {
                let offCount = 0;
                for (const t of filteredTechs) {
                  const s = schedules[t.id]?.days[d]?.shift || 'T';
                  if (s === 'F' || s === 'FD' || s === 'FE' || s === 'LI' || s === 'AT') offCount++;
                }

                const isWeekendDay = isSaturday(d) || isSunday(d);
                const isExcessiveWeekend = isWeekendDay && offCount >= 4;

                return (
                  <td
                    key={d}
                    className={`px-1 py-1.5 text-center border-r border-slate-200 font-bold text-[11px] ${
                      isExcessiveWeekend ? 'bg-rose-200 text-rose-900 font-black' : ''
                    }`}
                    title={isExcessiveWeekend ? 'Alerta: Mais de 3 técnicos de folga no mesmo fim de semana!' : undefined}
                  >
                    {offCount}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend & Help Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-slate-700">Legenda:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-white border border-slate-300 text-slate-600 font-semibold flex items-center justify-center text-[10px]">T</span>
            <span>Trabalho</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">F</span>
            <span>Folga Regular</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-purple-600 text-white font-bold flex items-center justify-center text-[10px]">FD</span>
            <span className="font-semibold text-purple-900">Folga Dupla (Sáb + Dom)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Pedido de Folga Cadastrado</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 italic">
          💡 Dica: Clique em qualquer célula para alternar rapidamente entre Trabalho (T), Folga (F) e Folga Dupla (FD).
        </div>
      </div>
    </div>
  );
};
