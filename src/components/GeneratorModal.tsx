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

  if (!isOpen) return null;

  const nextInfo = getNextMonthInfo(startYear, startMonth);
  const currentPatternKey = resolvePatternKey(startMonth + 1, cycleMonth5x2);
  const nextPatternKey = resolvePatternKey(nextInfo.monthNum);

  const [previewTab, setPreviewTab] = useState<'mes1' | 'mes2' | 'transicaoFev'>(currentPatternKey);

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
                      <span className="font-bold text-xs text-slate-900">Escala 5x2 Perpétua</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        regime === '5x2' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {regime === '5x2' ? 'Ativo' : '5x2'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      5 trab. (TB) / 2 folgas (FD/FG) semanais em 3 Grupos Cíclicos.
                    </p>
                  </button>
                </div>
              </div>

              {/* Rules & Parameters Form */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  {regime === '5x2' ? 'Parâmetros da Escala 5x2 Perpétua (Padrão Mestre 2 Meses Corridos)' : 'Regras da Escala 6x1 CLT'}
                </h3>

                {regime === '5x2' ? (
                  /* 5x2 Configuration */
                  <div className="space-y-2.5">
                    {/* Regra 1: Padrão Mestre 2 Meses Corridos & Divisão por Frações e DDD */}
                    <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                      <div>
                        <span className="font-semibold text-emerald-950 text-xs block">
                          1. Divisão por Frações DDD & Ciclo Mestre de 2 Meses
                        </span>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Equipe dividida em <strong>Grupo 1/3</strong>, <strong>Grupo 2/3</strong> e <strong>Grupo 3/3</strong> (~33,3% por DDD). Segue rigorosamente o padrão de 2 meses corridos e transição de Fevereiro.
                        </p>
                      </div>

                      <div className="mt-2.5">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Padrão de Ciclo para este Mês:</label>
                        <select
                          value={cycleMonth5x2}
                          onChange={e => setCycleMonth5x2(e.target.value as any)}
                          className="w-full text-xs bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 font-semibold text-emerald-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        >
                          <option value="auto">
                            🔄 Automático ({MONTHS_PT[startMonth]} = {currentPatternKey === 'mes1' ? 'Mês 1 do Ciclo' : currentPatternKey === 'mes2' ? 'Mês 2 do Ciclo' : 'Transição Fev'})
                          </option>
                          <option value="mes_1">
                            📅 Mês 1 do Ciclo (Padrão Mestre 1 - 31 dias)
                          </option>
                          <option value="mes_2">
                            📅 Mês 2 do Ciclo (Padrão Mestre 2 - 31 dias)
                          </option>
                          <option value="transicao_fev">
                            ⚡ Transição Fevereiro (Padrão Mestre Fev - 7 dias cíclicos)
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Regra 2: Card de Prévia do Mês Seguinte */}
                    <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          Prévia do Mês Seguinte ({MONTHS_PT[nextInfo.monthIndex]}/{nextInfo.year})
                        </span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                          {nextPatternKey === 'mes1' ? 'Mês 1 do Ciclo' : nextPatternKey === 'mes2' ? 'Mês 2 do Ciclo' : 'Transição Fev'}
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-800 leading-snug">
                        Ao gerar <strong>{MONTHS_PT[startMonth]}/{startYear}</strong>, o sistema projeta e sincroniza a alternância contínua com <strong>{MONTHS_PT[nextInfo.monthIndex]}/{nextInfo.year}</strong>.
                      </p>
                      
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold text-indigo-950 bg-white/90 p-2 rounded-lg border border-indigo-200">
                        <div>Colab 1/3: 23TB / 8F</div>
                        <div>Colab 2/3: 23TB / 8F</div>
                        <div>Colab 3/3: 23TB / 8F</div>
                      </div>

                      <label className="flex items-center gap-2 pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={generateNextMonthPreview}
                          onChange={e => setGenerateNextMonthPreview(e.target.checked)}
                          className="w-3.5 h-3.5 text-indigo-600 rounded-sm border-indigo-300 focus:ring-indigo-500"
                        />
                        <span className="text-[11px] text-indigo-900 font-semibold">
                          Também pré-carregar a escala de {MONTHS_PT[nextInfo.monthIndex]} na matriz
                        </span>
                      </label>
                    </div>

                    {/* Regra 3: Nomenclatura Estrita */}
                    <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                      <div>
                        <span className="font-semibold text-blue-950 text-xs block">
                          3. Diretrizes de Nomenclatura Estrita:
                        </span>
                        <div className="mt-1.5 grid grid-cols-1 gap-1 text-[11px] text-blue-900">
                          <div><strong>TB:</strong> Dia de Trabalho (5 por semana Seg-Dom)</div>
                          <div><strong>FD:</strong> Folga Duplada (2 dias seguidos de descanso)</div>
                          <div><strong>FG:</strong> Folga Geral Individual (1 dia isolado de descanso)</div>
                        </div>
                      </div>
                    </div>

                    {/* Regra 4: Conformidade CLT e Trava Horizontal Absoluta */}
                    <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-purple-950 text-xs block">
                          4. Travas Operacionais CLT 5x2
                        </span>
                        <p className="text-[11px] text-purple-700 mt-0.5 leading-snug">
                          Limite máximo de 6 TB consecutivos na linha horizontal (proibido 7 seguidos). Total mensal nunca menor que 8 folgas. Cobertura ininterrupta por DDD (atuantes nunca zera).
                        </p>
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
                        Padrão Mestre 5x2 (2 Meses Corridos + Transição Fev)
                      </span>
                      <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                        Referência de Mestre
                      </span>
                    </div>

                    {/* Selector Tabs for Master Pattern */}
                    <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('mes1')}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          previewTab === 'mes1'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Mês 1 (31d)</span>
                        {currentPatternKey === 'mes1' && <span className="text-[9px] bg-white/20 px-1 rounded">Atual</span>}
                        {nextPatternKey === 'mes1' && <span className="text-[9px] bg-indigo-500/40 px-1 rounded">Seguinte</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewTab('mes2')}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          previewTab === 'mes2'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Mês 2 (31d)</span>
                        {currentPatternKey === 'mes2' && <span className="text-[9px] bg-white/20 px-1 rounded">Atual</span>}
                        {nextPatternKey === 'mes2' && <span className="text-[9px] bg-indigo-500/40 px-1 rounded">Seguinte</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewTab('transicaoFev')}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          previewTab === 'transicaoFev'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Transição Fev (7d)</span>
                        {currentPatternKey === 'transicaoFev' && <span className="text-[9px] bg-white/20 px-1 rounded">Atual</span>}
                        {nextPatternKey === 'transicaoFev' && <span className="text-[9px] bg-indigo-500/40 px-1 rounded">Seguinte</span>}
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
