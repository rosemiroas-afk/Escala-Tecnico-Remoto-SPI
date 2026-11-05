import React, { useState, useEffect, useMemo } from 'react';
import { Technician, TechnicianSchedule, SchedulePeriod, OffRequest, ShiftType, AppUser, SHIFT_TYPES, OFFICIAL_LEGEND_ITEMS, Atestado } from '../types';
import { formatDisplayDate, formatFullDate, parseDateKey, isSaturday, isSunday, extractWeekends, MONTHS_PT } from '../utils/dateUtils';
import { AuditResult } from '../utils/validator';
import { generateIndividualWhatsAppMessage } from '../utils/exportUtils';
import { DDD_INFO } from '../data/defaultTechnicians';
import { AtestadoViewerModal } from './AtestadoViewerModal';
import {
  User,
  Calendar,
  Star,
  Copy,
  Check,
  Send,
  Plus,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Lock,
  X,
  FileText,
  Download,
  Eye,
  Trash2,
  Stethoscope
} from 'lucide-react';

interface TechnicianViewProps {
  technicians: Technician[];
  schedules: Record<string, TechnicianSchedule>;
  dates: string[];
  period: SchedulePeriod;
  auditResult: AuditResult;
  offRequests: OffRequest[];
  currentUser: AppUser | null;
  atestados?: Atestado[];
  onAddRequest: (req: Omit<OffRequest, 'id' | 'createdAt' | 'status'>) => void;
  onUpdateShift: (techId: string, date: string, shift: ShiftType) => void;
  onOpenRequestsModal?: (techId: string) => void;
  onOpenAtestadoModal?: (tech: Technician) => void;
  onDeleteAtestado?: (id: string) => void;
  onSave?: () => void;
  darkMode?: boolean;
}

