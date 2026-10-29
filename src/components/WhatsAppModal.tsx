import React, { useState } from 'react';
import { Technician, TechnicianSchedule, SchedulePeriod, OffRequest } from '../types';
import { generateIndividualWhatsAppMessage, generateTeamGroupWhatsAppSummary } from '../utils/exportUtils';
import { MessageSquare, Copy, Check, Send, X, Users, User } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicians: Technician[];
  schedules: Record<string, TechnicianSchedule>;
  dates: string[];
  period: SchedulePeriod;
  offRequests: OffRequest[];
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  technicians,
  schedules,
  dates,
  period,
  offRequests
}) => {
  const activeTechs = technicians.filter(t => t.active);
  const [tab, setTab] = useState<'individual' | 'group'>('individual');
  const [selectedTechId, setSelectedTechId] = useState<string>(activeTechs[0]?.id || '');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentTech = technicians.find(t => t.id === selectedTechId) || activeTechs[0];
  const currentSched = currentTech ? schedules[currentTech.id] : null;

  const messageText = tab === 'group'
    ? generateTeamGroupWhatsAppSummary(technicians, schedules, dates, period)
    : (currentTech && currentSched ? generateIndividualWhatsAppMessage(currentTech, currentSched, dates, period, offRequests) : '');

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    let cleanPhone = '';
    if (tab === 'individual' && currentTech?.phone) {
      cleanPhone = currentTech.phone.replace(/\D/g, '');
    }
    const url = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-emerald-200" />
            <h2 className="text-lg font-bold">Enviar Escala via WhatsApp</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50">
          <button
            onClick={() => setTab('individual')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              tab === 'individual'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            Mensagem Individual do Técnico
          </button>

          <button
            onClick={() => setTab('group')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              tab === 'group'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Resumo Geral do Grupo da Equipe
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {tab === 'individual' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selecione o Técnico:
              </label>
              <select
                value={selectedTechId}
                onChange={e => setSelectedTechId(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
              >
                {activeTechs.map(t => (
                  <option key={t.id} value={t.id}>
                    [DDD {t.ddd}] {t.name} {t.phone ? `• ${t.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Message Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Pré-visualização da Mensagem formatada:
              </span>
              <span className="text-[11px] text-slate-400">
                Pronta para envio
              </span>
            </div>

            <textarea
              readOnly
              value={messageText}
              rows={12}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-mono text-slate-800 focus:outline-hidden resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-medium"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Abrir no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
