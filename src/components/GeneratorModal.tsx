import React, { useState } from 'react';
import { GeneratorOptions, SchedulePeriod } from '../types';
import { MONTHS_PT } from '../utils/dateUtils';
import { MASTER_PATTERN_5X2, resolvePatternKey, getNextMonthInfo } from '../utils/masterPattern5x2';
import { Sparkles, Calendar, Settings, ShieldCheck, X, Check, RefreshCw, ArrowRight, Eye } from 'lucide-react';
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
  const [regime, setRegime] = useState<'6x1' | '5x2'>(currentPeriod.regime || '6x1');
  const [ensureDoubleWeekend, setEnsureDoubleWeekend] = useState<boolean>(true);
  const [targetDoubleWeekends, setTargetDoubleWeekends] = useState<number>(1);
  const [targetInversions, setTargetInversions] = useState<number>(2);
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState<number>(regime === '5x2' ? 5 : maxConsecutiveDaysInit(regime));
  const [prioritizeRequests, setPrioritizeRequests] = useState<boolean>(true);
  const [balanceDDD, setBalanceDDD] = useState<boolean>(true);

  function maxConsecutiveDaysInit(r: string) {
    return r === '5x2' ? 5 : 6;
  }

  // Regras específicas da Nova Escala 5x2 SPI (Padrão Mestre 2 Meses Corridos)
  const [teamWeekendPercent5x2, setTeamWeekendPercent5x2] = useState<number>(50);
  const [consecutiveWeekendsCount5x2, setConsecutiveWeekendsCount5x2] = useState<number>(2);
  const [midweekSplitRule5x2, setMidweekSplitRule5x2] = useState<'ter_qui_qua_sex'>('ter_qui_qua_sex');
  const [midweekGroupBCount5x2, setMidweekGroupBCount5x2] = useState<number>(5);
  const [midweekGroupCCount5x2, setMidweekGroupCCount5x2] = useState<number>(5);
  const [monthType5x2, setMonthType5x2] = useState<'auto' | 'tipo_1' | 'tipo_2'>('auto');
  const [cycleMonth5x2, setCycleMonth5x2] = useState<'mes_1' | 'mes_2' | 'transicao_fev' | 'auto'>('auto');
  const [generateNextMonthPreview, setGenerateNextMonthPreview] = useState<boolean>(true);
  const [previewTab, setPreviewTab] = useState<'dezembro' | 'janeiro' | 'transicaoFev' | 'novembro'>('dezembro');

  // Next month info and pattern keys (safe computed values)
  const nextInfo = getNextMonthInfo(startYear, startMonth);
  const currentPatternKey = resolvePatternKey(startMonth + 1);
  const nextPatternKey = resolvePatternKey(nextInfo.monthNum);

  // Dynamic midweek percent calculation: (100 - weekend%) / 2
  const remainingPercent = 100 - teamWeekendPercent5x2;
  const halfMidweek = remainingPercent / 2;
  const midweekPct = halfMidweek % 1 === 0 ? `${halfMidweek}%` : `${halfMidweek.toFixed(1)}%`;

  // Early return ONLY AFTER ALL HOOKS HAVE BEEN CALLED
  if (!isOpen) return null;

  const handleRunGenerator = () => {
    const options: GeneratorOptions = {
      regime,
      ensureDoubleWeekend,
      targetDoubleWeekendsPerTech: targetDoubleWeekends,
      targetInversionsPerTech: targetInversions,
      maxConsecutiveWorkDays: regime === '5x2' ? 5 : maxConsecutiveDays,
      prioritizeOffRequests: prioritizeRequests,
      balanceDDDCoverage: balanceDDD,
      randomSeed: Date.now(),

      // Parâmetros 5x2 SPI
      teamWeekendPercent5x2,
      consecutiveWeekendsCount5x2,
      midweekSplitRule5x2,
      midweekGroupBCount5x2,
      midweekGroupCCount5x2,
      monthType5x2,
      cycleMonth5x2,
      generateNextMonthPreview
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl xl:max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-blue-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Gerador Automático de Escala SPI
              </h2>
              <p className="text-xs text-indigo-100">
                Distribuição matemática inteligente com regimes 6x1 (CLT) e 5x2 (Rodízio Quinzenal SPI)
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

        {/* Form Body - Horizontal Layout (Two Columns on Desktop) */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* Left Column: Controles e Configurações */}
            <div className="space-y-4">
              {/* Period Selector - 1 Mês por Vez */}
              <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Mês da Escala a Ser Gerada (1 Mês por vez)
                  </label>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                    1 Mês Individual
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mês Selecionado:</label>
                    <select
                      value={startMonth}
                      onChange={e => setStartMonth(Number(e.target.value))}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    >
                      {MONTHS_PT.map((m, idx) => (
                        <option key={idx} value={idx}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ano:</label>
                    <select
                      value={startYear}
                      onChange={e => setStartYear(Number(e.target.value))}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    >
                      <option value={2026}>2026</option>
                      <option value={2027}>2027</option>
                      <option value={2028}>2028</option>
                    </select>
                  </div>
                </div>

                <div className="mt-2.5 text-[11px] text-indigo-900 bg-white/90 p-2.5 rounded-lg border border-indigo-100 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span>📅 Mês a ser gerado:</span>
                    <strong className="text-indigo-600">
                      {MONTHS_PT[startMonth]} de {startYear} ({new Date(startYear, startMonth + 1, 0).getDate()} dias)
                    </strong>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    💡 <strong>Geração cumulativa:</strong> Os outros meses gerados anteriormente serão preservados. Você pode gerar mês a mês e depois filtrar na matriz de escala.
                  </p>
                </div>
              </div>

              {/* Regime Selector: 6x1 vs 5x2 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Regime de Trabalho e Folgas:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRegime('6x1');
                      setMaxConsecutiveDays(6);
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      regime === '6x1'
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">Escala 6x1</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        regime === '6x1' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {regime === '6x1' ? 'Ativo' : '6x1'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      6 trab. / 1 folga semanal CLT com garantia de FDS duplado.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRegime('5x2');
                      setMaxConsecutiveDays(5);
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      regime === '5x2'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">Escala 5x2</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        regime === '5x2' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {regime === '5x2' ? 'Selecionado' : '5x2'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Escala 5x2 SPI: Rodízio quinzenal de 4 semanas com alternância entre folgas no final de semana e folgas no meio de semana.
                    </p>
                  </button>
                </div>
              </div>

              {/* Rules & Parameters Form */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  {regime === '5x2' ? 'PARÂMETROS E REGRAS DA ESCALA 5X2 SPI' : 'Regras da Escala 6x1 CLT'}
                </h3>

                {regime === '5x2' ? (
                  /* 5x2 Configuration matching User Screenshots */
                  <div className="space-y-3">
                    {/* % da equipe nos finais de semana */}
                    <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-300 shadow-2xs">
                      <label className="block text-xs font-bold text-emerald-950 mb-0.5">
                        % da equipe nos finais de semana:
                      </label>
                      <p className="text-[11px] text-emerald-700 mb-1.5">
                        Folga fixa de Sábado e Domingo.
                      </p>
                      <select
                        value={teamWeekendPercent5x2}
                        onChange={e => setTeamWeekendPercent5x2(Number(e.target.value))}
                        className="w-full text-xs bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      >
                        <option value={50}>50%</option>
                        <option value={40}>40%</option>
                        <option value={60}>60%</option>
                        <option value={33.3}>33,3% (~1/3 da Equipe)</option>
                      </select>
                    </div>

                    {/* Finais de semana seguidos de folga */}
                    <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-300 shadow-2xs">
                      <label className="block text-xs font-bold text-blue-950 mb-0.5">
                        Finais de semana seguidos de folga:
                      </label>
                      <p className="text-[11px] text-blue-700 mb-1.5">
                        Duração de cada ciclo consecutivo antes da rotação.
                      </p>
                      <select
                        value={consecutiveWeekendsCount5x2}
                        onChange={e => setConsecutiveWeekendsCount5x2(Number(e.target.value))}
                        className="w-full text-xs bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      >
                        <option value={2}>2 Finais de semana seguidos (Rodízio Quinzenal)</option>
                        <option value={1}>1 Fim de semana seguido (Alternado)</option>
                        <option value={3}>3 Finais de semana seguidos</option>
                      </select>
                    </div>

                    {/* % de folgas no meio da semana (atualiza dinamicamente com base no final de semana) */}
                    <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-300 shadow-2xs">
                      <label className="block text-xs font-bold text-purple-950 mb-0.5">
                        % de folgas no meio da semana:
                      </label>
                      <p className="text-[11px] text-purple-700 mb-1.5">
                        Divisão equilibrada entre Terça/Quinta e Quarta/Sexta ({((100 - teamWeekendPercent5x2)).toFixed(teamWeekendPercent5x2 % 1 === 0 ? 0 : 1)}% restante da equipe).
                      </p>
                      <select
                        value={teamWeekendPercent5x2}
                        onChange={e => setTeamWeekendPercent5x2(Number(e.target.value))}
                        className="w-full text-xs bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 font-bold text-purple-900 focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      >
                        <option value={teamWeekendPercent5x2}>
                          {midweekPct} e {midweekPct} (Ter/Qui e Qua/Sex)
                        </option>
                        <option value={50}>25% e 25% (Ter/Qui e Qua/Sex)</option>
                        <option value={40}>30% e 30% (Ter/Qui e Qua/Sex)</option>
                        <option value={60}>20% e 20% (Ter/Qui e Qua/Sex)</option>
                      </select>
                    </div>

                    {/* Estrutura do Modelo de Rodízio Quinzenal */}
                    <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 shadow-md">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          ESTRUTURA DO MODELO DE RODÍZIO QUINZENAL ({teamWeekendPercent5x2}% / {midweekPct} / {midweekPct})
                        </span>
                        <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                          SPI 5x2
                        </span>
                      </div>

                      {/* CICLO 1 */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                          <span>📅 CICLO 1 (Semanas 1 e 2 Consecutivas)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                          <div className="bg-slate-800/90 p-2 rounded-lg border border-slate-700">
                            <strong className="text-emerald-400 block font-bold">Grupo A ({teamWeekendPercent5x2}%)</strong>
                            <span className="text-slate-300 leading-snug">Folga fixa no <strong>Sábado e Domingo</strong> (Folga Dupla - FD)</span>
                          </div>
                          <div className="bg-slate-800/90 p-2 rounded-lg border border-slate-700">
                            <strong className="text-sky-400 block font-bold">Grupo B ({midweekPct})</strong>
                            <span className="text-slate-300 leading-snug">Folga fixa na <strong>Terça e Quinta-feira</strong> (FC)</span>
                          </div>
                          <div className="bg-slate-800/90 p-2 rounded-lg border border-slate-700">
                            <strong className="text-purple-400 block font-bold">Grupo C ({midweekPct})</strong>
                            <span className="text-slate-300 leading-snug">Folga fixa na <strong>Quarta e Sexta-feira</strong> (FC)</span>
                          </div>
                        </div>
                      </div>

                      {/* CICLO 2 - A INVERSÃO */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-800">
                        <div className="text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
                          <span>🔄 CICLO 2 - A INVERSÃO (Semanas 3 e 4 Consecutivas)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                          <div className="bg-slate-800/90 p-2 rounded-lg border border-slate-700">
                            <strong className="text-emerald-400 block font-bold">Novo FDS ({teamWeekendPercent5x2}%)</strong>
                            <span className="text-slate-300 leading-snug">Grupo B + C: Folga no <strong>Sábado e Domingo</strong> (FD)</span>
                          </div>
                          <div className="bg-slate-800/90 p-2 rounded-lg border border-slate-700">
                            <strong className="text-sky-400 block font-bold">Novo Meio 1 ({midweekPct})</strong>
                            <span className="text-slate-300 leading-snug">Folga na <strong>Terça e Quinta-feira</strong> (FC)</span>
                          </div>
                          <div className="bg-slate-800/90 p-2 rounded-lg border border-slate-700">
                            <strong className="text-purple-400 block font-bold">Novo Meio 2 ({midweekPct})</strong>
                            <span className="text-slate-300 leading-snug">Folga na <strong>Quarta e Sexta-feira</strong> (FC)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 6x1 Selectors */
                  <div className="space-y-2.5">
                    {/* Double weekend toggle */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ensureDoubleWeekend}
                          onChange={e => setEnsureDoubleWeekend(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-slate-900 text-xs block">
                            Garantir Fim de Semana Duplado (Sáb + Dom Livres)
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Cada técnico recebe fins de semana completos casados no bimestre.
                          </p>
                        </div>
                      </label>
                      {ensureDoubleWeekend && (
                        <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-[11px] text-slate-700 font-medium">Quantidade no bimestre:</span>
                          <select
                            value={targetDoubleWeekends}
                            onChange={e => setTargetDoubleWeekends(Number(e.target.value))}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 font-semibold text-indigo-700"
                          >
                            <option value={1}>1 Fim de Semana Duplado</option>
                            <option value={2}>2 Finais de Semana Duplados</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Inversions */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900 text-xs block">
                          Inversões no Período
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Virada de turnos com folga compensada (FC).
                        </p>
                      </div>
                      <select
                        value={targetInversions}
                        onChange={e => setTargetInversions(Number(e.target.value))}
                        className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-800"
                      >
                        <option value={1}>1 Inversão</option>
                        <option value={2}>2 Inversões</option>
                        <option value={3}>3 Inversões</option>
                      </select>
                    </div>

                    {/* Max consecutive days */}
                    <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-emerald-900 text-xs block">
                          Limite Rigoroso: Máximo 6 Dias Consecutivos (CLT)
                        </span>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Proíbe 7 dias seguidos de trabalho inserindo folga compensada automática.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prioritizeRequests}
                    onChange={e => setPrioritizeRequests(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Priorizar Pedidos de Folga Aprovados (Casamento, etc.)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={balanceDDD}
                    onChange={e => setBalanceDDD(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Distribuir por Região (Metade da Equipe por DDD: 4/3, 2/2, 2/1)</span>
                </label>
              </div>
            </div>

            {/* Right Column: Visual Schema & Operational Overview */}
            <div className="space-y-4">
              {regime === '5x2' ? (
                /* 5x2 Visual Structure */
                <>
                  <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 shadow-md">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Padrão Oficial 5x2 (Colaborador 1/3, 2/3 e 3/3)
                      </span>
                      <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                        Planilha Oficial RH
                      </span>
                    </div>

                    {/* Selector Tabs for Master Pattern */}
                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('dezembro')}
                        className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          previewTab === 'dezembro'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Dezembro (31d)</span>
                        {currentPatternKey === 'dezembro' && <span className="text-[8px] bg-white/20 px-1 rounded">Atual</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewTab('janeiro')}
                        className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          previewTab === 'janeiro'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Janeiro (31d)</span>
                        {currentPatternKey === 'janeiro' && <span className="text-[8px] bg-white/20 px-1 rounded">Atual</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewTab('transicaoFev')}
                        className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          previewTab === 'transicaoFev'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Fev (7d)</span>
                        {currentPatternKey === 'transicaoFev' && <span className="text-[8px] bg-white/20 px-1 rounded">Atual</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewTab('novembro')}
                        className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          previewTab === 'novembro'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Novembro (30d)</span>
                        {currentPatternKey === 'novembro' && <span className="text-[8px] bg-white/20 px-1 rounded">Atual</span>}
                      </button>
                    </div>

                    {/* Display the 3 Groups for the active previewTab */}
                    {(['grupo1', 'grupo2', 'grupo3'] as const).map(gKey => {
                      const grp = MASTER_PATTERN_5X2[gKey];
                      const seq = grp[previewTab];
                      const tbCount = seq.filter(s => s === 'TB').length;
                      const fdCount = seq.filter(s => s === 'FD').length;
                      const fgCount = seq.filter(s => s === 'FG').length;
                      const offTotal = fdCount + fgCount;

                      return (
                        <div key={gKey} className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/80 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className={gKey === 'grupo1' ? 'text-emerald-400' : gKey === 'grupo2' ? 'text-sky-400' : 'text-purple-400'}>
                              {grp.name} ({grp.fractionLabel})
                            </span>
                            <span className="text-[10px] font-mono text-slate-300">
                              {tbCount} TB • {offTotal} Folgas ({fdCount} FD, {fgCount} FG)
                            </span>
                          </div>

                          {/* Chip Track of Shifts */}
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1.5 bg-slate-900/90 rounded border border-slate-700 font-mono text-[9px] font-bold">
                            {seq.map((s, idx) => {
                              const badgeClass = s === 'TB'
                                ? 'bg-slate-700 text-slate-200 border-slate-600'
                                : s === 'FD'
                                ? 'bg-orange-500/30 text-orange-200 border-orange-500/50'
                                : 'bg-yellow-500/30 text-yellow-200 border-yellow-500/50';
                              return (
                                <span
                                  key={idx}
                                  className={`px-1 py-0.2 rounded border ${badgeClass}`}
                                  title={`Dia ${idx + 1}: ${s}`}
                                >
                                  {s}
                                </span>
                              );
                            })}
                          </div>

                          <div className="text-[9px] font-mono text-slate-400 truncate select-all" title="Sequência exata">
                            {seq.join(', ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Informational Guidance Box */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Garantias Operacionais do Padrão Mestre 5x2 (CLT)
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-slate-600">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span><strong>Conformidade Seco:</strong> Exatamente 5 TB e 2 folgas (FD ou FG) por semana comercial (Segunda a Domingo). Mínimo de 8 folgas mensais.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-indigo-600 font-bold">•</span>
                        <span><strong>Trava Horizontal Absoluta:</strong> Limite máximo de 6 TB consecutivos na linha horizontal. Proibido trabalhar 7 dias seguidos.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span><strong>Cobertura Desalinhada por DDD:</strong> Os 3 grupos rodam assincronamente para que a força de trabalho nunca zere.</span>
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                /* 6x1 Visual Structure */
                <>
                  <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 shadow-md">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Estrutura do Modelo de Rodízio 6x1 CLT
                      </span>
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                        CLT 6x1
                      </span>
                    </div>

                    <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-2 text-xs">
                      <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                        <span>📅 CICLOS DE RODÍZIO TRI-SEMANAL</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60">
                          <strong className="text-indigo-300 block font-bold mb-1">Padrão A (Sábados Livres)</strong>
                          <span className="text-slate-300 leading-snug">Trabalha Domingo a Sexta | Folga regular fixa no Sábado.</span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60">
                          <strong className="text-indigo-300 block font-bold mb-1">Padrão B (Domingos Livres)</strong>
                          <span className="text-slate-300 leading-snug">Trabalha Segunda a Sábado | Folga regular fixa no Domingo.</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-2 text-xs">
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                        <span>✨ INVERSÕES & FIM DE SEMANA DUPLADO</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60">
                          <strong className="text-emerald-300 block font-bold mb-1">Fim de Semana Duplado</strong>
                          <span className="text-slate-300 leading-snug">Ao menos 1 par casado Sábado + Domingo (`FD`) garantido.</span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60">
                          <strong className="text-sky-300 block font-bold mb-1">Folga Compensada (FC)</strong>
                          <span className="text-slate-300 leading-snug">Inserida entre Segunda e Quinta para não atingir 7 dias seguidos.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Conformidade Legal CLT
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-slate-600">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span><strong>Limite Estrito:</strong> Bloqueio total de 7 dias consecutivos trabalhados.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-indigo-600 font-bold">•</span>
                        <span><strong>Descanso Semanal:</strong> Folga compensatória inserida antes de qualquer virada.</span>
                      </li>
                    </ul>
                  </div>
                </>
              )}
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
