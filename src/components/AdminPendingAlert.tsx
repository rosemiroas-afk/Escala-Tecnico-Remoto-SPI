import React from 'react';
import { OffRequest, Technician } from '../types';
import { formatDisplayDate } from '../utils/dateUtils';
import { Bell, Check, X, ArrowRight, Calendar, User, FileText } from 'lucide-react';

interface AdminPendingAlertProps {
  isOpen: boolean;
  onClose: () => void;
  pendingRequests: OffRequest[];
  technicians: Technician[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onOpenAllRequests: () => void;
  darkMode: boolean;
}

export const AdminPendingAlert: React.FC<AdminPendingAlertProps> = ({
  isOpen,
  onClose,
  pendingRequests,
  technicians,
  onApprove,
  onReject,
  onOpenAllRequests,
  darkMode
}) => {
  if (!isOpen || pendingRequests.length === 0) return null;

  const techMap = new Map(technicians.map(t => [t.id, t]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border transition-all ${
        darkMode
          ? 'bg-slate-900 border-slate-700 text-slate-100'
          : 'bg-white border-amber-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          darkMode
            ? 'bg-gradient-to-r from-amber-950/50 to-slate-900 border-slate-800'
            : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  Alerta para Administrador
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white">
                  {pendingRequests.length} pendente{pendingRequests.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Novas solicitações de folga dos técnicos aguardando sua análise e aprovação.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              darkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
            }`}
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Requests List */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3.5">
          {pendingRequests.map(req => {
            const tech = techMap.get(req.technicianId);
            const formattedDate = formatDisplayDate(req.date);

            return (
              <div
                key={req.id}
                className={`p-4 rounded-xl border transition-all ${
                  darkMode
                    ? 'bg-slate-800/80 border-slate-700 hover:border-amber-500/50'
                    : 'bg-amber-50/40 border-amber-200/80 hover:border-amber-400'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm flex items-center gap-1.5">
                        <User className="w-4 h-4 text-indigo-500" />
                        {tech?.name || 'Técnico'}
                      </span>
                      {tech?.ddd && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          darkMode ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          DDD {tech.ddd}
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 border border-amber-500/30 uppercase tracking-wider">
                        {req.reasonCategory}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Data solicitada: <strong>{formattedDate}</strong></span>
                    </div>

                    {req.notes && req.notes.length > 0 && (
                      <div className={`text-xs mt-1 pl-2 border-l-2 ${
                        darkMode ? 'border-amber-500/40 text-slate-300' : 'border-amber-400 text-slate-700'
                      }`}>
                        {req.notes.map((n, i) => (
                          <div key={i} className="flex items-start gap-1">
                            <span className="text-amber-500">•</span>
                            <span>{n}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => onApprove(req.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                      title="Aprovar esta solicitação de folga"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aprovar</span>
                    </button>
                    <button
                      onClick={() => onReject(req.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                        darkMode
                          ? 'border-rose-800/80 text-rose-300 hover:bg-rose-950/60'
                          : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                      }`}
                      title="Recusar esta solicitação"
                    >
                      <X className="w-4 h-4" />
                      <span>Recusar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3.5 border-t flex flex-wrap items-center justify-between gap-3 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'
        }`}>
          <button
            onClick={() => {
              onClose();
              onOpenAllRequests();
            }}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Ver Painel Completo de Solicitações</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              darkMode
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Dispensar / Revisar Mais Tarde
          </button>
        </div>
      </div>
    </div>
  );
};
