import React, { useState, useEffect } from 'react';
import { Technician, TechnicianSchedule, SchedulePeriod, OffRequest, ShiftType, AppUser } from '../types';
import { formatDisplayDate, formatFullDate, parseDateKey, isSaturday, isSunday, extractWeekends, MONTHS_PT } from '../utils/dateUtils';
import { AuditResult } from '../utils/validator';
import { generateIndividualWhatsAppMessage } from '../utils/exportUtils';
import { DDD_INFO } from '../data/defaultTechnicians';
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
  Sparkles,
  ShieldCheck,
  Briefcase,
  Lock
} from 'lucide-react';

interface TechnicianViewProps {
  technicians: Technician[];
  schedules: Record<string, TechnicianSchedule>;
  dates: string[];
  period: SchedulePeriod;
  auditResult: AuditResult;
  offRequests: OffRequest[];
  currentUser: AppUser | null;
  onAddRequest: (req: Omit<OffRequest, 'id' | 'createdAt' | 'status'>) => void;
  onUpdateShift: (techId: string, date: string, shift: ShiftType) => void;
  onOpenRequestsModal?: (techId: string) => void;
}

export const TechnicianView: React.FC<TechnicianViewProps> = ({
  technicians,
  schedules,
  dates,
  period,
  auditResult,
  offRequests,
  currentUser,
  onAddRequest,
  onUpdateShift,
  onOpenRequestsModal
}) => {
  const activeTechs = technicians.filter(t => t.active);
  const isAdmin = currentUser?.role === 'admin';

  // If user is technician, lock to their own ID strictly!
  const initialTechId = !isAdmin && currentUser?.technicianId
    ? currentUser.technicianId
    : activeTechs[0]?.id || '';

  const [selectedTechId, setSelectedTechId] = useState<string>(initialTechId);
  const [copied, setCopied] = useState<boolean>(false);

  // Keep synced if user switches
  useEffect(() => {
    if (!isAdmin && currentUser?.technicianId) {
      setSelectedTechId(currentUser.technicianId);
    }
  }, [currentUser, isAdmin]);

  // Quick request form states
  const [reqDate, setReqDate] = useState<string>(dates[0] || '');
  const [reqCategory, setReqCategory] = useState<'casamento' | 'medico' | 'aniversario' | 'pessoal' | 'outro'>('casamento');
  const [reqNote, setReqNote] = useState<string>('');

  const currentTech = technicians.find(t => t.id === selectedTechId) || activeTechs[0];
  const currentSched = currentTech ? schedules[currentTech.id] : null;
  const currentStats = currentTech ? auditResult.techStats[currentTech.id] : null;
  const techRequests = currentTech ? offRequests.filter(r => r.technicianId === currentTech.id) : [];
  const weekends = extractWeekends(dates);

  if (!currentTech || !currentSched) {
    return <div className="p-8 text-center text-slate-500">Nenhum técnico disponível.</div>;
  }

  // Find their double weekends (strictly Sáb + Dom)
  const doubleWeekends = weekends.filter(wk => {
    const sat = currentSched.days[wk.saturday]?.shift;
    const sun = currentSched.days[wk.sunday]?.shift;
    return (sat === 'FD' || sat === 'FG' || sat === 'F') && (sun === 'FD' || sun === 'FG' || sun === 'F');
  });

  const handleCopyWhatsApp = () => {
    const text = generateIndividualWhatsAppMessage(currentTech, currentSched, dates, period, offRequests);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const text = generateIndividualWhatsAppMessage(currentTech, currentSched, dates, period, offRequests);
    const cleanPhone = currentTech.phone ? currentTech.phone.replace(/\D/g, '') : '';
    const url = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleQuickAddRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDate) return;
    onAddRequest({
      technicianId: currentTech.id,
      date: reqDate,
      reasonCategory: reqCategory,
      priority: 'alta',
      notes: reqNote.trim() ? [reqNote.trim()] : ['Compromisso pessoal agendado']
    });
    setReqNote('');
  };

  return (
    <div className="space-y-6">
      {/* Top Profile / Selector Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
            <User className="w-6 h-6" />
          </div>

          <div>
            {isAdmin ? (
              <>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Selecione o Técnico para Visualização Individual:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedTechId}
                    onChange={e => setSelectedTechId(e.target.value)}
                    className="text-base font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 min-w-[280px]"
                  >
                    {[...activeTechs]
                      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Turno: {currentTech.shiftHours || '08:00 AS 16:20'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Seu Painel Individual Privativo
                  </span>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    DDD {currentTech.ddd}
                  </span>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-500" />
                    {currentTech.shiftHours || '08:00 AS 16:20'}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-1">
                  {currentTech.name}
                </h2>
                <p className="text-xs text-slate-500">
                  {DDD_INFO[currentTech.ddd]?.region} • Escala 6x1 Pessoal
                </p>
              </>
            )}
          </div>
        </div>

        {/* WhatsApp Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyWhatsApp}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copiar para WhatsApp</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenWhatsApp}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Double Weekend Card */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-100 uppercase tracking-wider">
              Fim de Semana Duplado
            </span>
            <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold">
              {doubleWeekends.length} {doubleWeekends.length === 1 ? 'Garantido' : 'Garantidos'}
            </div>
            <p className="text-xs text-purple-100 mt-1">
              {doubleWeekends.length > 0
                ? `${doubleWeekends.map(w => w.label).join(' | ')}`
                : 'Ajuste em andamento com a supervisão'}
            </p>
          </div>
          <div className="text-[11px] bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-xs font-medium w-fit">
            Sábado + Domingo Livres
          </div>
        </div>

        {/* Total Offs */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Folgas</span>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-slate-800">
              {currentStats?.totalOffDays || 0} dias
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Sendo {currentStats?.weekendDaysOff || 0} dias em finais de semana
            </p>
          </div>
          <div className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg font-medium w-fit">
            Regime 6x1 regular
          </div>
        </div>

        {/* Consecutive Days Work Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Dias Seguidos Máx.</span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="my-3">
            <div className={`text-3xl font-extrabold ${
              (currentStats?.maxConsecutiveWorkDays || 0) > 6 ? 'text-rose-600' : 'text-emerald-700'
            }`}>
              {currentStats?.maxConsecutiveWorkDays || 0} dias
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {(currentStats?.maxConsecutiveWorkDays || 0) <= 6
                ? '✅ Conforme com o limite legal CLT'
                : '⚠️ Violação do limite de 6 dias'}
            </p>
          </div>
          <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium w-fit">
            Máximo 6 dias de trabalho seguidos
          </div>
        </div>

        {/* Inversions Count */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Inversões de Escala</span>
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-indigo-700">
              {currentStats?.inversionsCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Folga compensatória de segunda a quinta
            </p>
          </div>
          <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg font-medium w-fit">
            Meta bimestral: ~2 inversões
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar View + Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Grid (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Calendário da Escala - {currentTech.name}
              </h3>
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? 'Clique em qualquer dia para alterar o status.'
                  : 'Suas folgas programadas e dias de trabalho para o bimestre.'}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${DDD_INFO[currentTech.ddd]?.badge}`}>
              DDD {currentTech.ddd}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {dates.map(d => {
              const day = currentSched.days[d];
              const rawShift = day?.shift || 'TB';
              const shift = rawShift === 'T' ? 'TB' : rawShift === 'F' ? 'FG' : rawShift;
              const isSat = isSaturday(d);
              const isSun = isSunday(d);
              const dObj = parseDateKey(d);
              const dayNum = dObj.getDate();
              const req = techRequests.find(r => r.date === d);

              let cardStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300';
              let badgeColor = 'bg-slate-200 text-slate-800';
              let shiftTitle = 'Trabalho';

              if (shift === 'FD') {
                cardStyle = 'bg-orange-50 border-orange-300 text-orange-950 shadow-xs ring-1 ring-orange-300';
                badgeColor = 'bg-orange-300 text-orange-950 font-black';
                shiftTitle = 'Folga Dupla';
              } else if (shift === 'FG') {
                cardStyle = 'bg-yellow-50 border-yellow-300 text-yellow-950 shadow-xs';
                badgeColor = 'bg-yellow-200 text-yellow-950 font-bold';
                shiftTitle = 'Folga Regular';
              } else if (shift === 'FC') {
                cardStyle = 'bg-indigo-50 border-indigo-200 text-indigo-950';
                badgeColor = 'bg-indigo-100 text-indigo-900 font-bold';
                shiftTitle = 'Compensada';
              } else if (shift === 'TB') {
                cardStyle = 'bg-white border-slate-200 text-slate-800 hover:bg-emerald-50/30';
                badgeColor = 'bg-emerald-100 text-emerald-900 font-semibold';
                shiftTitle = 'Trabalho';
              } else if (shift === 'FN') {
                cardStyle = 'bg-sky-50 border-sky-200 text-sky-950';
                badgeColor = 'bg-sky-200 text-sky-950 font-bold';
                shiftTitle = 'Feriado';
              }

              return (
                <div
                  key={d}
                  onClick={() => {
                    if (isAdmin) {
                      const next = shift === 'TB' ? 'FG' : shift === 'FG' ? 'FD' : shift === 'FD' ? 'FC' : 'TB';
                      onUpdateShift(currentTech.id, d, next as ShiftType);
                    } else {
                      // Technician clicks: set as date for request
                      setReqDate(d);
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[85px] relative ${cardStyle}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isSun ? 'text-amber-700' : isSat ? 'text-rose-600' : 'text-slate-500'}`}>
                      {isSun ? 'Dom' : isSat ? 'Sáb' : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'][dObj.getDay() - 1]}
                    </span>
                    <span className="text-base font-extrabold text-slate-900">{dayNum}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${badgeColor}`}>
                      {shift}
                    </span>

                    <span className="text-[10px] font-semibold text-slate-600">
                      {shiftTitle}
                    </span>

                    {shift === 'FD' && <Star className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />}
                  </div>

                  {req && (
                    <div
                      className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-white ${
                        req.status === 'atendido' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                      }`}
                      title={req.status === 'atendido' ? `Folga Concedida: ${req.notes.join(', ')}` : `Folga em Análise: ${req.notes.join(', ')}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Quick Add Off Request & Registered Requests (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Request Box */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Solicitar Folga (Compromisso / Casamento)
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Informe a data e adicione observações para avaliação pelo gestor.
            </p>

            <form onSubmit={handleQuickAddRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Data Desejada:</label>
                <select
                  value={reqDate}
                  onChange={e => setReqDate(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                >
                  {dates.map(d => (
                    <option key={d} value={d}>
                      {formatDisplayDate(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Motivo:</label>
                <select
                  value={reqCategory}
                  onChange={e => setReqCategory(e.target.value as any)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                >
                  <option value="casamento">Casamento</option>
                  <option value="medico">Consulta Médica</option>
                  <option value="aniversario">Aniversário</option>
                  <option value="pessoal">Pessoal / Família</option>
                  <option value="outro">Outro Compromisso</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Observações do compromisso:</label>
                <input
                  type="text"
                  value={reqNote}
                  onChange={e => setReqNote(e.target.value)}
                  placeholder="Ex: Casamento de familiar em Santos"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Pedido
              </button>
            </form>
          </div>

          {/* List of technician's requests */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span>Meus Pedidos Cadastrados</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                {techRequests.length}
              </span>
            </h4>

            {techRequests.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Nenhum pedido de folga registrado para este período.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {techRequests.map(r => {
                  const isApproved = r.status === 'atendido';
                  const isRejected = r.status === 'recusado';

                  return (
                    <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-900 mb-1">
                        <span>{formatDisplayDate(r.date)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {isApproved ? 'Folga Concedida' : isRejected ? 'Não Aprovado' : 'Folga em Análise'}
                        </span>
                      </div>
                      <div className="text-slate-600">
                        {r.notes.join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
