import React from 'react';
import { CltViolationDetails } from '../utils/validator';
import { formatDisplayDate } from '../utils/dateUtils';
import { ShieldAlert, AlertTriangle, X, Scale, CalendarX2 } from 'lucide-react';

interface CltViolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  violation: CltViolationDetails | null;
  technicianName?: string;
}

export const CltViolationModal: React.FC<CltViolationModalProps> = ({
  isOpen,
  onClose,
  violation,
  technicianName
}) => {
  if (!isOpen || !violation || !violation.hasViolation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-rose-500/80 dark:border-rose-600 transition-all scale-100">
        {/* Header com destaque de alerta e código CLT */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-900/60 px-2 py-0.5 rounded-full text-amber-200 border border-amber-300/30">
                  Infração CLT
                </span>
                <span className="text-[10px] font-bold text-rose-100">Artigo 67 CLT / OJ 410 TST</span>
              </div>
              <h2 className="text-base font-bold text-white leading-tight mt-0.5">
                Violação de Regras Trabalhistas
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do alerta explicativo */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <p className="font-semibold text-rose-950 dark:text-rose-100">
                Atenção {technicianName ? <strong>{technicianName}</strong> : 'Colaborador'}:
              </p>
              <p className="leading-relaxed">
                Caso esta solicitação de folga para <strong>{formatDisplayDate(violation.targetDate)}</strong> seja aceita pelo administrador, a sua escala resultará em <strong>{violation.consecutiveDays} dias trabalhados seguidos</strong> (de {formatDisplayDate(violation.startDate)} a {formatDisplayDate(violation.endDate)}).
              </p>
            </div>
          </div>

          {/* Card com a legislação e fundamentação jurídica */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Fundamentação Legal Obrigatória:</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 pl-1 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-rose-500 font-bold">•</span>
                <span>
                  <strong>Artigo 67 da CLT:</strong> O repouso semanal remunerado (DSR) é obrigatório após no máximo 6 dias de trabalho contínuo.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-500 font-bold">•</span>
                <span>
                  <strong>Orientação Jurisprudencial 410 (TST):</strong> Viola as leis trabalhistas e a Constituição Federal a concessão de descanso após o 7º dia consecutivo de trabalho.
                </span>
              </li>
            </ul>
          </div>

          {/* Bloqueio explícito com mensagem final solicitada */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl flex items-center gap-3">
            <CalendarX2 className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs font-bold text-amber-900 dark:text-amber-200 leading-snug">
              Solicitação não será enviada por violar regra de 7 dias seguidos.
            </p>
          </div>
        </div>

        {/* Rodapé com botão de ação para fechar */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            Entendido (Fechar)
          </button>
        </div>
      </div>
    </div>
  );
};
