import React, { useState, useEffect } from 'react';
import { Technician, OffRequest, AppUser } from '../types';
import { formatDisplayDate } from '../utils/dateUtils';
import { X, Plus, Trash2, Calendar, CheckCircle2, Clock, Check, Ban } from 'lucide-react';

interface OffRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicians: Technician[];
  dates: string[];
  requests: OffRequest[];
  currentUser?: AppUser | null;
  onAddRequest: (req: Omit<OffRequest, 'id' | 'createdAt' | 'status'>) => void;
  onDeleteRequest: (id: string) => void;
  onApproveRequest?: (id: string) => void;
  onRejectRequest?: (id: string) => void;
  schedules: Record<string, { days: Record<string, { shift: string }> }>;
}

export const OffRequestsModal: React.FC<OffRequestsModalProps> = ({
  isOpen,
  onClose,
  technicians,
  dates,
  requests,
  currentUser,
  onAddRequest,
  onDeleteRequest,
  onApproveRequest,
  onRejectRequest,
  schedules
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const myTechId = !isAdmin && currentUser?.technicianId ? currentUser.technicianId : technicians[0]?.id || '';

  const [selectedTechId, setSelectedTechId] = useState<string>(myTechId);
  const [selectedDate, setSelectedDate] = useState<string>(dates[0] || '');
  const [category, setCategory] = useState<'casamento' | 'medico' | 'aniversario' | 'pessoal' | 'outro'>('casamento');
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>('alta');
  const [observations, setObservations] = useState<string[]>(['']);
  const [filterTech, setFilterTech] = useState<string>(!isAdmin ? myTechId : 'all');

  useEffect(() => {
    if (!isAdmin && currentUser?.technicianId) {
      setSelectedTechId(currentUser.technicianId);
      setFilterTech(currentUser.technicianId);
    }
  }, [currentUser, isAdmin]);

  if (!isOpen) return null;

  const handleAddObsField = () => {
    setObservations([...observations, '']);
  };

  const handleUpdateObs = (index: number, val: string) => {
    const updated = [...observations];
    updated[index] = val;
    setObservations(updated);
  };

  const handleRemoveObsField = (index: number) => {
    if (observations.length > 1) {
      setObservations(observations.filter((_, i) => i !== index));
    } else {
      setObservations(['']);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanObs = observations.map(o => o.trim()).filter(Boolean);
    if (!selectedTechId || !selectedDate) return;

    onAddRequest({
      technicianId: selectedTechId,
      date: selectedDate,
      reasonCategory: category,
      priority,
      notes: cleanObs.length > 0 ? cleanObs : ['Solicitação de folga programada']
    });

    // Reset form
    setObservations(['']);
  };

  // Sort technicians alphabetically without DDD prefixes
  const sortedTechs = [...technicians]
    .filter(t => t.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const filteredRequests = filterTech === 'all'
    ? requests
    : requests.filter(r => r.technicianId === filterTech);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-600" />
              Solicitações de Folga dos Técnicos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Toda solicitação permanece <strong>Em Análise</strong> até que o administrador aprove individualmente.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Form to add request (5 cols) */}
          <div className="md:col-span-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Nova Solicitação de Folga
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Técnico Solicitante:
                </label>
                {isAdmin ? (
                  <select
                    value={selectedTechId}
                    onChange={e => setSelectedTechId(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    {sortedTechs.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-900">
                    {technicians.find(t => t.id === myTechId)?.name}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Data Desejada:
                </label>
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {dates.map(d => (
                    <option key={d} value={d}>
                      {formatDisplayDate(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Motivo Principal:
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="casamento">Casamento</option>
                  <option value="medico">Consulta / Procedimento Médico</option>
                  <option value="aniversario">Aniversário / Celebração</option>
                  <option value="pessoal">Compromisso Pessoal</option>
                  <option value="outro">Outro Motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Prioridade:
                </label>
                <div className="flex gap-2">
                  {(['alta', 'media', 'baixa'] as const).map(p => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer capitalize transition-all ${
                        priority === p
                          ? p === 'alta'
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : p === 'media'
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'bg-slate-100 border-slate-300 text-slate-700'
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">
                    Observações do Pedido:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddObsField}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    + Adicionar Observação
                  </button>
                </div>
                <div className="space-y-2">
                  {observations.map((obs, idx) => (
                    <div key={idx} className="flex gap-1.5">
                      <input
                        type="text"
                        value={obs}
                        onChange={e => handleUpdateObs(idx, e.target.value)}
                        placeholder={`Observação ${idx + 1}...`}
                        className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800"
                        required={idx === 0}
                      />
                      {observations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveObsField(idx)}
                          className="px-2 text-rose-500 hover:text-rose-700"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Solicitação (Em Análise)
              </button>
            </form>
          </div>

          {/* List of existing requests (7 cols) */}
          <div className="md:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">
                Solicitações Registradas ({filteredRequests.length})
              </h3>

              {isAdmin && (
                <select
                  value={filterTech}
                  onChange={e => setFilterTech(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700"
                >
                  <option value="all">Todos os técnicos (Ordem Alfabética)</option>
                  {sortedTechs.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {filteredRequests.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                <Calendar className="w-12 h-12 mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Nenhuma solicitação cadastrada</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Os colaboradores podem registrar pedidos que ficam aguardando a aprovação do administrador.
                </p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {filteredRequests.map(req => {
                  const tech = technicians.find(t => t.id === req.technicianId);
                  const isApproved = req.status === 'atendido';
                  const isRejected = req.status === 'recusado';
                  const isPending = !isApproved && !isRejected;

                  return (
                    <div
                      key={req.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-indigo-300 transition-all flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            {tech?.name || 'Técnico'}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {req.reasonCategory}
                          </span>
                          {req.priority === 'alta' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                              ALTA PRIORIDADE
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-semibold text-slate-700 mt-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          Data Desejada: <strong className="text-indigo-950">{formatDisplayDate(req.date)}</strong>
                        </div>

                        {/* Notes */}
                        <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                          {req.notes.map((n, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className="text-indigo-500 font-bold">•</span>
                              <span>{n}</span>
                            </div>
                          ))}
                        </div>

                        {/* Status Indicator & Admin Action Buttons */}
                        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                Folga Concedida (Aprovada pelo Administrador)
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300">
                                <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                                Solicitação em Análise (Aguardando Aprovação)
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-md border border-rose-300">
                                <Ban className="w-3.5 h-3.5 text-rose-700" />
                                Solicitação Recusada
                              </span>
                            )}
                          </div>

                          {/* Admin Approval Actions */}
                          {isAdmin && isPending && (
                            <div className="flex items-center gap-1.5">
                              {onApproveRequest && (
                                <button
                                  type="button"
                                  onClick={() => onApproveRequest(req.id)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Aprovar Folga
                                </button>
                              )}
                              {onRejectRequest && (
                                <button
                                  type="button"
                                  onClick={() => onRejectRequest(req.id)}
                                  className="px-2.5 py-1 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                                >
                                  Recusar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteRequest(req.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remover solicitação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Total de pedidos: <span className="font-semibold text-slate-700">{requests.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
          >
            Concluir & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
