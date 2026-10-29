import React, { useState } from 'react';
import { GeneratorOptions, SchedulePeriod } from '../types';
import { MONTHS_PT } from '../utils/dateUtils';
import { Sparkles, Calendar, Settings, ShieldCheck, X, Check, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: GeneratorOptions, periodConfig: { startYear: number; startMonth: number }) => void;
  currentPeriod: SchedulePeriod;
  isGenerating?: boolean;
}

export const GeneratorModal: React.FC<GeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  currentPeriod,
  isGenerating = false
}) => {
  const [startMonth, setStartMonth] = useState<number>(currentPeriod.startMonth);
  const [startYear, setStartYear] = useState<number>(currentPeriod.startYear);
  const [ensureDoubleWeekend, setEnsureDoubleWeekend] = useState<boolean>(true);
  const [targetDoubleWeekends, setTargetDoubleWeekends] = useState<number>(1);
  const [targetInversions, setTargetInversions] = useState<number>(2);
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState<number>(6);
  const [prioritizeRequests, setPrioritizeRequests] = useState<boolean>(true);
  const [balanceDDD, setBalanceDDD] = useState<boolean>(true);

  if (!isOpen) return null;

  const nextMonth = (startMonth + 1) % 12;
  const nextYear = startMonth === 11 ? startYear + 1 : startYear;

  const handleRunGenerator = () => {
    const options: GeneratorOptions = {
      ensureDoubleWeekend,
      targetDoubleWeekendsPerTech: targetDoubleWeekends,
      targetInversionsPerTech: targetInversions,
      maxConsecutiveWorkDays: maxConsecutiveDays,
      prioritizeOffRequests: prioritizeRequests,
      balanceDDDCoverage: balanceDDD,
      randomSeed: Date.now()
    };

    onGenerate(options, { startYear, startMonth });

    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (e) {
      // safe fallback
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Gerador Automático de Escala 6x1
              </h2>
              <p className="text-xs text-indigo-100">
                Distribuição matemática inteligente com folgas dupladas e limite de 6 dias
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          {/* Period Selector */}
          <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
            <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Período Bimestral da Escala (2 Meses)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Mês Inicial:</label>
                <select
                  value={startMonth}
                  onChange={e => setStartMonth(Number(e.target.value))}
                  className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {MONTHS_PT.map((m, idx) => (
                    <option key={idx} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Ano:</label>
                <select
                  value={startYear}
                  onChange={e => setStartYear(Number(e.target.value))}
                  className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>
            </div>

            <div className="mt-2.5 text-xs text-indigo-700 bg-white/70 p-2 rounded-lg border border-indigo-100 flex items-center gap-1.5">
              <span>📅 Período coberto:</span>
              <strong className="text-indigo-900 font-semibold">
                {MONTHS_PT[startMonth]} e {MONTHS_PT[nextMonth]} de {startYear === nextYear ? startYear : `${startYear}/${nextYear}`}
              </strong>
            </div>
          </div>

          {/* Rules and Constraints */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" />
              Regras e Parâmetros Solicitados
            </h3>

            {/* Double weekend toggle */}
            <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="dw-check"
                checked={ensureDoubleWeekend}
                onChange={e => setEnsureDoubleWeekend(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <label htmlFor="dw-check" className="font-semibold text-slate-900 text-sm cursor-pointer block">
                  Garantir Final de Semana Duplado (Sábado e Domingo Livres)
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cada técnico recebe ao menos um fim de semana completo com Sábado e Domingo de folga casados.
                </p>
                {ensureDoubleWeekend && (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-slate-700 font-medium">Quantidade por técnico no bimestre:</span>
                    <select
                      value={targetDoubleWeekends}
                      onChange={e => setTargetDoubleWeekends(Number(e.target.value))}
                      className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 font-semibold text-indigo-700"
                    >
                      <option value={1}>1 Fim de Semana Duplado (Mínimo)</option>
                      <option value={2}>2 Finais de Semana Duplados</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Inversions */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 text-sm block">
                    Inversões de Escala no Período (~2 inversões)
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gera a virada de turnos (trabalha sábado/folga domingo para folga sábado/trabalha domingo com folga compensatória no meio da semana).
                  </p>
                </div>
                <select
                  value={targetInversions}
                  onChange={e => setTargetInversions(Number(e.target.value))}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
                >
                  <option value={1}>1 Inversão</option>
                  <option value={2}>2 Inversões (Recomendado)</option>
                  <option value={3}>3 Inversões</option>
                </select>
              </div>
            </div>

            {/* Max consecutive days */}
            <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-900 text-sm block">
                  Limite Legal Rigoroso: Máximo 6 Dias Consecutivos (CLT 6x1)
                </span>
                <p className="text-xs text-emerald-700 mt-0.5">
                  O algoritmo proíbe estritamente 7 dias seguidos de trabalho. Ao inverter escalas, insere folga automática no meio da semana de forma escalonada entre os técnicos.
                </p>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prioritizeRequests}
                  onChange={e => setPrioritizeRequests(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                />
                <span>Priorizar Pedidos de Folga (Casamento, etc.)</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={balanceDDD}
                  onChange={e => setBalanceDDD(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                />
                <span>Distribuir Folgas por Região (Evitar 4+ no mesmo DDD)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleRunGenerator}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Gerando Escala...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                Gerar Escala Otimizada
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
