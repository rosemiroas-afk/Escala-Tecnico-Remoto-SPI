import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BancoHorasRecord, AppUser, Technician } from '../types';
import { hmToMin, formatHM, normalizeBancoHorasRecord, isCollaboratorNameMatch } from '../utils/csvBancoHorasParser';
import { supabase } from '../supabase';
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  Calendar,
  Users,
  UserCheck,
  ArrowRight,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';

const normalizeName = (name?: string | null): string => {
  if (!name) return "";
  return name
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos de forma segura
};

interface BancoHorasViewProps {
  records: BancoHorasRecord[];
  currentUser: AppUser | null;
  technicians: Technician[];
  selectedTechId?: string;
  onSelectTechId?: (id: string) => void;
  darkMode: boolean;
}

export interface CollaboratorBancoSummary {
  id: string;
  name: string;
  matricula: string;
  cargo?: string;
  ddd?: string | number;
  totalCreditosMin: number;
  totalDebitosMin: number;
  saldoRealMin: number;
  criticalCount: number;
  recordsCount: number;
}

export const BancoHorasView: React.FC<BancoHorasViewProps> = ({
  records: initialRecords,
  currentUser,
  technicians,
  selectedTechId: propSelectedTechId,
  onSelectTechId,
  darkMode
}) => {
  const [records, setRecords] = useState<BancoHorasRecord[]>(() => {
    if (initialRecords && initialRecords.length > 0) return initialRecords;
    try {
      const saved = localStorage.getItem('escalamaster_banco_horas_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao inicializar banco de horas do localStorage', e);
    }
    return [];
  });
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [colabSearchTerm, setColabSearchTerm] = useState<string>('');
  const [colabFilter, setColabFilter] = useState<'ALL' | 'POSITIVO' | 'NEGATIVO' | 'CRITICO'>('ALL');

  const isAdmin = currentUser?.role === 'admin';

  // 1. CARREGAMENTO DIRETO DO SUPABASE E ATUALIZAÇÃO EM TEMPO REAL
  const carregarBancoHorasSupabase = useCallback(async () => {
    setIsLoadingCloud(true);
    try {
      const { data, error } = await supabase
        .from('banco_horas')
        .select('*');

      if (data && Array.isArray(data) && !error && data.length > 0) {
        const normalized = data.map(normalizeBancoHorasRecord);
        setRecords(normalized);
      } else if (initialRecords && initialRecords.length > 0) {
        setRecords(initialRecords);
      } else {
        try {
          const saved = localStorage.getItem('escalamaster_banco_horas_v1');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setRecords(parsed.map(normalizeBancoHorasRecord));
            }
          }
        } catch (e) {
          console.warn('Erro ao ler localStorage', e);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar banco_horas diretamente do Supabase:', err);
      if (initialRecords && initialRecords.length > 0) {
        setRecords(initialRecords);
      }
    } finally {
      setIsLoadingCloud(false);
    }
  }, [initialRecords]);

  // Sincroniza com initialRecords quando recebido via props
  useEffect(() => {
    if (initialRecords && initialRecords.length > 0) {
      setRecords(initialRecords);
    }
  }, [initialRecords]);

  // Carregamento inicial do banco e inscrição no Realtime Channel do Supabase
  useEffect(() => {
    carregarBancoHorasSupabase();

    const handleCustomUpdate = () => {
      carregarBancoHorasSupabase();
    };
    window.addEventListener('banco-horas-updated', handleCustomUpdate);

    const channelName = `realtime-banco-horas-${Math.random().toString(36).substring(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'banco_horas'
        },
        () => {
          // Atualiza instantaneamente a tela com os dados mais recentes do Supabase
          carregarBancoHorasSupabase();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('banco-horas-updated', handleCustomUpdate);
      supabase.removeChannel(channel);
    };
  }, [carregarBancoHorasSupabase]);

  // Identifica o técnico logado se for visão de colaborador
  const loggedTech = useMemo(() => {
    if (isAdmin || !currentUser) return null;
    const userNorm = normalizeName(currentUser.name);
    return (
      technicians.find(
        t =>
          (currentUser.technicianId && t.id === currentUser.technicianId) ||
          (currentUser.id && t.id === currentUser.id) ||
          (userNorm && normalizeName(t.name) === userNorm) ||
          isCollaboratorNameMatch(t.name, currentUser.name || '')
      ) || null
    );
  }, [technicians, currentUser, isAdmin]);

  // Técnico selecionado no filtro global
  const currentTech = useMemo(() => {
    if (!isAdmin) {
      return loggedTech || technicians.find(t => t.id === currentUser?.technicianId || t.id === currentUser?.id) || null;
    }
    if (propSelectedTechId) {
      return technicians.find(t => t.id === propSelectedTechId) || technicians[0] || null;
    }
    return technicians[0] || null;
  }, [isAdmin, loggedTech, propSelectedTechId, currentUser, technicians]);

  // =========================================================================
  // REGRA DE OURO: SEPARAÇÃO MATEMÁTICA NA COLUNA 'DESCRICAO' NO LOOP SUPABASE
  // =========================================================================
  // - Se 'descricao' tiver 'DEBITO', converte 'saldo_compensar' para minutos e acumula no totalDebitos.
  // - Se 'descricao' tiver 'CREDITO', converte 'saldo_compensar' para minutos e acumula no totalCreditos.
  // =========================================================================
  const collaboratorsSummary = useMemo<CollaboratorBancoSummary[]>(() => {
    const list: CollaboratorBancoSummary[] = [];
    const matchedRecordIds = new Set<string>();

    // 1. Processa todos os técnicos cadastrados
    technicians.forEach(tech => {
      const targetId = tech.id;
      const techNameNorm = normalizeName(tech.name);

      let techCreditMins = 0;
      let techDebitMins = 0;
      let criticalCount = 0;
      let matchedCount = 0;
      let cargo = '';

      records.forEach((r, idx) => {
        const recId = r.id || `rec-${idx}`;
        const recMatricula = r.matricula || '';
        const recNameNorm = normalizeName(r.nome_colaborador);

        const isMatch =
          (recMatricula && (recMatricula === targetId || recMatricula === tech.id)) ||
          (techNameNorm && recNameNorm && techNameNorm === recNameNorm) ||
          isCollaboratorNameMatch(tech.name, r.nome_colaborador || '');

        if (isMatch) {
          matchedRecordIds.add(recId);
          matchedCount++;
          if (r.cargo && !cargo) cargo = r.cargo;

          // LEITURA DA COLUNA 'DESCRICAO' E 'SALDO_COMPENSAR'
          const descText = String(r.descricao || r.status || '').toUpperCase();
          const valorString = String(r.saldo_compensar || r.saldo_a_compensar || '00:00');
          const match = valorString.match(/(\d+):(\d+)/);
          let minutosAbs = 0;

          if (match) {
            const hrs = parseInt(match[1], 10) || 0;
            const mins = parseInt(match[2], 10) || 0;
            minutosAbs = hrs * 60 + mins;
          } else {
            minutosAbs = Math.abs(hmToMin(valorString));
          }

          // APLICAÇÃO DA REGRA DE OURO:
          if (descText.includes('DEBITO') || descText.includes('DÉBITO')) {
            techDebitMins += minutosAbs;
          } else if (descText.includes('CREDITO') || descText.includes('CRÉDITO')) {
            techCreditMins += minutosAbs;
          } else if (valorString.startsWith('-') || String(r.status || '').toUpperCase().includes('DEBITO')) {
            techDebitMins += minutosAbs;
          } else {
            techCreditMins += minutosAbs;
          }

          if (r.a_vencer_em_dias > 0 && r.a_vencer_em_dias <= 30) {
            criticalCount++;
          }
        }
      });

      const saldoRealMin = techCreditMins - techDebitMins;

      list.push({
        id: tech.id,
        name: tech.name,
        matricula: tech.id,
        cargo: cargo || undefined,
        ddd: tech.ddd,
        totalCreditosMin: techCreditMins,
        totalDebitosMin: techDebitMins,
        saldoRealMin,
        criticalCount,
        recordsCount: matchedCount
      });
    });

    // 2. Colaboradores adicionais identificados no CSV do banco
    const unmatchedByName = new Map<string, BancoHorasRecord[]>();
    records.forEach((r, idx) => {
      const recId = r.id || `rec-${idx}`;
      if (!matchedRecordIds.has(recId)) {
        const key = r.matricula || r.nome_colaborador || `extra-${idx}`;
        const group = unmatchedByName.get(key) || [];
        group.push(r);
        unmatchedByName.set(key, group);
      }
    });

    unmatchedByName.forEach((groupRecords, key) => {
      const first = groupRecords[0];
      let creditMins = 0;
      let debitMins = 0;
      let criticalCount = 0;

      groupRecords.forEach(r => {
        const descText = String(r.descricao || r.status || '').toUpperCase();
        const valorString = String(r.saldo_compensar || r.saldo_a_compensar || '00:00');
        const match = valorString.match(/(\d+):(\d+)/);
        let minutosAbs = 0;

        if (match) {
          const hrs = parseInt(match[1], 10) || 0;
          const mins = parseInt(match[2], 10) || 0;
          minutosAbs = hrs * 60 + mins;
        } else {
          minutosAbs = Math.abs(hmToMin(valorString));
        }

        if (descText.includes('DEBITO') || descText.includes('DÉBITO')) {
          debitMins += minutosAbs;
        } else if (descText.includes('CREDITO') || descText.includes('CRÉDITO')) {
          creditMins += minutosAbs;
        } else if (valorString.startsWith('-') || String(r.status || '').toUpperCase().includes('DEBITO')) {
          debitMins += minutosAbs;
        } else {
          creditMins += minutosAbs;
        }

        if (r.a_vencer_em_dias > 0 && r.a_vencer_em_dias <= 30) {
          criticalCount++;
        }
      });

      list.push({
        id: first.matricula || key,
        name: first.nome_colaborador || first.matricula || key,
        matricula: first.matricula || key,
        cargo: first.cargo,
        totalCreditosMin: creditMins,
        totalDebitosMin: debitMins,
        saldoRealMin: creditMins - debitMins,
        criticalCount,
        recordsCount: groupRecords.length
      });
    });

    return list;
  }, [technicians, records]);

  // ==========================================
  // CONSOLIDADO GERAL DA EQUIPE
  // ==========================================
  const consolidatedStats = useMemo(() => {
    let totalGeralCreditosMin = 0;
    let totalGeralDebitosMin = 0;
    let totalCriticalCount = 0;

    collaboratorsSummary.forEach(c => {
      totalGeralCreditosMin += c.totalCreditosMin;
      totalGeralDebitosMin += c.totalDebitosMin;
      totalCriticalCount += c.criticalCount;
    });

    const totalGeralSaldoMin = totalGeralCreditosMin - totalGeralDebitosMin;

    return {
      totalGeralCreditosMin,
      totalGeralDebitosMin,
      totalGeralSaldoMin,
      totalCriticalCount
    };
  }, [collaboratorsSummary]);

  // Registros do colaborador individual selecionado
  const userRecords = useMemo(() => {
    if (!currentTech && !currentUser) return [];

    const targetName = currentTech?.name || currentUser?.name || '';
    const targetNameNorm = normalizeName(targetName);
    const targetMatricula = currentUser?.id || currentTech?.id || '';

    return records.filter(r => {
      if (r.matricula && (r.matricula === targetMatricula || r.matricula === currentTech?.id)) {
        return true;
      }
      const recNameNorm = normalizeName(r.nome_colaborador);
      if (targetNameNorm && recNameNorm && targetNameNorm === recNameNorm) {
        return true;
      }
      return isCollaboratorNameMatch(targetName, r.nome_colaborador || '');
    });
  }, [records, currentTech, currentUser]);

  // Cálculos do extrato individual com a regra de ouro na coluna 'descricao'
  const userStats = useMemo(() => {
    let totalCreditMins = 0;
    let totalDebitMins = 0;
    let criticalCount = 0;
    let criticalMins = 0;

    userRecords.forEach(r => {
      const descText = String(r.descricao || r.status || '').toUpperCase();
      const valorString = String(r.saldo_compensar || r.saldo_a_compensar || '00:00');
      const match = valorString.match(/(\d+):(\d+)/);
      let minutosAbs = 0;

      if (match) {
        const hrs = parseInt(match[1], 10) || 0;
        const mins = parseInt(match[2], 10) || 0;
        minutosAbs = hrs * 60 + mins;
      } else {
        minutosAbs = Math.abs(hmToMin(valorString));
      }

      // Regra de ouro da coluna 'descricao':
      if (descText.includes('DEBITO') || descText.includes('DÉBITO')) {
        totalDebitMins += minutosAbs;
      } else if (descText.includes('CREDITO') || descText.includes('CRÉDITO')) {
        totalCreditMins += minutosAbs;
      } else if (valorString.startsWith('-') || String(r.status || '').toUpperCase().includes('DEBITO')) {
        totalDebitMins += minutosAbs;
      } else {
        totalCreditMins += minutosAbs;
      }

      if (r.a_vencer_em_dias > 0 && r.a_vencer_em_dias <= 30) {
        criticalCount++;
        criticalMins += minutosAbs;
      }
    });

    const saldoRealMin = totalCreditMins - totalDebitMins;

    return {
      totalCreditMins,
      totalDebitMins,
      saldoRealMin,
      criticalCount,
      criticalMins
    };
  }, [userRecords]);

  // Filtros de busca no extrato detalhado
  const filteredRecords = useMemo(() => {
    return userRecords.filter(r => {
      const descText = String(r.descricao || '').toLowerCase();
      const statusText = String(r.status || '').toLowerCase();
      const saldoText = String(r.saldo_compensar || r.saldo_a_compensar || '').toLowerCase();

      const matchesSearch =
        !searchTerm ||
        descText.includes(searchTerm.toLowerCase()) ||
        statusText.includes(searchTerm.toLowerCase()) ||
        saldoText.includes(searchTerm.toLowerCase());

      const isDeb = descText.includes('debito') || descText.includes('débito') || statusText.includes('debito');
      const isCred = descText.includes('credito') || descText.includes('crédito') || statusText.includes('credito');

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'CREDITO' && isCred) ||
        (statusFilter === 'DEBITO' && isDeb) ||
        (statusFilter === 'CRITICO' && r.a_vencer_em_dias <= 30);

      return matchesSearch && matchesStatus;
    });
  }, [userRecords, searchTerm, statusFilter]);

  // Filtro de colaboradores no painel admin
  const filteredCollaborators = useMemo(() => {
    return collaboratorsSummary.filter(c => {
      const matchesSearch =
        !colabSearchTerm ||
        c.name.toLowerCase().includes(colabSearchTerm.toLowerCase()) ||
        c.matricula.toLowerCase().includes(colabSearchTerm.toLowerCase()) ||
        (c.cargo && c.cargo.toLowerCase().includes(colabSearchTerm.toLowerCase()));

      const matchesFilter =
        colabFilter === 'ALL' ||
        (colabFilter === 'POSITIVO' && c.saldoRealMin > 0) ||
        (colabFilter === 'NEGATIVO' && c.saldoRealMin < 0) ||
        (colabFilter === 'CRITICO' && c.criticalCount > 0);

      return matchesSearch && matchesFilter;
    });
  }, [collaboratorsSummary, colabSearchTerm, colabFilter]);

  const isGeralPositive = consolidatedStats.totalGeralSaldoMin >= 0;
  const isUserPositive = userStats.saldoRealMin >= 0;

  return (
    <div className="space-y-8">
      {/* ========================================================= */}
      {/* PAINEL ADMINISTRATIVO: BLOCO GERAL CONSOLIDADO DA EQUIPE */}
      {/* ========================================================= */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Banco de Horas Geral — Consolidado Supabase Cloud</span>
              </h2>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Indexação direta da coluna 'descricao' em tempo real ({collaboratorsSummary.length} técnicos mapeados)
              </p>
            </div>

            <button
              type="button"
              onClick={carregarBancoHorasSupabase}
              disabled={isLoadingCloud}
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCloud ? 'animate-spin text-indigo-500' : ''}`} />
              <span>{isLoadingCloud ? 'Atualizando...' : 'Recarregar Nuvem'}</span>
            </button>
          </div>

          {/* KPI CARDS: GERAL CONSOLIDADO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CARD 'SALDO ATUAL' (Bloco Geral Consolidado) */}
            <div
              className={`p-5 rounded-3xl border shadow-sm relative overflow-hidden flex flex-col justify-between transition-all ${
                isGeralPositive
                  ? darkMode
                    ? 'bg-emerald-950/40 border-emerald-600/80 text-emerald-200 shadow-emerald-950/30'
                    : 'bg-emerald-50/90 border-emerald-400 text-emerald-950 shadow-emerald-100'
                  : darkMode
                  ? 'bg-rose-950/40 border-rose-600/80 text-rose-200 shadow-rose-950/30'
                  : 'bg-rose-50/90 border-rose-400 text-rose-950 shadow-rose-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase font-extrabold tracking-wider opacity-90">
                  SALDO ATUAL DO BANCO (EQUIPE)
                </span>
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm ${
                    isGeralPositive ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {isGeralPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
              </div>
              <div>
                <div
                  className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                    isGeralPositive
                      ? darkMode
                        ? 'text-emerald-400'
                        : 'text-emerald-600'
                      : darkMode
                      ? 'text-rose-400'
                      : 'text-rose-600'
                  }`}
                >
                  {formatHM(consolidatedStats.totalGeralSaldoMin)}
                </div>
                <p className="text-xs mt-1.5 font-medium opacity-90">
                  {isGeralPositive
                    ? 'Saldo Geral Positivo: Crédito acumulado a compensar pela equipe'
                    : 'Saldo Geral Negativo: Débito de jornada acumulado a compensar'}
                </p>
              </div>
            </div>

            {/* Total Geral de Créditos */}
            <div
              className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-bold text-slate-400">Total Créditos (Equipe)</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  ENTRADAS
                </span>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatHM(consolidatedStats.totalGeralCreditosMin)}
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Acumulado de horas crédito identificadas pela coluna 'descricao'
                </p>
              </div>
            </div>

            {/* Total Geral de Débitos */}
            <div
              className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-bold text-slate-400">Total Débitos (Equipe)</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  SAÍDAS
                </span>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
                  -{formatHM(consolidatedStats.totalGeralDebitosMin).replace(/^[+-]/, '')}
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Acumulado de horas débito identificadas pela coluna 'descricao'
                </p>
              </div>
            </div>
          </div>

          {/* TABELA DE DETALHAMENTO POR COLABORADOR */}
          <div
            className={`rounded-3xl border shadow-xs p-5 space-y-4 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/20">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-500" />
                  <span>Tabela de Detalhamento por Colaborador</span>
                </h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Visão individualizada sincronizada diretamente do banco de dados
                </p>
              </div>

              {/* Filtros da Tabela de Colaboradores */}
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar colaborador..."
                    value={colabSearchTerm}
                    onChange={e => setColabSearchTerm(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium border ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <select
                  value={colabFilter}
                  onChange={e => setColabFilter(e.target.value as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="ALL">Todos os Saldos</option>
                  <option value="POSITIVO">Apenas Crédito (+)</option>
                  <option value="NEGATIVO">Apenas Débito (-)</option>
                  <option value="CRITICO">Com Vencimentos CLT (&le; 30d)</option>
                </select>
              </div>
            </div>

            {/* Listagem em Tabela */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr
                    className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                      darkMode ? 'border-slate-800 text-slate-400 bg-slate-800/40' : 'border-slate-100 text-slate-500 bg-slate-50'
                    }`}
                  >
                    <th className="p-3 rounded-l-xl">Colaborador / Matrícula</th>
                    <th className="p-3">Total Créditos</th>
                    <th className="p-3">Total Débitos</th>
                    <th className="p-3">Saldo</th>
                    <th className="p-3">Situação</th>
                    <th className="p-3 text-right rounded-r-xl">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/10">
                  {filteredCollaborators.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs font-semibold text-slate-400">
                        Nenhum colaborador encontrado para o filtro aplicado.
                      </td>
                    </tr>
                  ) : (
                    filteredCollaborators.map(c => {
                      const isPositive = c.saldoRealMin >= 0;
                      const isSelected = currentTech?.id === c.id;

                      return (
                        <tr
                          key={c.id}
                          onClick={() => onSelectTechId?.(c.id)}
                          className={`cursor-pointer transition-colors ${
                            isPositive
                              ? darkMode
                                ? 'bg-emerald-950/20 hover:bg-emerald-950/40'
                                : 'bg-emerald-50/70 hover:bg-emerald-100/60'
                              : darkMode
                              ? 'bg-rose-950/20 hover:bg-rose-950/40'
                              : 'bg-rose-50/70 hover:bg-rose-100/60'
                          } ${isSelected ? 'ring-2 ring-indigo-500 rounded-lg' : ''}`}
                        >
                          <td className="p-3 font-semibold whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 dark:text-white">{c.name}</span>
                              {c.ddd && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                  DDD {c.ddd}
                                </span>
                              )}
                              {c.matricula && (
                                <span className="text-[10px] text-slate-400 font-mono">({c.matricula})</span>
                              )}
                            </div>
                            {c.cargo && <div className="text-[11px] text-slate-400 font-normal">{c.cargo}</div>}
                          </td>

                          {/* Total Créditos */}
                          <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatHM(c.totalCreditosMin)}
                          </td>

                          {/* Total Débitos */}
                          <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            -{formatHM(c.totalDebitosMin).replace(/^[+-]/, '')}
                          </td>

                          {/* Coluna 'Saldo' com coloração Verde (#16a34a) ou Vermelho (#dc2626) */}
                          <td className="p-3 font-mono font-black text-sm whitespace-nowrap">
                            <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {formatHM(c.saldoRealMin)}
                            </span>
                          </td>

                          {/* Situação / Badges */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                  isPositive
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                }`}
                              >
                                {isPositive ? 'Crédito a Usufruir' : 'Débito a Compensar'}
                              </span>

                              {c.criticalCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{c.criticalCount} a vencer</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Botão Selecionar / Ver Extrato */}
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onSelectTechId?.(c.id);
                              }}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : darkMode
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              <span>{isSelected ? 'Selecionado' : 'Ver Extrato'}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
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

      {/* ========================================================================= */}
      {/* SEÇÃO INDIVIDUAL: EXTRATO DO COLABORADOR SELECIONADO OU USUÁRIO LOGADO */}
      {/* ========================================================================= */}
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
                {isAdmin ? 'Visualizando Técnico Selecionado (Sincronizado Supabase):' : 'Seu Extrato Individual (Supabase Cloud):'}
              </span>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Extrato do Banco de Horas — {currentTech ? currentTech.name : (currentUser?.name || 'Colaborador')}</span>
                {currentTech?.ddd && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    DDD {currentTech.ddd}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* CARDS INDIVIDUAIS: SALDO ATUAL DO BANCO DE HORAS COM COLORAÇÃO DINÂMICA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 'SALDO ATUAL DO BANCO DE HORAS' (Individual) */}
          <div
            className={`p-5 rounded-3xl border shadow-sm relative overflow-hidden flex flex-col justify-between transition-all ${
              isUserPositive
                ? darkMode
                  ? 'bg-emerald-950/40 border-emerald-600/80 text-emerald-200'
                  : 'bg-emerald-50/90 border-emerald-400 text-emerald-950'
                : darkMode
                ? 'bg-rose-950/40 border-rose-600/80 text-rose-200'
                : 'bg-rose-50/90 border-rose-400 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-extrabold tracking-wider opacity-85">
                SALDO ATUAL DO BANCO DE HORAS
              </span>
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${
                  isUserPositive ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {isUserPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
            </div>
            <div>
              <div
                className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                  isUserPositive
                    ? darkMode
                      ? 'text-emerald-400'
                      : 'text-emerald-600'
                    : darkMode
                    ? 'text-rose-400'
                    : 'text-rose-600'
                }`}
              >
                {formatHM(userStats.saldoRealMin)}
              </div>
              <p className="text-xs mt-1.5 opacity-90 font-medium">
                {isUserPositive
                  ? 'Crédito positivo disponível para compensação em folgas ou pagamento'
                  : 'Débito de horas pendente para compensação de jornada'}
              </p>
            </div>
          </div>

          {/* Créditos Acumulados */}
          <div
            className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold text-slate-400">Total de Horas Crédito</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                ENTRADAS
              </span>
            </div>
            <div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatHM(userStats.totalCreditMins)}
              </div>
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Horas extras e créditos acumulados
              </p>
            </div>
          </div>

          {/* Débitos Acumulados */}
          <div
            className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold text-slate-400">Total de Horas Débito</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-600 dark:text-rose-400">
                SAÍDAS
              </span>
            </div>
            <div>
              <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                -{formatHM(userStats.totalDebitMins).replace(/^[+-]/, '')}
              </div>
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Folgas usufruídas ou faltas/saídas antecipadas
              </p>
            </div>
          </div>
        </div>

        {/* ALERTA DE HORAS A VENCER EM ATÉ 30 DIAS (CLT) */}
        {userStats.criticalCount > 0 && (
          <div
            className={`p-4 sm:p-5 rounded-3xl border flex items-start sm:items-center gap-3 sm:gap-4 transition-all ${
              darkMode ? 'bg-rose-950/40 border-rose-800 text-rose-200' : 'bg-rose-50/80 border-rose-200 text-rose-950'
            }`}
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-xs sm:text-sm text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚠️ ALERTA CLT - HORAS A VENCER EM MENOS DE 30 DIAS</span>
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 font-extrabold text-[11px] border border-rose-500/30">
                  {userStats.criticalCount} lançamento(s)
                </span>
              </div>
              <p className="text-xs leading-relaxed font-medium opacity-90">
                Você possui <strong>{userStats.criticalCount} lançamento(s)</strong> no valor total de{' '}
                <strong className="font-mono text-xs underline font-black">+{formatHM(userStats.criticalMins).replace(/^[+-]/, '')}</strong> prestes a expirar.
                De acordo com a Legislação Trabalhista (CLT), as horas do banco devem ser compensadas em até{' '}
                <strong>3 meses (90 dias)</strong> a contar da data de realização.
              </p>
            </div>
          </div>
        )}

        {/* EXTRATO DETALHADO DO COLABORADOR COM COLORAÇÃO DINÂMICA */}
        <div
          className={`rounded-3xl border shadow-xs p-5 space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/20">
            <div>
              <h3 className="font-black text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Extrato Detalhado de Lançamentos</span>
              </h3>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Lançamentos registrados no Supabase com coloração baseada na coluna 'descricao'
              </p>
            </div>

            {/* Filtros e Busca de Lançamentos */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar lançamento..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium border ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="ALL">Todos os Status</option>
                <option value="CREDITO">Apenas Créditos (+)</option>
                <option value="DEBITO">Apenas Débitos (-)</option>
                <option value="CRITICO">Críticos (&le; 30 dias)</option>
              </select>
            </div>
          </div>

          {/* Tabela de Lançamentos */}
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-400">
              Nenhum lançamento encontrado no Banco de Horas para este colaborador.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr
                    className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                      darkMode ? 'border-slate-800 text-slate-400 bg-slate-800/40' : 'border-slate-100 text-slate-500 bg-slate-50'
                    }`}
                  >
                    <th className="p-3 rounded-l-xl">Data Realização</th>
                    <th className="p-3">Descrição / Motivo</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Saldo a Compensar</th>
                    <th className="p-3">Vencimento</th>
                    <th className="p-3 rounded-r-xl">Prazo Restante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/10">
                  {filteredRecords.map((r, idx) => {
                    const descText = String(r.descricao || r.status || '').toUpperCase();
                    const valorString = String(r.saldo_compensar || r.saldo_a_compensar || '00:00');
                    const match = valorString.match(/(\d+):(\d+)/);
                    let minutosAbs = 0;

                    if (match) {
                      minutosAbs = (parseInt(match[1], 10) || 0) * 60 + (parseInt(match[2], 10) || 0);
                    } else {
                      minutosAbs = Math.abs(hmToMin(valorString));
                    }

                    const isDebit = descText.includes('DEBITO') || descText.includes('DÉBITO') || valorString.startsWith('-');
                    const isCredit = !isDebit;
                    const isCritico = r.a_vencer_em_dias > 0 && r.a_vencer_em_dias <= 30;

                    return (
                      <tr
                        key={r.id || idx}
                        className={`transition-colors ${
                          isCritico
                            ? darkMode
                              ? 'bg-rose-950/30 hover:bg-rose-950/40'
                              : 'bg-rose-50/80 hover:bg-rose-100/70'
                            : isCredit
                            ? darkMode
                              ? 'bg-emerald-950/15 hover:bg-emerald-950/30'
                              : 'bg-emerald-50/60 hover:bg-emerald-100/50'
                            : darkMode
                            ? 'bg-rose-950/15 hover:bg-rose-950/30'
                            : 'bg-rose-50/60 hover:bg-rose-100/50'
                        }`}
                      >
                        <td className="p-3 font-semibold whitespace-nowrap">
                          {r.data_realizacao ? r.data_realizacao.split('-').reverse().join('/') : '-'}
                        </td>
                        <td className="p-3 max-w-xs truncate font-medium">
                          {r.descricao || 'Banco de Horas acumulado'}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                              isCredit
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {isCredit ? 'CRÉDITO' : 'DÉBITO'}
                          </span>
                        </td>

                        {/* Coluna Saldo com Verde (#16a34a) ou Vermelho (#dc2626) */}
                        <td className="p-3 font-mono font-black text-sm whitespace-nowrap">
                          <span className={isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {isCredit ? `+${formatHM(minutosAbs).replace(/^[+-]/, '')}` : `-${formatHM(minutosAbs).replace(/^[+-]/, '')}`}
                          </span>
                        </td>

                        <td className="p-3 font-medium whitespace-nowrap opacity-80">
                          {r.data_vencimento ? r.data_vencimento.split('-').reverse().join('/') : '-'}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {isCritico ? (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 flex items-center gap-1 w-fit shadow-2xs">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{r.a_vencer_em_dias} dias (CRÍTICO)</span>
                            </span>
                          ) : r.a_vencer_em_dias > 0 ? (
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 w-fit inline-block">
                              {r.a_vencer_em_dias} dias
                            </span>
                          ) : (
                            <span className="opacity-60">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
