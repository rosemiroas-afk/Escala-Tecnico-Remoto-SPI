import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Technician, TechnicianSchedule, SchedulePeriod, OffRequest, ShiftType, AppUser, SHIFT_TYPES, OFFICIAL_LEGEND_ITEMS, Atestado, BancoHorasRecord } from '../types';
import { formatDisplayDate, formatFullDate, parseDateKey, isSaturday, isSunday, extractWeekends, MONTHS_PT } from '../utils/dateUtils';
import { AuditResult, isOffShift, isWorkingShift } from '../utils/validator';
import { generateIndividualWhatsAppMessage } from '../utils/exportUtils';
import { DDD_INFO } from '../data/defaultTechnicians';
import { AtestadoViewerModal } from './AtestadoViewerModal';
import { normalizeBancoHorasRecord, formatHM, hmToMin, isCollaboratorNameMatch } from '../utils/csvBancoHorasParser';
import { supabase } from '../supabase';
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
  Briefcase,
  ShieldCheck,
  X,
  FileText,
  Download,
  Eye,
  Trash2,
  Stethoscope,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Search,
  AlertTriangle
} from 'lucide-react';

// DIRETRIZ 5: DEFINIÇÃO DE SUPORTE GLOBAL
const normalizeName = (name: any): string => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos de forma segura
};