export const TechnicianView: React.FC<TechnicianViewProps> = ({
  technicians,
  schedules,
  dates,
  period,
  auditResult,
  offRequests,
  currentUser,
  atestados = [],
  onAddRequest,
  onUpdateShift,
  onOpenRequestsModal,
  onOpenAtestadoModal,
  onDeleteAtestado,
  onSave,
  darkMode = false
}) => {
  const activeTechs = technicians.filter(t => t.active);
  const isAdmin = currentUser?.role === 'admin';

  // If user is technician, lock to their own ID strictly!
  const initialTechId = !isAdmin && currentUser?.technicianId
    ? currentUser.technicianId
    : activeTechs[0]?.id || '';

  const [selectedTechId, setSelectedTechId] = useState<string>(initialTechId);
  const [copied, setCopied] = useState<boolean>(false);

  // Keep synced if user switches
  useEffect(() => {
    if (!isAdmin && currentUser?.technicianId) {
      setSelectedTechId(currentUser.technicianId);
    }
  }, [currentUser, isAdmin]);

  // Quick request form states
  const [reqDate, setReqDate] = useState<string>(dates[0] || '');
  const [reqCategory, setReqCategory] = useState<'casamento' | 'medico' | 'aniversario' | 'pessoal' | 'outro'>('casamento');
  const [reqNote, setReqNote] = useState<string>('');
  const [adminPickerDate, setAdminPickerDate] = useState<string | null>(null);
  const [viewerAtestado, setViewerAtestado] = useState<Atestado | null>(null);

  const currentTech = technicians.find(t => t.id === selectedTechId) || activeTechs[0];
  const currentSched = currentTech ? schedules[currentTech.id] : null;
  const techRequests = currentTech
    ? offRequests
        .filter(r => r.technicianId === currentTech.id)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  // Atestados deste técnico específico, organizados por data mais recente primeiro
  const techAtestados = useMemo(() => {
    return atestados
      .filter(a => a.technicianId === currentTech?.id)
      .sort((a, b) => b.dataAtestado.localeCompare(a.dataAtestado));
  }, [atestados, currentTech?.id]);

  // Agrupamento de atestados por mês para análise organizada
  const atestadosByMonth = useMemo(() => {
    const groups: Record<string, Atestado[]> = {};
    techAtestados.forEach(att => {
      const monthKey = att.mesReferencia || att.dataAtestado.substring(0, 7);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(att);
    });
    return groups;
  }, [techAtestados]);
  // Extrai todos os meses disponíveis das datas (excluindo meses com menos de 5 dias como Outubro)
  const availableMonths = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of dates) {
      if (d && d.length >= 7) {
        const mKey = d.slice(0, 7);
        counts[mKey] = (counts[mKey] || 0) + 1;
      }
    }
    const list = Object.keys(counts).filter(mKey => counts[mKey] >= 5).sort();
    return list.length > 0 ? list : Object.keys(counts).sort();
  }, [dates]);

  // Filtro de mês estrito (exibe exclusivamente um único mês por vez)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const targetKey = `${period.startYear}-${String(period.startMonth + 1).padStart(2, '0')}`;
    const set = new Set(dates.map(d => d.slice(0, 7)));
    if (set.has(targetKey)) return targetKey;
    const sorted = Array.from(set).sort();
    return sorted[0] || '2026-11';
  });

  // Mantém selectedMonth sincronizado se availableMonths mudar
  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Datas estritamente filtradas para o mês selecionado
  const displayDates = useMemo(() => {
    return dates.filter(d => d.startsWith(selectedMonth));
  }, [dates, selectedMonth]);

  // Formatação amigável do nome do mês (ex: "Novembro de 2026")
  const formatMonthName = (mKey: string) => {
    const parts = mKey.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    return `${MONTHS_PT[m]} de ${y}`;
  };

  // Navegação entre meses
  const currentMonthIndex = availableMonths.indexOf(selectedMonth);

  const handlePrevMonth = () => {
    if (availableMonths.length <= 1) return;
    if (currentMonthIndex <= 0) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    } else {
      setSelectedMonth(availableMonths[currentMonthIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    if (availableMonths.length <= 1) return;
    if (currentMonthIndex === -1 || currentMonthIndex >= availableMonths.length - 1) {
      setSelectedMonth(availableMonths[0]);
    } else {
      setSelectedMonth(availableMonths[currentMonthIndex + 1]);
    }
  };

  // Atualiza reqDate para a primeira data do mês quando mudar o mês
  useEffect(() => {
    if (displayDates.length > 0 && (!reqDate || !displayDates.includes(reqDate))) {
      setReqDate(displayDates[0]);
    }
  }, [displayDates]);

  if (!currentTech || !currentSched) {
    return <div className="p-8 text-center text-slate-500">Nenhum técnico disponível.</div>;
  }

  // Estatísticas específicas do mês selecionado
  const monthStats = useMemo(() => {
    let totalOffDays = 0;
    let totalWorkDays = 0;
    let weekendDaysOff = 0;
    let maxConsecutiveWorkDays = 0;
    let currentConsecutive = 0;
    let inversionsCount = 0;

    for (let i = 0; i < displayDates.length; i++) {
      const d = displayDates[i];
      const shift = currentSched.days[d]?.shift || 'TB';
      const isOff = shift === 'FD' || shift === 'FG' || shift === 'FC' || shift === 'FN' || shift === 'FE' || shift === 'FR' || shift === 'F';
      if (isOff) {
        totalOffDays++;
        if (isSaturday(d) || isSunday(d)) {
          weekendDaysOff++;
        }
        currentConsecutive = 0;
        if (shift === 'FC') {
          inversionsCount++;
        }
      } else if (shift === 'TB' || shift === 'T') {
        totalWorkDays++;
        currentConsecutive++;
        if (currentConsecutive > maxConsecutiveWorkDays) {
          maxConsecutiveWorkDays = currentConsecutive;
        }
      }
    }

    const monthWeekends = extractWeekends(displayDates);
    const doubleWeekendsCount = monthWeekends.filter(wk => {
      const sat = currentSched.days[wk.saturday]?.shift;
      const sun = currentSched.days[wk.sunday]?.shift;
      const isSatOff = sat === 'FD' || sat === 'FG' || sat === 'F';
      const isSunOff = sun === 'FD' || sun === 'FG' || sun === 'F';
      return isSatOff && isSunOff;
    }).length;

    return {
      totalOffDays,
      doubleWeekendsCount,
      totalWorkDays,
      weekendDaysOff,
      maxConsecutiveWorkDays,
      inversionsCount
    };
  }, [currentSched, displayDates]);

  const handleCopyWhatsApp = () => {
    const text = generateIndividualWhatsAppMessage(
      currentTech,
      currentSched,
      displayDates,
      { ...period, name: formatMonthName(selectedMonth) },
      offRequests
    );
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const text = generateIndividualWhatsAppMessage(
      currentTech,
      currentSched,
      displayDates,
      { ...period, name: formatMonthName(selectedMonth) },
      offRequests
    );
    const cleanPhone = currentTech.phone ? currentTech.phone.replace(/\D/g, '') : '';
    const fullPhone = cleanPhone ? (cleanPhone.length <= 9 ? `${currentTech.ddd}${cleanPhone}` : cleanPhone) : '';
    const url = fullPhone
      ? `https://wa.me/55${fullPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleQuickAddRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDate) return;
    onAddRequest({
      technicianId: currentTech.id,
      date: reqDate,
      reasonCategory: reqCategory,
      priority: 'alta',
      notes: reqNote.trim() ? [reqNote.trim()] : ['Compromisso pessoal agendado']
    });
    setReqNote('');
  };

  return (
    <div className="space-y-6">
      {/* Top Profile / Selector Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs">
            <User className="w-6 h-6" />
          </div>

          <div>
            {isAdmin ? (
              <>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Selecione o Técnico para Visualização Individual:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedTechId}
                    onChange={e => setSelectedTechId(e.target.value)}
                    className="text-base font-normal text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 min-w-[280px]"
                  >
                    {[...activeTechs]
                      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Turno: {currentTech.shiftHours || '08:00 AS 16:20'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                    Seu Painel Individual Privativo
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    DDD {currentTech.ddd}
                  </span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-500" />
                    {currentTech.shiftHours || '08:00 AS 16:20'}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {currentTech.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {DDD_INFO[currentTech.ddd]?.region} • Escala 6x1 Pessoal
                </p>
              </>
            )}
          </div>
        </div>

        {/* WhatsApp Actions & Save */}
        <div className="flex items-center gap-3">
          {isAdmin && onSave && (
            <button
              onClick={() => {
                if (window.confirm('Deseja salvar todas as alterações na escala?')) {
                  onSave();
                }
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              title="Salvar alterações no Firebase"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Escala</span>
            </button>
          )}

          <button
            onClick={handleCopyWhatsApp}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copiar para WhatsApp</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenWhatsApp}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Month Selector Bar - Individual Mês a Mês (Tanto para Admin quanto Colaborador) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Filtro de Mês (Visualização Individual):
              </span>
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                1 Mês por vez
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white capitalize mt-0.5">
              {formatMonthName(selectedMonth)}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-2">
                ({displayDates.length} dias no mês)
              </span>
            </h3>
          </div>
        </div>

        {/* Botões dos Meses Disponíveis */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          {availableMonths.map(mKey => {
            const isSelected = selectedMonth === mKey;
            const count = dates.filter(d => d.startsWith(mKey)).length;
            return (
              <button
                key={mKey}
                type="button"
                onClick={() => setSelectedMonth(mKey)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{formatMonthName(mKey)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {count}d
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Summary Cards (Específicos do Mês Selecionado) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Double Weekend / Folga Duplada Card */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-100 uppercase tracking-wider">
              Folga Duplada (FD)
            </span>
            <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold">
              {monthStats.doubleWeekendsCount} {monthStats.doubleWeekendsCount === 1 ? 'Garantida' : 'Garantidas'}
            </div>
            <p className="text-xs text-purple-100 mt-1">
              {monthStats.doubleWeekendsCount > 0
                ? `${monthStats.doubleWeekendsCount} fim de semana duplado em ${formatMonthName(selectedMonth)}`
                : `Nenhum fim de semana duplado em ${formatMonthName(selectedMonth)}`}
            </p>
          </div>
          <div className="text-[11px] bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-xs font-medium w-fit">
            Sáb + Dom de Descanso
          </div>
        </div>

        {/* Total Offs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Folgas</span>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {monthStats.totalOffDays} dias
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sendo {monthStats.weekendDaysOff} folgas em fins de semana ({formatMonthName(selectedMonth)})
            </p>
          </div>
          <div className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg font-medium w-fit">
            Descanso no Mês
          </div>
        </div>

        {/* Total Work Days (TB) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Dias Trabalhados (TB)</span>
            <Briefcase className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
              {monthStats.totalWorkDays} dias
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Atuação em {formatMonthName(selectedMonth)}
            </p>
          </div>
          <div className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg font-medium w-fit">
            Produtividade Mensal
          </div>
        </div>

        {/* Consecutive Days Work Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Dias Seguidos Máx.</span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="my-3">
            <div className={`text-3xl font-extrabold ${
              monthStats.maxConsecutiveWorkDays > 6 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'
            }`}>
              {monthStats.maxConsecutiveWorkDays} dias
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {monthStats.maxConsecutiveWorkDays <= 6
                ? '✅ Conforme com o limite legal CLT'
                : '⚠️ Atenção aos dias seguidos'}
            </p>
          </div>
          <div className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg font-medium w-fit">
            Máximo de trabalho contínuo
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar View + Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Grid (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Calendário da Escala - <span className="font-normal">{currentTech.name}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAdmin
                  ? `Clique em qualquer dia para alterar o status. Exibindo ${formatMonthName(selectedMonth)}.`
                  : `Suas folgas programadas e dias de trabalho em ${formatMonthName(selectedMonth)} (${displayDates.length} dias).`}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${DDD_INFO[currentTech.ddd]?.badge}`}>
              DDD {currentTech.ddd}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {displayDates.map(d => {
              const day = currentSched.days[d];
              const rawShift = day?.shift || 'TB';
              const shift = rawShift === 'T' ? 'TB' : rawShift === 'F' ? 'FG' : rawShift;
              const isSat = isSaturday(d);
              const isSun = isSunday(d);
              const dObj = parseDateKey(d);
              const dayNum = dObj.getDate();
              const req = techRequests.find(r => r.date === d);

              const shiftDef = SHIFT_TYPES[shift] || SHIFT_TYPES['TB'];

              return (
                <div
                  key={d}
                  onClick={() => {
                    if (isAdmin) {
                      setAdminPickerDate(d);
                    } else {
                      // Technician clicks: set as date for request
                      setReqDate(d);
                    }
                  }}
                  style={{
                    backgroundColor: shiftDef.isWork ? undefined : `${shiftDef.bgColor}22`,
                    borderColor: shiftDef.borderColor
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[85px] relative hover:shadow-md hover:scale-[1.01] bg-white dark:bg-slate-800`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isSun ? 'text-amber-700 dark:text-amber-400 font-bold' : isSat ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                      {isSun ? 'Dom' : isSat ? 'Sáb' : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'][dObj.getDay() - 1]}
                    </span>
                    <span className="text-base font-extrabold text-black dark:text-white">{dayNum}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span
                      style={{
                        backgroundColor: shiftDef.bgColor,
                        borderColor: shiftDef.borderColor
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-wider font-black border shadow-2xs shrink-0 text-black"
                    >
                      {shiftDef.shortLabel}
                    </span>

                    <span className="text-[10px] font-normal truncate text-black dark:text-white">
                      {shiftDef.label}
                    </span>

                    {shift === 'FD' && <Star className="w-3.5 h-3.5 fill-orange-500 text-orange-500 shrink-0" />}
                  </div>

                  {req && (
                    <div
                      className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 shadow-2xs ${
                        (req.status === 'atendido' || req.status === 'aprovado')
                          ? 'bg-emerald-500 ring-1 ring-emerald-300'
                          : (req.status === 'reprovado' || req.status === 'recusado')
                          ? 'bg-rose-500 ring-1 ring-rose-300'
                          : 'bg-amber-400 animate-pulse ring-1 ring-amber-200'
                      }`}
                      title={
                        (req.status === 'atendido' || req.status === 'aprovado')
                          ? `Folga Aprovada (Verde): ${req.notes.join(', ')}`
                          : (req.status === 'reprovado' || req.status === 'recusado')
                          ? `Folga Reprovada (Vermelha): ${req.notes.join(', ')}`
                          : `Folga em Análise (Amarela): ${req.notes.join(', ')}`
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Quick Add Off Request & Registered Requests (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Request Box */}
          {/* Quick Request Box */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 transition-colors">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Solicitar Folga (Compromisso / Casamento)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Informe a data e adicione observações para avaliação pelo gestor.
            </p>

            <form onSubmit={handleQuickAddRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Data Desejada:</label>
                <select
                  value={reqDate}
                  onChange={e => setReqDate(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100"
                >
                  {displayDates.map(d => (
                    <option key={d} value={d}>
                      {formatDisplayDate(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Motivo:</label>
                <select
                  value={reqCategory}
                  onChange={e => setReqCategory(e.target.value as any)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100"
                >
                  <option value="casamento">Casamento</option>
                  <option value="medico">Consulta Médica</option>
                  <option value="aniversario">Aniversário</option>
                  <option value="pessoal">Pessoal / Família</option>
                  <option value="outro">Outro Compromisso</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Observações do compromisso:</label>
                <input
                  type="text"
                  value={reqNote}
                  onChange={e => setReqNote(e.target.value)}
                  placeholder="Ex: Casamento de familiar em Santos"
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Pedido
              </button>
            </form>
          </div>

          {/* List of technician's requests */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 transition-colors">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center justify-between">
              <span>Meus Pedidos Cadastrados</span>
              <span className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                {techRequests.length}
              </span>
            </h4>

            {techRequests.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Nenhum pedido de folga registrado para este período.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {techRequests.map(r => {
                  const isApproved = r.status === 'atendido' || r.status === 'aprovado';
                  const isRejected = r.status === 'recusado';

                  return (
                    <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-900 mb-1">
                        <span>{formatDisplayDate(r.date)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {isApproved ? 'Folga Concedida' : isRejected ? 'Não Aprovado' : 'Folga em Análise'}
                        </span>
                      </div>
                      <div className="text-slate-600">
                        {r.notes.join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* NOVO: Atestados Médicos Anexados do Colaborador (Organizados por Mês e por Data) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Atestados Médicos de {currentTech.name}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
                  {techAtestados.length} {techAtestados.length === 1 ? 'anexo' : 'anexos'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organizado por mês e data mais recente para conferência e auditoria.
              </p>
            </div>
          </div>

          {/* Botão de Anexar Atestado (Apenas para colaboradores, oculto para o Administrador) */}
          {!isAdmin && onOpenAtestadoModal && (
            <button
              onClick={() => onOpenAtestadoModal(currentTech)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all shrink-0"
              title="Anexar um novo atestado médico em PDF ou Foto"
            >
              <Plus className="w-4 h-4" />
              <span>Anexar Novo Atestado</span>
            </button>
          )}
        </div>

        {techAtestados.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <Stethoscope className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhum atestado médico registrado para {currentTech.name}.
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Os atestados anexados pelo colaborador aparecerão aqui agrupados por mês e ordenados por data e horário para conferência.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(atestadosByMonth).map(([monthName, items]) => (
              <div key={monthName} className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900">
                    {monthName}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    ({items.length} {items.length === 1 ? 'atestado' : 'atestados'})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(att => {
                    const createdDateObj = att.createdAt ? new Date(att.createdAt) : null;
                    const timeStr = createdDateObj && !isNaN(createdDateObj.getTime())
                      ? createdDateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      : '';
                    const dateStr = createdDateObj && !isNaN(createdDateObj.getTime())
                      ? createdDateObj.toLocaleDateString('pt-BR')
                      : '';

                    return (
                      <div
                        key={att.id}
                        className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 shadow-2xs transition-all ${
                          darkMode ? 'bg-slate-800/80 border-slate-700 hover:border-rose-500/60' : 'bg-slate-50 border-slate-200 hover:border-rose-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-rose-500" />
                              Data: {formatDisplayDate(att.dataAtestado)}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              {att.diasAfastamento} {att.diasAfastamento === 1 ? 'dia' : 'dias'} afastado
                            </span>
                          </div>

                          {/* Data e Horário exato do Envio */}
                          {timeStr && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-2 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Enviado em {dateStr} às <strong>{timeStr}</strong></span>
                            </div>
                          )}

                          {att.medicoOuClinica && (
                            <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1 truncate" title={att.medicoOuClinica}>
                              🩺 {att.medicoOuClinica}
                            </div>
                          )}

                          {att.cid && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                              CID: <strong className="text-slate-700 dark:text-slate-300">{att.cid}</strong>
                            </div>
                          )}

                          {att.observacoes && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800 mt-2 line-clamp-2">
                              "{att.observacoes}"
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]" title={att.fileName}>
                            📎 {att.fileName}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => setViewerAtestado(att)}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                              title="Visualizar atestado em tamanho real"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Visualizar</span>
                            </button>

                            {att.fileData && (
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = att.fileData || '';
                                  link.download = att.fileName || 'atestado';
                                  link.click();
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                title="Baixar arquivo do atestado"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isAdmin && onDeleteAtestado && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Deseja realmente excluir este atestado médico?')) {
                                    onDeleteAtestado(att.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                title="Excluir atestado (Ação de Administrador)"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Visualização de Atestado */}
      <AtestadoViewerModal
        isOpen={!!viewerAtestado}
        onClose={() => setViewerAtestado(null)}
        atestado={viewerAtestado}
        darkMode={darkMode}
      />

      {/* Admin Shift Selection Modal */}
      {adminPickerDate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Alterar Escala do Dia
                </h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  {currentTech.name} &bull; {formatDisplayDate(adminPickerDate)}
                </p>
              </div>
              <button
                onClick={() => setAdminPickerDate(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  onClick={() => {
                    onUpdateShift(currentTech.id, adminPickerDate, item.type);
                    setAdminPickerDate(null);
                  }}
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
                onClick={() => setAdminPickerDate(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
