import React, { useState, useMemo } from 'react';
import { BancoHorasRecord, AppUser, Technician } from '../types';
import { saldoToMinutes, minutesToSaldo } from '../utils/csvBancoHorasParser';
import { normalizeName } from '../utils/csvScheduleParser';
import { Clock, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Search, Filter, Calendar } from 'lucide-react';

interface BancoHorasViewProps {
  records: BancoHorasRecord[];
  currentUser: AppUser | null;
  technicians: Technician[];
  selectedTechId?: string;
  onSelectTechId?: (id: string) => void;
  darkMode: boolean;
}

export const BancoHorasView: React.FC<BancoHorasViewProps> = ({
  records,
  currentUser,
  technicians,
  selectedTechId: propSelectedTechId,
  onSelectTechId,
  darkMode
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const isAdmin = currentUser?.role === 'admin';

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

  const currentTech = useMemo(() => {
    if (!isAdmin) {
      return loggedTech || technicians.find(t => t.id === currentUser?.technicianId || t.id === currentUser?.id) || null;
    }
    if (propSelectedTechId) {
      return technicians.find(t => t.id === propSelectedTechId) || technicians[0] || null;
    }
    return technicians[0] || null;
  }, [isAdmin, loggedTech, propSelectedTechId, currentUser, technicians]);

  // Filter records matching this collaborator (by matricula or name similarity)
  const userRecords = useMemo(() => {
    if (!currentTech && !currentUser) return [];

    const targetNameNorm = normalizeName(currentTech?.name || currentUser?.name || '');
    const targetMatricula = currentUser?.id || currentTech?.id || '';

    return records.filter(r => {
      // Direct match on matricula
      if (r.matricula && (r.matricula === targetMatricula || r.matricula === currentTech?.id)) {
        return true;
      }
      // Match on normalized name
      const recNameNorm = normalizeName(r.nome_colaborador || '');
      if (recNameNorm && targetNameNorm && (recNameNorm === targetNameNorm || recNameNorm.includes(targetNameNorm) || targetNameNorm.includes(recNameNorm))) {
        return true;
      }
      return false;
    });
  }, [records, currentTech, currentUser]);

  // Calculations
  const stats = useMemo(() => {
    let totalMins = 0;
    let creditMins = 0;
    let debitMins = 0;
    let criticalCount = 0;
    let criticalMins = 0;

    userRecords.forEach(r => {
      const mins = saldoToMinutes(r.saldo_a_compensar);
      totalMins += mins;

      if (mins > 0) creditMins += mins;
      if (mins < 0) debitMins += Math.abs(mins);

      // Critical alert if expiring in 30 days or less
      if (r.a_vencer_em_dias > 0 && r.a_vencer_em_dias <= 30) {
        criticalCount++;
        criticalMins += Math.abs(mins);
      }
    });

    return {
      totalMins,
      creditMins,
      debitMins,
      criticalCount,
      criticalMins
    };
  }, [userRecords]);

  // Filtered records for table display
  const filteredRecords = useMemo(() => {
    return userRecords.filter(r => {
      const matchesSearch =
        !searchTerm ||
        r.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.saldo_a_compensar.includes(searchTerm);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'CREDITO' && (r.status.includes('CREDITO') || r.status.includes('CRÉDITO'))) ||
        (statusFilter === 'DEBITO' && (r.status.includes('DEBITO') || r.status.includes('DÉBITO'))) ||
        (statusFilter === 'CRITICO' && r.a_vencer_em_dias <= 30);

      return matchesSearch && matchesStatus;
    });
  }, [userRecords, searchTerm, statusFilter]);

  const isPositiveBalance = stats.totalMins >= 0;

  return (
    <div className="space-y-6">
      {/* Header Info Banner confirming current technician (Sincronizado) */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Sincronizado com o Filtro do Topo:
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

      {/* Main KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Balance Card */}
        <div className={`p-5 rounded-3xl border shadow-xs relative overflow-hidden flex flex-col justify-between ${
          isPositiveBalance
            ? darkMode ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : darkMode ? 'bg-amber-950/40 border-amber-800/80 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-extrabold tracking-wider opacity-80">Saldo Total Acumulado</span>
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-lg ${
              isPositiveBalance ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
            }`}>
              {isPositiveBalance ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
              {minutesToSaldo(stats.totalMins)}
            </div>
            <p className="text-xs mt-1.5 opacity-90 font-medium">
              {isPositiveBalance
                ? 'Crédito total a compensar em folgas ou pagamentos'
                : 'Débito pendente para compensação de jornada'}
            </p>
          </div>
        </div>

        {/* Credit Breakdown */}
        <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-bold text-slate-400">Total de Horas Crédito</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400">
              ENTRADAS
            </span>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-emerald-500">
              +{minutesToSaldo(stats.creditMins)}
            </div>
            <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Horas extras acumuladas a compensar
            </p>
          </div>
        </div>

        {/* Debit Breakdown */}
        <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-bold text-slate-400">Total de Horas Débito</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400">
              SAÍDAS
            </span>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-rose-500">
              -{minutesToSaldo(stats.debitMins)}
            </div>
            <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Folgas usufruídas ou saídas antecipadas
            </p>
          </div>
        </div>
      </div>

      {/* Critical Expiry Warning Alert Banner */}
      {stats.criticalCount > 0 && (
        <div className={`p-5 rounded-3xl border shadow-md flex flex-col md:flex-row items-start md:items-center gap-4 transition-all animate-pulse ${
          darkMode
            ? 'bg-rose-950/60 border-rose-800 text-rose-200'
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-rose-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-base text-rose-600 dark:text-rose-300">
                ⚠️ ALERTA CLT - HORAS A VENCER EM MENOS DE 30 DIAS
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-xs">
                {stats.criticalCount} lançamento(s)
              </span>
            </div>
            <p className="text-xs leading-relaxed font-medium">
              Você possui <strong>{stats.criticalCount} lançamento(s)</strong> no valor total de{' '}
              <strong className="font-mono text-sm underline">{minutesToSaldo(stats.criticalMins)}</strong> prestes a expirar.
              De acordo com a Legislação Trabalhista (CLT), as horas do banco devem ser compensadas em até <strong>3 meses (90 dias)</strong> a contar da data de realização, caso contrário prescrevem ou devem ser quitadas em folha.
            </p>
          </div>
        </div>
      )}

      {/* Extrato Detalhado Section */}
      <div className={`rounded-3xl border shadow-xs p-5 space-y-4 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/20">
          <div>
            <h3 className="font-black text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Extrato Detalhado do Banco de Horas</span>
            </h3>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Lançamentos individuais registrados no sistema oficial
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar lançamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium border ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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

        {/* Table */}
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-xs font-semibold text-slate-400">
            Nenhum lançamento encontrado no Banco de Horas para o filtro selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                  darkMode ? 'border-slate-800 text-slate-400 bg-slate-800/40' : 'border-slate-100 text-slate-500 bg-slate-50'
                }`}>
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
                  const isCritico = r.a_vencer_em_dias > 0 && r.a_vencer_em_dias <= 30;
                  const isCredito = r.status.includes('CREDITO') || r.status.includes('CRÉDITO') || !r.saldo_a_compensar.startsWith('-');

                  return (
                    <tr
                      key={r.id || idx}
                      className={`transition-colors ${
                        isCritico
                          ? darkMode ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'bg-rose-50/60 hover:bg-rose-50'
                          : darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3 font-semibold whitespace-nowrap">
                        {r.data_realizacao ? r.data_realizacao.split('-').reverse().join('/') : '-'}
                      </td>
                      <td className="p-3 max-w-xs truncate font-medium">
                        {r.descricao || 'Banco de Horas acumulado'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          isCredito
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-extrabold text-sm whitespace-nowrap">
                        <span className={isCredito ? 'text-emerald-500' : 'text-rose-500'}>
                          {r.saldo_a_compensar}
                        </span>
                      </td>
                      <td className="p-3 font-medium whitespace-nowrap opacity-80">
                        {r.data_vencimento ? r.data_vencimento.split('-').reverse().join('/') : '-'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {isCritico ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{r.a_vencer_em_dias} dias (CRÍTICO)</span>
                          </span>
                        ) : r.a_vencer_em_dias <= 60 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {r.a_vencer_em_dias} dias
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {r.a_vencer_em_dias} dias
                          </span>
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
  );
};
