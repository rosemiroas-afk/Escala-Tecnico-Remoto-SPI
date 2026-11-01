import React from 'react';
import { OffRequest, Technician } from '../types';
import { formatDisplayDate } from '../utils/dateUtils';
import { Check, X, Calendar, User, AlertCircle, Clock } from 'lucide-react';

interface PendingRequestsNotificationWidgetProps {
  pendingRequests: OffRequest[];
  technicians: Technician[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  darkMode?: boolean;
}

export const PendingRequestsNotificationWidget: React.FC<PendingRequestsNotificationWidgetProps> = ({
  pendingRequests,
  technicians,
  onApprove,
  onReject,
  darkMode = false
}) => {
  if (!pendingRequests || pendingRequests.length === 0) return null;

  const techMap = new Map<string, Technician>(technicians.map(t => [t.id, t]));

  return (
    <div className={`mb-6 p-5 rounded-2xl border transition-all shadow-md ${
      darkMode
        ? 'bg-slate-900/90 border-indigo-900/60 text-slate-100 shadow-indigo-950/20'
        : 'bg-white border-indigo-100 text-slate-800 shadow-indigo-100/50'
    }`}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs animate-pulse">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              Notificação de Folgas — Solicitações Pendentes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aprove ou recuse os pedidos enviados pela equipe técnica abaixo:
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded-full font-black text-xs shadow-xs">
          {pendingRequests.length} pendente(s)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingRequests.map(req => {
          const tech = techMap.get(req.technicianId);
          const techName = tech?.name || 'Colaborador';
          const techDDD = tech?.ddd ? `DDD ${tech.ddd}` : '';

          return (
            <div
              key={req.id}
              className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                darkMode
                  ? 'bg-slate-800/80 border-slate-700 hover:border-indigo-500/50'
                  : 'bg-slate-50/80 border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate max-w-[170px]" title={techName}>
                        {techName}
                      </span>
                      {techDDD && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{techDDD}</span>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {req.reasonCategory || 'Folga'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1.5 bg-indigo-50/80 dark:bg-indigo-950/50 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Data Desejada: {formatDisplayDate(req.date)} ({req.date})</span>
                </div>

                {req.notes && req.notes.length > 0 && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800 italic">
                    "{req.notes.join(' | ')}"
                  </p>
                )}
              </div>

              {/* Quick Action Buttons Directly on Card */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/80">
                <button
                  onClick={() => onApprove(req.id)}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  title={
                    req.reasonCategory === 'medico' || (req.notes && req.notes.some(n => /m[eé]dic|consult|exame|sa[uú]de/i.test(n)))
                      ? 'Aprovar e lançar na escala como Folga Parcial (FP)'
                      : 'Aprovar e lançar na escala como Folga Banco (FB)'
                  }
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {req.reasonCategory === 'medico' || (req.notes && req.notes.some(n => /m[eé]dic|consult|exame|sa[uú]de/i.test(n)))
                      ? 'Aprovar (FP)'
                      : 'Aprovar (FB)'}
                  </span>
                </button>

                <button
                  onClick={() => onReject(req.id)}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  title="Recusar folga"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Recusar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
