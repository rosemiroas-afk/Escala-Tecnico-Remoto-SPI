import React, { useState } from 'react';
import { Technician, TechnicianSchedule, SchedulePeriod } from '../types';
import { findImpendingOffs, generateWhatsAppReminderMessage } from '../utils/whatsappNotificationUtils';
import { formatDisplayDate } from '../utils/dateUtils';
import { MessageSquare, Send, Calendar, Bell, Phone, User, CheckCircle2 } from 'lucide-react';

interface WhatsAppPushAlertWidgetProps {
  technicians: Technician[];
  schedules: Record<string, TechnicianSchedule>;
  dates: string[];
  period: SchedulePeriod;
  darkMode?: boolean;
}

export const WhatsAppPushAlertWidget: React.FC<WhatsAppPushAlertWidgetProps> = ({
  technicians,
  schedules,
  dates,
  period,
  darkMode = false
}) => {
  // Default to first date or current active date in range
  const [selectedDate, setSelectedDate] = useState<string>(dates[0] || '2026-11-01');
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});

  const impendingOffs = findImpendingOffs(technicians, schedules, selectedDate);

  const getFullPhoneNumber = (tech: Technician): string => {
    if (!tech.phone) return '';
    const raw = tech.phone.replace(/\D/g, '');
    if (!raw) return '';
    if (raw.length <= 9) {
      return `${tech.ddd}${raw}`;
    }
    return raw;
  };

  const handleSendWhatsApp = (tech: Technician, date: string, label: string) => {
    const msg = generateWhatsAppReminderMessage(tech, date, label);
    const fullPhone = getFullPhoneNumber(tech);
    const url = fullPhone
      ? `https://wa.me/55${fullPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
    setSentMap(prev => ({ ...prev, [`${tech.id}-${date}`]: true }));
  };

  const handleSendAll = () => {
    impendingOffs.forEach(item => {
      const msg = generateWhatsAppReminderMessage(item.technician, item.date, item.shiftLabel);
      const fullPhone = getFullPhoneNumber(item.technician);
      if (fullPhone) {
        window.open(`https://wa.me/55${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    });
    const updated: Record<string, boolean> = {};
    impendingOffs.forEach(item => {
      updated[`${item.technician.id}-${item.date}`] = true;
    });
    setSentMap(prev => ({ ...prev, ...updated }));
  };

  return (
    <div className={`mb-6 p-5 rounded-2xl border transition-all shadow-md ${
      darkMode
        ? 'bg-slate-900/90 border-emerald-950 text-slate-100 shadow-emerald-950/20'
        : 'bg-white border-emerald-100 text-slate-800 shadow-emerald-100/40'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Notificações WhatsApp (24h Antes da Folga)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                Push Automatizado
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Envie lembretes automáticos via WhatsApp para os técnicos que folgam na data selecionada.
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Data Alvo:</span>
          </div>
          <select
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold text-slate-800 dark:text-slate-100"
          >
            {dates.map(d => (
              <option key={d} value={d}>
                {formatDisplayDate(d)} ({d})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Body */}
      {impendingOffs.length === 0 ? (
        <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Nenhum colaborador possui folga programada para a data <span className="font-bold">{formatDisplayDate(selectedDate)}</span>.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {impendingOffs.length} colaborador(es) de folga em {formatDisplayDate(selectedDate)}:
            </span>
            <button
              onClick={handleSendAll}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar para Todos ({impendingOffs.length})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {impendingOffs.map(item => {
              const key = `${item.technician.id}-${item.date}`;
              const isSent = sentMap[key];

              return (
                <div
                  key={key}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                    isSent
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate max-w-[160px]" title={item.technician.name}>
                          {item.technician.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                          DDD {item.technician.ddd} {item.technician.phone ? `• ${item.technician.phone}` : ''}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {item.shiftLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      {item.technician.phone || 'Sem telefone'}
                    </span>

                    <button
                      onClick={() => handleSendWhatsApp(item.technician, item.date, item.shiftLabel)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                        isSent
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isSent ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                          <span>Enviado</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Enviar WhatsApp</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