interface TechnicianViewProps {
  technicians: Technician[];
  schedules: Record<string, TechnicianSchedule>;
  dates: string[];
  period: SchedulePeriod;
  auditResult: AuditResult;
  offRequests: OffRequest[];
  currentUser: AppUser | null;
  atestados?: Atestado[];
  bancoHorasRecords?: BancoHorasRecord[];
  selectedTechId?: string;
  onSelectTechId?: (id: string) => void;
  selectedMonth?: string;
  onSelectMonth?: (monthKey: string) => void;
  onAddRequest: (req: Omit<OffRequest, 'id' | 'createdAt' | 'status'>) => void;
  onUpdateShift: (techId: string, date: string, shift: ShiftType) => void;
  onOpenRequestsModal?: (techId: string) => void;
  onOpenAtestadoModal?: (tech: Technician) => void;
  onDeleteAtestado?: (id: string) => void;
  onSave?: () => void;
  darkMode?: boolean;
  activeTab?: 'escala' | 'banco_horas';
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
  bancoHorasRecords = [],
  selectedTechId: propSelectedTechId,
  onSelectTechId,
  selectedMonth: propSelectedMonth,
  onSelectMonth,
  onAddRequest,
  onUpdateShift,
  onOpenRequestsModal,
  onOpenAtestadoModal,
  onDeleteAtestado,
  onSave,
  darkMode = false,
  activeTab: propActiveTab = 'escala'
}) => {
  const activeTechs = technicians.filter(t => t.active);
  const isAdmin = currentUser?.role === 'admin';

  const initialTechId = !isAdmin && currentUser?.technicianId
    ? currentUser.technicianId
    : activeTechs[0]?.id || '';

  const [localSelectedTechId, setLocalSelectedTechId] = useState<string>(initialTechId);
  const [copied, setCopied] = useState<boolean>(false);

  // Tab State Internal fallback
  const [internalActiveTab, setInternalActiveTab] = useState<'escala' | 'banco_horas'>('escala');
  const currentActiveTab = propActiveTab || internalActiveTab;

  // Custom Dropdown Open/Close states & refs
  const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const techDropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  // Search & Filter for Banco de Horas Extrato
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'credito' | 'debito'>('todos');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (techDropdownRef.current && !techDropdownRef.current.contains(event.target as Node)) {
        setIsTechDropdownOpen(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal viewer state
  const [adminPickerDate, setAdminPickerDate] = useState<string | null>(null);
  const [viewerAtestado, setViewerAtestado] = useState<Atestado | null>(null);

  // Resolve logged-in technician strictly when non-admin
  const loggedTech = useMemo(() => {
    if (isAdmin || !currentUser) return null;
    const targetName = normalizeName(currentUser.name || '');
    return technicians.find(t =>
      (currentUser.technicianId && t.id === currentUser.technicianId) ||
      (currentUser.id && t.id === currentUser.id) ||
      (targetName && normalizeName(t.name) === targetName) ||
      (targetName && (normalizeName(t.name).includes(targetName) || targetName.includes(normalizeName(t.name))))
    ) || null;
  }, [technicians, currentUser, isAdmin]);

  const activeTechId = loggedTech
    ? loggedTech.id
    : (propSelectedTechId || localSelectedTechId);

  const currentTech = loggedTech || technicians.find(t => t.id === activeTechId) || activeTechs[0];
  const currentSched = currentTech ? schedules[currentTech.id] : null;

  // Estado local para turnos atualizados em tempo real via Supabase
  const [userCloudShifts, setUserCloudShifts] = useState<Record<string, ShiftType>>({});
  // Estado local para banco de horas atualizado em tempo real via Supabase
  const [userBancoHoras, setUserBancoHoras] = useState<BancoHorasRecord[]>(bancoHorasRecords || []);

  useEffect(() => {
    if (bancoHorasRecords && bancoHorasRecords.length > 0) {
      setUserBancoHoras(bancoHorasRecords);
    }
  }, [bancoHorasRecords]);

  // Função para buscar dados da escala atualizados diretamente na tabela 'escalas'
  const buscarDadosDaEscala = useCallback(async () => {
    const targetUserId = currentTech?.id || currentUser?.technicianId || currentUser?.id;
    if (!targetUserId) return;

    try {
      const { data, error } = await supabase
        .from('escalas')
        .select('*')
        .eq('id_usuario', targetUserId)
        .order('updated_at', { ascending: false });

      if (data && Array.isArray(data) && !error) {
        const shiftMap: Record<string, ShiftType> = {};
        const seenDates = new Set<string>();

        data.forEach((row: any) => {
          if (row.data && !seenDates.has(row.data)) {
            seenDates.add(row.data);
            const rawShift = row.legenda_dia;
            shiftMap[row.data] = (rawShift === 'T' ? 'TB' : rawShift === 'F' ? 'FG' : rawShift || 'TB') as ShiftType;
          }
        });

        setUserCloudShifts(shiftMap);
      }
    } catch (err) {
      console.error('Erro ao consultar escala no Supabase para o usuário logado:', err);
    }
  }, [currentTech?.id, currentUser?.id, currentUser?.technicianId]);

  // Função para buscar lançamentos atualizados do Banco de Horas
  const buscarBancoHoras = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('banco_horas')
        .select('*');

      if (data && Array.isArray(data) && !error) {
        setUserBancoHoras(data.map(normalizeBancoHorasRecord));
      }
    } catch (err) {
      console.error('Erro ao consultar banco_horas no Supabase:', err);
    }
  }, []);

  // ATIVAÇÃO DO REALTIME CHANNEL DO SUPABASE:
  useEffect(() => {
    const targetUserId = currentTech?.id || currentUser?.technicianId || currentUser?.id;
    if (!targetUserId) return;

    buscarDadosDaEscala();
    buscarBancoHoras();

    const channelName = `mudancas-escala-${targetUserId}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escalas',
          filter: `id_usuario=eq.${targetUserId}`
        },
        () => {
          buscarDadosDaEscala();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'banco_horas'
        },
        () => {
          buscarBancoHoras();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTech?.id, currentUser?.id, currentUser?.technicianId, buscarDadosDaEscala, buscarBancoHoras]);

  useEffect(() => {
    const handleBancoHorasUpdated = () => {
      buscarBancoHoras();
    };
    window.addEventListener('banco-horas-updated', handleBancoHorasUpdated);
    return () => {
      window.removeEventListener('banco-horas-updated', handleBancoHorasUpdated);
    };
  }, [buscarBancoHoras]);

  // DIRETRIZ 3: MOTOR MATEMÁTICO DE CÁLCULO DE BANCO DE HORAS PARA O TÉCNICO LOGADO
  const techRecords = useMemo(() => {
    if (!currentTech) return [];
    const targetName = currentTech.name || '';
    const targetNameNorm = normalizeName(targetName);
    const targetId = String(currentTech.id || '').trim();

    return userBancoHoras.filter(r => {
      const recMatricula = String(r.matricula || '').trim();
      const recName = String(r.nome_colaborador || (r as any).nome || '').trim();
      const recNameNorm = normalizeName(recName);

      if (recMatricula && (recMatricula === targetId || recMatricula === currentTech.id)) {
        return true;
      }
      if (targetNameNorm && recNameNorm && targetNameNorm === recNameNorm) {
        return true;
      }
      return isCollaboratorNameMatch(targetName, recName);
    });
  }, [currentTech, userBancoHoras]);

  const techBancoStats = useMemo(() => {
    let totalCreditMins = 0;
    let totalDebitMins = 0;
    let criticalMins = 0;
    const criticalRecords: BancoHorasRecord[] = [];

    techRecords.forEach(r => {
      const descUpper = String(r.descricao || '').toUpperCase();
      const valorString = String(r.saldo_compensar || r.saldo_a_compensar || '00:00');
      
      let mins = 0;
      const match = valorString.match(/(\d+):(\d+)/);
      if (match) {
        mins = (parseInt(match[1], 10) || 0) * 60 + (parseInt(match[2], 10) || 0);
      } else {
        mins = Math.abs(hmToMin(valorString));
      }

      // Regra estrita baseada na coluna 'descricao':
      if (descUpper.includes('DEBITO') || descUpper.includes('DÉBITO') || descUpper.includes('ATRASO') || valorString.startsWith('-')) {
        totalDebitMins += mins;
      } else {
        totalCreditMins += mins;
      }

      const isCreditRow = descUpper.includes('CREDITO') || descUpper.includes('CRÉDITO') || (!descUpper.includes('DEBITO') && !valorString.startsWith('-'));
      if (isCreditRow && r.a_vencer_em_dias > 0 && r.a_vencer_em_dias <= 30) {
        criticalRecords.push(r);
        criticalMins += mins;
      }
    });

    const saldoRealMin = totalCreditMins - totalDebitMins;
    const isPositive = saldoRealMin >= 0;
    const absMins = Math.abs(saldoRealMin);
    const saldoFormatted = `${isPositive ? '+' : '-'}${formatHM(absMins).replace(/^[+-]/, '')}`;

    return {
      totalCreditMins,
      totalDebitMins,
      saldoRealMin,
      isPositive,
      saldoFormatted,
      criticalRecords,
      criticalCount: criticalRecords.length,
      criticalMins
    };
  }, [techRecords]);

  // Registros do Extrato filtrados por busca e status
  const filteredTechRecords = useMemo(() => {
    return techRecords.filter(r => {
      const descUpper = String(r.descricao || '').toUpperCase();
      const isDebit = descUpper.includes('DEBITO') || descUpper.includes('DÉBITO') || descUpper.includes('ATRASO') || String(r.saldo_compensar || '').startsWith('-');
      
      if (statusFilter === 'credito' && isDebit) return false;
      if (statusFilter === 'debito' && !isDebit) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = (r.descricao || '').toLowerCase().includes(term);
        const matchesDate = (r.data_realizacao || '').toLowerCase().includes(term);
        return matchesDesc || matchesDate;
      }

      return true;
    });
  }, [techRecords, searchTerm, statusFilter]);

  const techRequests = currentTech
    ? offRequests
        .filter(r => r.technicianId === currentTech.id)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const techAtestados = useMemo(() => {
    return atestados
      .filter(a => a.technicianId === currentTech?.id)
      .sort((a, b) => b.dataAtestado.localeCompare(a.dataAtestado));
  }, [atestados, currentTech?.id]);

  const availableMonths = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of dates) {
      if (d && d.length >= 7) {
        const mKey = d.slice(0, 7);
        if (mKey >= '2026-11') {
          counts[mKey] = (counts[mKey] || 0) + 1;
        }
      }
    }
    const list = Object.keys(counts).filter((mKey: string) => counts[mKey] >= 5).sort();
    return list.length > 0 ? list : Object.keys(counts).sort();
  }, [dates]);

  const [localSelectedMonth, setLocalSelectedMonth] = useState<string>(() => {
    const targetKey = `${period.startYear}-${String(period.startMonth + 1).padStart(2, '0')}`;
    const set = new Set(dates.map(d => d.slice(0, 7)).filter(mKey => mKey >= '2026-11'));
    if (set.has(targetKey) && targetKey >= '2026-11') return targetKey;
    const sorted = Array.from(set).sort();
    return sorted[0] || '2026-11';
  });

  const selectedMonth = propSelectedMonth || localSelectedMonth;

  const handleSelectMonth = (mKey: string) => {
    setLocalSelectedMonth(mKey);
    onSelectMonth?.(mKey);
  };

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      handleSelectMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const displayDates = useMemo(() => {
    return dates.filter(d => d.startsWith(selectedMonth));
  }, [dates, selectedMonth]);

  const formatMonthName = (mKey: string) => {
    const parts = mKey.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    return `${MONTHS_PT[m]} de ${y}`;
  };

  const effectiveSched = useMemo((): TechnicianSchedule | null => {
    if (!currentTech) return null;
    const baseSched = currentSched || { technicianId: currentTech.id, days: {} };
    const mergedDays = { ...(baseSched.days || {}) };

    for (const [d, shift] of Object.entries(userCloudShifts)) {
      mergedDays[d] = {
        date: d,
        shift: shift,
        manualOverride: true,
        notes: mergedDays[d]?.notes || currentTech.shiftHours
      };
    }

    return {
      technicianId: currentTech.id,
      days: mergedDays
    };
  }, [currentTech, currentSched, userCloudShifts]);

  if (!currentTech || (!currentSched && !effectiveSched)) {
    return <div className="p-8 text-center text-slate-500">Nenhum técnico disponível.</div>;
  }

  const monthStats = useMemo(() => {
    let totalOffDays = 0;
    let totalWorkDays = 0;
    let weekendDaysOff = 0;
    let maxConsecutiveWorkDays = 0;
    let currentConsecutive = 0;
    let inversionsCount = 0;

    const schedToUse = effectiveSched || currentSched;
    if (!schedToUse) {
      return {
        totalOffDays: 0,
        doubleWeekendsCount: 0,
        totalWorkDays: 0,
        weekendDaysOff: 0,
        maxConsecutiveWorkDays: 0,
        inversionsCount: 0
      };
    }

    for (let i = 0; i < displayDates.length; i++) {
      const d = displayDates[i];
      const shift = schedToUse.days[d]?.shift || 'TB';
      const isOff = isOffShift(shift);
      if (isOff) {
        totalOffDays++;
        if (isSaturday(d) || isSunday(d)) {
          weekendDaysOff++;
        }
        currentConsecutive = 0;
        if (shift === 'FC') {
          inversionsCount++;
        }
      } else if (isWorkingShift(shift)) {
        totalWorkDays++;
        currentConsecutive++;
        if (currentConsecutive > maxConsecutiveWorkDays) {
          maxConsecutiveWorkDays = currentConsecutive;
        }
      }
    }

    const monthWeekends = extractWeekends(displayDates);
    const doubleWeekendsCount = monthWeekends.filter(wk => {
      const sat = schedToUse.days[wk.saturday]?.shift;
      const sun = schedToUse.days[wk.sunday]?.shift;
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
  }, [effectiveSched, currentSched, displayDates]);

  const handleCopyWhatsApp = () => {
    const schedToUse = effectiveSched || currentSched;
    if (!schedToUse) return;
    const text = generateIndividualWhatsAppMessage(
      currentTech,
      schedToUse,
      displayDates,
      { ...period, name: formatMonthName(selectedMonth) },
      offRequests
    );
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const schedToUse = effectiveSched || currentSched;
    if (!schedToUse) return;
    const text = generateIndividualWhatsAppMessage(
      currentTech,
      schedToUse,
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

  return (
    <div className="space-y-6">
      {/* DIRETRIZ 1: LAYOUT SUPERIOR COMPACTO UNIFICADO (Altura 80px a 90px) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl px-4 py-2.5 sm:px-6 sm:py-3 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 transition-colors min-h-[80px]">
        
        {/* Esquerda: Perfil, Nome, Tags lineares */}
        <div className="flex items-center gap-3 flex-1 min-w-0 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs shrink-0">
            <User className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                SEU PAINEL INDIVIDUAL
              </span>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                DDD {currentTech.ddd}
              </span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-500" />
                {currentTech.shiftHours || '08:00 AS 16:20'}
              </span>
            </div>
            <h2 className="text-base font-black text-slate-900 dark:text-white truncate mt-0.5">
              {currentTech.name}
            </h2>
          </div>
        </div>

        {/* Centro: Seletor Dropdown Flutuante de Mês */}
        <div className="relative w-full md:w-64 shrink-0" ref={monthDropdownRef}>
          <button
            type="button"
            onClick={() => setIsMonthDropdownOpen(prev => !prev)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-left flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500"
          >
            <div className="flex items-center gap-2 truncate">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate capitalize font-bold">{formatMonthName(selectedMonth)}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {isMonthDropdownOpen && (
            <div className="absolute left-0 md:right-0 top-full mt-1.5 w-full max-h-56 overflow-y-auto p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 space-y-1 animate-in fade-in zoom-in-95">
              {availableMonths.map((mKey: string) => {
                const isSelected = selectedMonth === mKey;
                const count = dates.filter(d => d.startsWith(mKey)).length;
                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => {
                      handleSelectMonth(mKey);
                      setIsMonthDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate capitalize">{formatMonthName(mKey)}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ml-2 shrink-0 ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {count}d
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Direita: Botões Compactos 'Copiar' e 'WhatsApp' */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          {isAdmin && onSave && (
            <button
              onClick={() => {
                if (window.confirm('Deseja salvar todas as alterações na escala?')) {
                  onSave();
                }
              }}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Salvar alterações na nuvem"
            >
              <Check className="w-4 h-4" />
              <span>Salvar</span>
            </button>
          )}

          <button
            onClick={handleCopyWhatsApp}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copiar</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenWhatsApp}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* TRANSIÇÃO ESTRITA DE ABAS NA TELA */}
      {currentActiveTab === 'escala' && (
        <div className="space-y-6">
          {/* Stats Summary Cards (Específicos do Mês Selecionado) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Double Weekend / Folga Duplada Card */}
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-3.5 sm:p-5 text-white shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-semibold text-purple-100 uppercase tracking-wider">
                  Folga Duplada (FD)
                </span>
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 fill-amber-300" />
              </div>
              <div className="my-1.5 sm:my-3">
                <div className="text-xl sm:text-3xl font-extrabold">
                  {monthStats.doubleWeekendsCount} {monthStats.doubleWeekendsCount === 1 ? 'Garantida' : 'Garantidas'}
                </div>
                <p className="text-[10px] sm:text-xs text-purple-100 mt-0.5 truncate">
                  {monthStats.doubleWeekendsCount > 0
                    ? `${monthStats.doubleWeekendsCount} fim de semana duplado`
                    : `Nenhum fim de semana duplado`}
                </p>
              </div>
              <div className="text-[9px] sm:text-[11px] bg-white/20 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg backdrop-blur-xs font-medium w-fit">
                Sáb + Dom
              </div>
            </div>

            {/* Total Offs */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Total Folgas</span>
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              </div>
              <div className="my-1.5 sm:my-3">
                <div className="text-xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                  {monthStats.totalOffDays} dias
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {monthStats.weekendDaysOff} folgas em fins de semana
                </p>
              </div>
              <div className="text-[9px] sm:text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-medium w-fit">
                Descanso no Mês
              </div>
            </div>

            {/* Total Work Days (TB) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Trabalhados (TB)</span>
                <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              </div>
              <div className="my-1.5 sm:my-3">
                <div className="text-xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  {monthStats.totalWorkDays} dias
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Atuação no Mês
                </p>
              </div>
              <div className="text-[9px] sm:text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-medium w-fit">
                Produtividade
              </div>
            </div>

            {/* Consecutive Days Work Status */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Dias Seguidos</span>
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              </div>
              <div className="my-1.5 sm:my-3">
                <div className={`text-xl sm:text-3xl font-extrabold ${
                  monthStats.maxConsecutiveWorkDays > 6 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'
                }`}>
                  {monthStats.maxConsecutiveWorkDays} dias
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {monthStats.maxConsecutiveWorkDays <= 6 ? '✅ Conforme CLT' : '⚠️ Atenção'}
                </p>
              </div>
              <div className="text-[9px] sm:text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-medium w-fit">
                Máx. Contínuo
              </div>
            </div>
          </div>

          {/* Main Full Width Calendar Container */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3 pb-2.5 sm:mb-4 sm:pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white truncate">
                  Calendário da Escala - <span className="font-normal">{currentTech.name}</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  {isAdmin
                    ? `Clique em qualquer dia para alterar o status.`
                    : `Suas folgas programadas em ${formatMonthName(selectedMonth)}.`}
                </p>
              </div>
              <span className={`text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-semibold border shrink-0 ${DDD_INFO[currentTech.ddd]?.badge}`}>
                DDD {currentTech.ddd}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1.5 sm:gap-2.5">
              {displayDates.map((d: string) => {
                const schedToUse = effectiveSched || currentSched;
                const day = schedToUse?.days[d];
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
                      } else if (onOpenRequestsModal && currentTech) {
                        onOpenRequestsModal(currentTech.id);
                      }
                    }}
                    style={{
                      backgroundColor: shiftDef.isWork ? undefined : `${shiftDef.bgColor}22`,
                      borderColor: shiftDef.borderColor
                    }}
                    className="p-1.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[65px] sm:min-h-[90px] relative hover:shadow-md hover:scale-[1.01] bg-white dark:bg-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] sm:text-xs font-semibold ${isSun ? 'text-amber-700 dark:text-amber-400 font-bold' : isSat ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                        {isSun ? 'Dom' : isSat ? 'Sáb' : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'][dObj.getDay() - 1]}
                      </span>
                      <span className="text-xs sm:text-base font-extrabold text-black dark:text-white">{dayNum}</span>
                    </div>

                    <div className="mt-1 sm:mt-2 flex items-center justify-between gap-0.5 sm:gap-1">
                      <span
                        style={{
                          backgroundColor: shiftDef.bgColor,
                          borderColor: shiftDef.borderColor
                        }}
                        className="text-[9px] sm:text-[10px] px-1 sm:px-2 py-0.2 sm:py-0.5 rounded-sm uppercase tracking-wider font-black border shadow-2xs shrink-0 text-black"
                      >
                        {shiftDef.shortLabel}
                      </span>

                      <span className="hidden sm:inline text-[10px] font-normal truncate text-black dark:text-white">
                        {shiftDef.label}
                      </span>

                      {shift === 'FD' && <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-orange-500 text-orange-500 shrink-0" />}
                    </div>

                    {req && (
                      <div
                        className={`absolute top-1 right-1 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full border border-white dark:border-slate-900 shadow-2xs ${
                          (req.status === 'atendido' || req.status === 'aprovado')
                            ? 'bg-emerald-500 ring-1 ring-emerald-300'
                            : (req.status === 'reprovado' || req.status === 'recusado')
                            ? 'bg-rose-500 ring-1 ring-rose-300'
                            : 'bg-amber-400 animate-pulse ring-1 ring-amber-200'
                        }`}
                        title={
                          (req.status === 'atendido' || req.status === 'aprovado')
                            ? `Folga Aprovada: ${req.notes.join(', ')}`
                            : (req.status === 'reprovado' || req.status === 'recusado')
                            ? `Folga Reprovada: ${req.notes.join(', ')}`
                            : `Folga em Análise: ${req.notes.join(', ')}`
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Atestados Médicos */}
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
                    Organizado por data para conferência e auditoria.
                  </p>
                </div>
              </div>

              {!isAdmin && onOpenAtestadoModal && (
                <button
                  onClick={() => onOpenAtestadoModal(currentTech)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all shrink-0"
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
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {techAtestados.map(att => (
                  <div
                    key={att.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex flex-col justify-between gap-3 shadow-2xs"
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
                      {att.medicoOuClinica && (
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1 truncate">
                          🩺 {att.medicoOuClinica}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        📎 {att.fileName}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setViewerAtestado(att)}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIRETRIZ 2: VISTA EXCLUSIVA DO BANCO DE HORAS (Quando activeTab === 'banco_horas') */}
      {currentActiveTab === 'banco_horas' && (
        <div className="space-y-6">
          {/* Banner de Sincronização e Identificação */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  VISUALIZANDO TÉCNICO SELECIONADO (SINCRONIZADO SUPABASE):
                </span>
                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Extrato do Banco de Horas — {currentTech.name}</span>
                  {currentTech.ddd && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      DDD {currentTech.ddd}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* CARDS DE DESTAQUE DO BANCO DE HORAS INDIVIDUAL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Saldo Atual (Verde se Positivo, Vermelho se Negativo) */}
            <div className={`p-5 rounded-3xl border shadow-sm transition-colors flex flex-col justify-between ${
              techBancoStats.isPositive
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  SALDO ATUAL DO BANCO DE HORAS
                </span>
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                  techBancoStats.isPositive ? 'bg-emerald-600' : 'bg-rose-600'
                }`}>
                  {techBancoStats.isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
              </div>

              <div className="my-4">
                <div className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                  techBancoStats.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {techBancoStats.saldoFormatted}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {techBancoStats.isPositive
                    ? 'Crédito positivo disponível para compensação em folgas ou pagamento'
                    : 'Débito de horas pendente para compensação de jornada'}
                </p>
              </div>

              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Calculado em minutos inteiros via Supabase Cloud
              </div>
            </div>

            {/* Card 2: Total de Horas Crédito (Sempre Verde) */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  TOTAL DE HORAS CRÉDITO
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  ENTRADAS
                </span>
              </div>

              <div className="my-4">
                <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  +{formatHM(techBancoStats.totalCreditMins).replace(/^[+-]/, '')}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Horas extras e créditos acumulados
                </p>
              </div>

              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Mapeado de registros de CRÉDITO
              </div>
            </div>

            {/* Card 3: Total de Horas Débito (Sempre Vermelho) */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  TOTAL DE HORAS DÉBITO
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  SAÍDAS
                </span>
              </div>

              <div className="my-4">
                <div className="text-3xl sm:text-4xl font-black font-mono text-rose-600 dark:text-rose-400">
                  -{formatHM(techBancoStats.totalDebitMins).replace(/^[+-]/, '')}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Folgas usufruídas ou faltas/saídas antecipadas
                </p>
              </div>

              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Mapeado de registros de DÉBITO
              </div>
            </div>
          </div>

          {/* BANNER DE ALERTA CLT (Horas a vencer <= 30 dias) */}
          {techBancoStats.criticalCount > 0 && (
            <div className={`p-4 sm:p-5 rounded-2xl border flex items-start sm:items-center gap-3 sm:gap-4 transition-all ${
              darkMode ? 'bg-rose-950/40 border-rose-800 text-rose-200' : 'bg-rose-50/80 border-rose-200 text-rose-950'
            }`}>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black text-xs sm:text-sm text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚠️ ALERTA CLT - HORAS A VENCER EM MENOS DE 30 DIAS</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 font-extrabold text-[11px] border border-rose-500/30">
                    {techBancoStats.criticalCount} lançamento(s)
                  </span>
                </div>
                <p className="text-xs leading-relaxed font-medium opacity-90">
                  Você possui <strong>{techBancoStats.criticalCount} lançamento(s)</strong> no valor total de{' '}
                  <strong className="font-mono text-xs underline font-black">+{formatHM(techBancoStats.criticalMins).replace(/^[+-]/, '')}</strong> prestes a expirar.
                  De acordo com a Legislação Trabalhista (CLT), as horas do banco devem ser compensadas em até{' '}
                  <strong>3 meses (90 dias)</strong> a contar da data de realização.
                </p>
              </div>
            </div>
          )}

          {/* EXTRATO DETALHADO DE LANÇAMENTOS */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Extrato Detalhado de Lançamentos</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Lançamentos registrados no Supabase com coloração baseada na coluna 'descricao'
                </p>
              </div>

              {/* Filtros de Busca & Tipo */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar lançamento..."
                    className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="credito">Apenas Créditos</option>
                  <option value="debito">Apenas Débitos</option>
                </select>
              </div>
            </div>

            {/* TABELA DE EXTRATO */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">DATA REALIZAÇÃO</th>
                    <th className="py-3 px-4">DESCRIÇÃO / MOTIVO</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                    <th className="py-3 px-4 text-right">SALDO A COMPENSAR</th>
                    <th className="py-3 px-4 text-center">VENCIMENTO</th>
                    <th className="py-3 px-4 text-center">PRAZO RESTANTE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredTechRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        Nenhum lançamento encontrado para {currentTech.name}.
                      </td>
                    </tr>
                  ) : (
                    filteredTechRecords.map((r, idx) => {
                      const descUpper = String(r.descricao || '').toUpperCase();
                      const isDebit = descUpper.includes('DEBITO') || descUpper.includes('DÉBITO') || descUpper.includes('ATRASO') || String(r.saldo_compensar || '').startsWith('-');
                      const valorRaw = String(r.saldo_compensar || r.saldo_a_compensar || '00:00');
                      const cleanValor = valorRaw.replace(/^[+-]/, '');

                      const isCritical = r.a_vencer_em_dias > 0 && r.a_vencer_em_dias <= 30;

                      return (
                        <tr
                          key={r.id || idx}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            isDebit ? 'bg-rose-50/20 dark:bg-rose-950/10' : 'bg-emerald-50/20 dark:bg-emerald-950/10'
                          }`}
                        >
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {r.data_realizacao ? r.data_realizacao.split('-').reverse().join('/') : '-'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {r.descricao || '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isDebit
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}>
                              {isDebit ? 'DÉBITO' : 'CRÉDITO'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black font-mono text-sm whitespace-nowrap">
                            <span className={isDebit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                              {isDebit ? `-${cleanValor}` : `+${cleanValor}`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400 font-medium">
                            {r.data_vencimento ? r.data_vencimento.split('-').reverse().join('/') : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isCritical ? (
                              <span className="px-3 py-1 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 inline-flex items-center gap-1 shadow-2xs">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>{r.a_vencer_em_dias} dias (CRÍTICO)</span>
                              </span>
                            ) : r.a_vencer_em_dias > 0 ? (
                              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-block">
                                {r.a_vencer_em_dias} dias
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal de Visualização de Atestado */}
      <AtestadoViewerModal
        isOpen={!!viewerAtestado}
        onClose={() => setViewerAtestado(null)}
        atestado={viewerAtestado}
        darkMode={darkMode}
      />
    </div>
  );
};
