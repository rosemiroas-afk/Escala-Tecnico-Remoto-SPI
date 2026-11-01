import React from 'react';
import { AuditResult } from '../utils/validator';
import { Technician } from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Info
} from 'lucide-react';

interface ValidationReportProps {
  auditResult: AuditResult;
  technicians: Technician[];
  onAutoFix?: () => void;
  onOpenGenerator: () => void;
}

export const ValidationReport: React.FC<ValidationReportProps> = ({
  auditResult,
  onOpenGenerator
}) => {
  const { score, isValid, issues } = auditResult;

  // Breakdown checks: strictly 7 consecutive days and off request conflicts
  const consecutiveErrors = issues.filter(i => i.type === 'consecutive_days');
  const unfulfilledRequests = issues.filter(i => i.type === 'unfulfilled_request');

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className={`p-6 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-4 transition-colors ${
        isValid || issues.length === 0
          ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border-emerald-200 dark:border-emerald-800/60 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-indigo-950/30'
          : 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
            isValid || issues.length === 0
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}>
            {isValid || issues.length === 0 ? <ShieldCheck className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Auditoria de Conformidade e Conflitos
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                isValid || issues.length === 0
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
              }`}>
                Score: {score}%
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
              {isValid || issues.length === 0
                ? 'Tudo em conformidade! Nenhum colaborador com 7 dias seguidos de trabalho e nenhuma solicitação de folga em conflito na escala.'
                : `A escala possui ${consecutiveErrors.length} caso(s) de 7+ dias seguidos e ${unfulfilledRequests.length} conflito(s) de folga que necessitam de ajuste.`}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenGenerator}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Redistribuir Escala Automaticamente</span>
        </button>
      </div>

      {/* Rules Checklist Grid: Exclusively 7 Consecutive Days and Off Request Conflicts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rule 1: Max 6 consecutive days (no 7+ days) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Limite de 7 Dias Seguidos (CLT 6x1)
            </span>
            {consecutiveErrors.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-500" />
            )}
          </div>
          <div className="text-base font-bold text-slate-800 dark:text-white">
            {consecutiveErrors.length === 0 ? 'Conforme (Máx 6 dias)' : `${consecutiveErrors.length} violação(ões)`}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Proibido trabalhar 7 ou mais dias seguidos sem dia de descanso.
          </p>
        </div>

        {/* Rule 2: Off Requests fulfillment */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Conflitos de Solicitações de Folga
            </span>
            {unfulfilledRequests.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div className="text-base font-bold text-slate-800 dark:text-white">
            {unfulfilledRequests.length === 0 ? 'Sem Conflitos (Tudo Atendido)' : `${unfulfilledRequests.length} solicitação(ões) não atendida(s)`}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Garante que datas solicitadas pelos colaboradores não coincidam com trabalho ativo.
          </p>
        </div>
      </div>

      {/* Issues List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Falhas e Conflitos Ativos ({issues.length})
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {consecutiveErrors.length} falhas de 7 dias | {unfulfilledRequests.length} conflitos de folga
          </span>
        </div>

        {issues.length === 0 ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tudo Certo! Nenhum Conflito Encontrado</span>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-md mt-1">
              Todas as regras foram rigorosamente verificadas: nenhum colaborador atinge 7 dias consecutivos de trabalho e todas as solicitações de folga cadastradas estão devidamente contempladas ou resolvidas.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {issues.map(iss => {
              const isConsecutive = iss.type === 'consecutive_days';
              return (
                <div key={iss.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-start gap-3">
                  <div className={`mt-0.5 p-1 rounded-lg ${isConsecutive ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'}`}>
                    {isConsecutive ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{iss.message}</span>
                      {iss.ddd && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-md font-semibold">
                          DDD {iss.ddd}
                        </span>
                      )}
                      {iss.date && (
                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-md font-semibold">
                          {iss.date}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                        isConsecutive
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      }`}>
                        {isConsecutive ? 'Falha 7 Dias Seguidos' : 'Conflito de Folga'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

