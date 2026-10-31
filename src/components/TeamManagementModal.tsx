import React, { useState } from 'react';
import { Technician, DDDNumber } from '../types';
import { INITIAL_TECHNICIANS, DDD_INFO } from '../data/defaultTechnicians';
import { Users, Plus, Trash2, Edit3, Check, X, RotateCcw, KeyRound } from 'lucide-react';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicians: Technician[];
  onUpdateTechnicians: (techs: Technician[]) => void;
  onResetUserPin?: (techId: string) => void;
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  isOpen,
  onClose,
  technicians,
  onUpdateTechnicians,
  onResetUserPin
}) => {
  const [filterDDD, setFilterDDD] = useState<string>('all');
  const [newName, setNewName] = useState<string>('');
  const [newDDD, setNewDDD] = useState<DDDNumber>(13);
  const [newPhone, setNewPhone] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDDD, setEditDDD] = useState<DDDNumber>(13);
  const [editPhone, setEditPhone] = useState<string>('');

  if (!isOpen) return null;

  const handleAddTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newTech: Technician = {
      id: `tech-${newDDD}-${Date.now()}`,
      name: newName.trim().toUpperCase(),
      ddd: newDDD,
      active: true,
      phone: newPhone.trim() || undefined
    };

    onUpdateTechnicians([...technicians, newTech]);
    setNewName('');
    setNewPhone('');
  };

  const handleStartEdit = (t: Technician) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditDDD(t.ddd);
    setEditPhone(t.phone || '');
  };

  const handleSaveEdit = (id: string) => {
    onUpdateTechnicians(
      technicians.map(t =>
        t.id === id
          ? { ...t, name: editName.trim().toUpperCase(), ddd: editDDD, phone: editPhone.trim() || undefined }
          : t
      )
    );
    setEditingId(null);
  };

  const handleRemoveTech = (id: string) => {
    if (confirm('Deseja realmente remover este técnico da escala?')) {
      onUpdateTechnicians(technicians.filter(t => t.id !== id));
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Deseja restaurar a equipe inicial completa com os DDDs 13, 14, 15 e 19?')) {
      onUpdateTechnicians([...INITIAL_TECHNICIANS]);
    }
  };

  const filteredTechs = filterDDD === 'all'
    ? technicians
    : technicians.filter(t => t.ddd === Number(filterDDD));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">
              Gerenciar Equipe Técnica ({technicians.length} integrantes)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Add form (4 cols) */}
          <div className="md:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" />
              Adicionar Novo Técnico
            </h3>

            <form onSubmit={handleAddTech} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome Completo:</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: JOÃO DA SILVA"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Região DDD:</label>
                <select
                  value={newDDD}
                  onChange={e => setNewDDD(Number(e.target.value) as DDDNumber)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                >
                  <option value={13}>DDD 13 (Baixada Santista)</option>
                  <option value={14}>DDD 14 (Centro-Oeste / Bauru)</option>
                  <option value={15}>DDD 15 (Sorocaba / Itapetininga)</option>
                  <option value={19}>DDD 19 (Campinas / Região)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Telefone / WhatsApp (Opcional):</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="Ex: (13) 99123-4567"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Técnico
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Lista Padrão
              </button>
            </div>
          </div>

          {/* List of technicians (8 cols) */}
          <div className="md:col-span-8 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Integrantes por DDD
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilterDDD('all')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-md ${
                    filterDDD === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Todos ({technicians.length})
                </button>
                {[13, 14, 15, 19].map(d => (
                  <button
                    key={d}
                    onClick={() => setFilterDDD(String(d))}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md ${
                      filterDDD === String(d) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    DDD {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {filteredTechs.map(tech => {
                const isEditing = editingId === tech.id;
                const dddConf = DDD_INFO[tech.ddd];

                if (isEditing) {
                  return (
                    <div key={tech.id} className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 text-xs bg-white border border-slate-300 rounded px-2 py-1 font-semibold"
                      />
                      <select
                        value={editDDD}
                        onChange={e => setEditDDD(Number(e.target.value) as DDDNumber)}
                        className="text-xs bg-white border border-slate-300 rounded px-2 py-1"
                      >
                        <option value={13}>DDD 13</option>
                        <option value={14}>DDD 14</option>
                        <option value={15}>DDD 15</option>
                        <option value={19}>DDD 19</option>
                      </select>
                      <button
                        onClick={() => handleSaveEdit(tech.id)}
                        className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={tech.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${dddConf?.badge || 'bg-slate-100'}`}>
                        DDD {tech.ddd}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-800 text-xs block">
                          {tech.name}
                        </span>
                        {tech.phone && (
                          <span className="text-[11px] text-slate-500">{tech.phone}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {onResetUserPin && (
                        <button
                          onClick={() => {
                            if (confirm(`Resetar senha de ${tech.name} para o padrão '1234'?`)) {
                              onResetUserPin(tech.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-md hover:bg-amber-50 transition-colors"
                          title="Resetar senha para 1234"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleStartEdit(tech)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveTech(tech.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
