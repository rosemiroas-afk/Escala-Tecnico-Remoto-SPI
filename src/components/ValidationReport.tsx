import React from 'react';
import { AuditResult } from '../utils/validator';
import { Technician, OffRequest } from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Info,
  Calendar,
  Users
} from 'lucide-react';

interface ValidationReportProps {
  auditResult: AuditResult;
  technicians: Technician[];
  onAutoFix?: () => void;
  onOpenGenerator: () => void;
}

export const ValidationReport: React.FC<ValidationReportProps> = ({
  auditResult,
  technicians,
  onAutoFix,
  onOpenGenerator
}) => {
  const { score, isValid, issues, globalStats } = auditResult;

  const errorIssues = issues.filter(i => i.severity === 'error');
  const warningIssues = issues.filter(i => i.severity === 'warning');

  // Breakdown checks
  const consecutiveErrors = issues.filter(i => i.type === 'consecutive_days');
  const missingDoubleErrors = issues.filter(i => i.type === 'missing_double_weekend');
  const excessiveOffErrors = issues.filter(i => i.type === 'excessive_offs');
  const unfulfilledRequests = issues.filter(i => i.type === 'unfulfilled_request');

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className={`p-6 rounded-2xl border shadow-sm flex flex-wrap items-center justify-between gap-4 ${
        score >= 90
          ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border-emerald-200'
          : score >= 70
          ? 'bg-amber-50/70 border-amber-200'
          : 'bg-rose-50/70 border-rose-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            score >= 90
              ? 'bg-emerald-600 text-white'
              : score >= 70
              ? 'bg-amber-500 text-white'
              : 'bg-rose-600 text-white'
          }`}>
            {score >= 90 ? <ShieldCheck className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">
                Auditoria de Conformidade da Escala 6x1
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                score >= 90
                  ? 'bg-emerald-100 text-emerald-800'
                  : score >= 70
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                Score: {score}%
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              {isValid
                ? 'Excelente! A escala atende rigorosamente a todos os requisitos: descanso 6x1 CLT, fim de semana duplado garantido e boa distribuição.'
                : `A escala possui ${errorIssues.length} ponto(s) crítico(s) e ${warningIssues.length} observação(ões) que necessitam de ajuste.`}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenGenerator}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Redistribuir Automaticamente</span>
        </button>
      </div>

      {/* Rules Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rule 1: Max 6 consecutive days */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Limite Legal CLT (6x1)
            </span>
            {consecutiveErrors.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-500" />
            )}
          </div>
          <div className="text-base font-bold text-slate-800">
            {consecutiveErrors.length === 0 ? 'Conforme (Máx 6 dias)' : `${consecutiveErrors.length} violação(ões)`}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Proibido trabalhar 7 ou mais dias seguidos sem folga.
          </p>
        </div>

        {/* Rule 2: Double weekend off */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Fim de Semana Duplado
            </span>
            {missingDoubleErrors.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-500" />
            )}
          </div>
          <div className="text-base font-bold text-slate-800">
            {missingDoubleErrors.length === 0
              ? '100% dos técnicos contemplados'
              : `${missingDoubleErrors.length} sem fim de semana`}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mínimo 1 fim de semana (Sáb + Dom) livre no bimestre.
          </p>
        </div>

        {/* Rule 3: Weekend concentration */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Equilíbrio nos Fins de Semana
            </span>
            {excessiveOffErrors.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-500" />
            )}
          </div>
          <div className="text-base font-bold text-slate-800">
            {excessiveOffErrors.length === 0 ? 'Distribuição equilibrada' : `${excessiveOffErrors.length} excesso(s)`}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Máx 1 a 2 folgas simultâneas por DDD nos fins de semana.
          </p>
        </div>

        {/* Rule 4: Off Requests fulfillment */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pedidos de Folga Atendidos
            </span>
            {unfulfilledRequests.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div className="text-base font-bold text-slate-800">
            {globalStats.requestsSatisfactionRate}% atendidos
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Priorização de casamentos, médicos e compromissos.
          </p>
        </div>
      </div>

      {/* Issues List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            Detalhamento de Observações e Alertas ({issues.length})
          </h3>
          <span className="text-xs text-slate-500">
            {errorIssues.length} erros críticos | {warningIssues.length} avisos
          </span>
        </div>

        {issues.length === 0 ? (
          <div className="p-10 text-center text-slate-500 flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
            <span className="font-bold text-slate-800 text-sm">Nenhum conflito encontrado!</span>
            <p className="text-xs text-slate-400 max-w-md mt-1">
              Todos os requisitos da sua equipe foram validados: descansos semanais 6x1 estritamente respeitados, folgas duplas concedidas e cobertura assegurada.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {issues.map(iss => {
              const isError = iss.severity === 'error';
              return (
                <div key={iss.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-3">
                  <div className={`mt-0.5 p-1 rounded-lg ${isError ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isError ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-xs">{iss.message}</span>
                      {iss.ddd && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-md font-semibold">
                          DDD {iss.ddd}
                        </span>
                      )}
                      {iss.date && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-md font-semibold">
                          {iss.date}
                        </span>
                      )}
                    </div>

                    {iss.suggestion && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span className="font-medium text-slate-700">Sugestão:</span> {iss.suggestion}
                      </p>
                    )}
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
