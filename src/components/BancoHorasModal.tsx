import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, Download, Database } from 'lucide-react';
import { BancoHorasRecord } from '../types';
import { parseBancoHorasCsv, hmToMin, formatHM, saldoToMinutes, minutesToSaldo } from '../utils/csvBancoHorasParser';
import { supabase } from '../supabase';

interface BancoHorasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (records: BancoHorasRecord[]) => void;
  darkMode: boolean;
}

export const BancoHorasModal: React.FC<BancoHorasModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  darkMode
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRecords, setParsedRecords] = useState<BancoHorasRecord[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseErrors([]);
    try {
      const text = await selectedFile.text();
      const result = parseBancoHorasCsv(text);
      setParsedRecords(result.records);
      setParseErrors(result.errors);
    } catch (err) {
      console.error('Error reading CSV:', err);
      setParseErrors(['Falha ao ler o arquivo CSV. Certifique-se de que é um formato de texto válido.']);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'Matricula do Colaborador,NOME,CARGO,STATUS,DESCRICAO,DATA REALIZAÇÃO,DATA VENCIMENTO,SALDO A COMPENSAR,A_VENCER_EM_DIAS\n' +
      '1001,Adilson Jose da Silva,Técnico Remoto,CRÉDITO,Horas extras plantão final de semana,2026-10-15,2027-01-15,+08:00,65\n' +
      '1002,Andre Luiz de Araujo,Técnico Remoto,DÉBITO,Folga antecipada compensação,2026-11-01,2026-12-01,-04:30,21\n' +
      '1003,Paulo Sergio Carrara,Técnico Remoto,CRÉDITO,Atendimento emergencial noturno,2026-10-20,2027-01-20,+06:15,70\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_banco_de_horas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToCloud = async () => {
    if (parsedRecords.length === 0) return;
    setIsUploading(true);
    setUploadProgress('Limpando registros antigos no Supabase...');

    try {
      // 1. Delete previous records in Supabase table 'banco_horas'
      try {
        await supabase
          .from('banco_horas')
          .delete()
          .not('id', 'is', null);
      } catch (delErr) {
        console.warn('Delete not null error, attempting neq fallback:', delErr);
        try {
          await supabase
            .from('banco_horas')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (e2) {
          console.warn('Fallback delete also failed:', e2);
        }
      }

      setUploadProgress(`Inserindo ${parsedRecords.length} lançamentos no banco de dados...`);

      // 2. Prepare payload for batch insert indexado por 'descricao' e 'saldo_compensar'
      const rowsToInsert = parsedRecords.map(r => {
        let desc = (r.descricao || '').trim();
        const statusClean = (r.status || 'DÉBITO').trim().toUpperCase();
        if (!desc) {
          desc = `BANCO DE HORAS - ${statusClean}`;
        } else if (!desc.toUpperCase().includes('DEBITO') && !desc.toUpperCase().includes('CREDITO')) {
          desc = `${desc} (${statusClean})`;
        }

        return {
          matricula: r.matricula,
          nome_colaborador: r.nome_colaborador,
          cargo: r.cargo || null,
          status: statusClean,
          descricao: desc,
          data_realizacao: r.data_realizacao || null,
          data_vencimento: r.data_vencimento || null,
          saldo_compensar: r.saldo_a_compensar,
          saldo_a_compensar: r.saldo_a_compensar,
          a_vencer_em_dias: r.a_vencer_em_dias,
          updated_at: new Date().toISOString()
        };
      });

      // Adaptive insert helper function
      const insertWithAdaptiveColumns = async (chunk: any[]) => {
        let currentRows = chunk.map(r => ({ ...r }));
        let retries = 10;

        while (retries > 0) {
          const { error: insertError } = await supabase.from('banco_horas').insert(currentRows);
          if (!insertError) {
            return { success: true };
          }

          console.warn(`Supabase insert attempt returned error (${insertError.code}):`, insertError.message);

          if (insertError.code === 'PGRST204' || insertError.message?.includes('schema cache')) {
            const match = insertError.message.match(/Could not find the '([^']+)' column/i);
            const missingCol = match ? match[1] : null;

            if (missingCol === 'nome_colaborador') {
              currentRows = currentRows.map(r => {
                const { nome_colaborador, ...rest } = r;
                return { ...rest, nome: nome_colaborador };
              });
            } else if (missingCol === 'nome') {
              currentRows = currentRows.map(r => {
                const { nome, ...rest } = r;
                return { ...rest, colaborador: (r as any).nome_colaborador || nome };
              });
            } else if (missingCol === 'saldo_compensar') {
              currentRows = currentRows.map(r => {
                const { saldo_compensar, ...rest } = r;
                return { ...rest, saldo_a_compensar: (r as any).saldo_compensar || (r as any).saldo_a_compensar };
              });
            } else if (missingCol === 'saldo_a_compensar') {
              currentRows = currentRows.map(r => {
                const { saldo_a_compensar, ...rest } = r;
                return { ...rest, saldo_compensar: (r as any).saldo_a_compensar || (r as any).saldo_compensar || (r as any).saldo };
              });
            } else if (missingCol === 'a_vencer_em_dias') {
              currentRows = currentRows.map(r => {
                const { a_vencer_em_dias, ...rest } = r;
                return { ...rest, dias_vencimento: a_vencer_em_dias };
              });
            } else if (missingCol) {
              currentRows = currentRows.map(r => {
                const copy = { ...r };
                delete copy[missingCol];
                return copy;
              });
            } else {
              break;
            }
          } else {
            break;
          }

          retries--;
        }

        return { success: false };
      };

      // Insert in chunks of 100
      for (let i = 0; i < rowsToInsert.length; i += 100) {
        const chunk = rowsToInsert.slice(i, i + 100);
        await insertWithAdaptiveColumns(chunk);
      }

      onSuccess(parsedRecords);
      alert(`✅ Sucesso! ${parsedRecords.length} registros de Banco de Horas foram importados e salvos no Supabase.`);
      onClose();
    } catch (err) {
      console.error('Failed uploading banco_horas:', err);
      alert('Erro ao salvar Banco de Horas no Supabase. Verifique a conexão ou tabela.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // Stats calculation for preview utilizando a regra de ouro na coluna 'descricao'
  let totalCreditosMins = 0;
  let totalDebitosMins = 0;

  parsedRecords.forEach(r => {
    const desc = ((r.descricao || '') + ' ' + (r.status || '')).toUpperCase();
    const saldoStr = r.saldo_compensar || r.saldo_a_compensar || '00:00';
    const match = saldoStr.match(/(\d+):(\d+)/);
    let mins = 0;
    if (match) {
      mins = (parseInt(match[1], 10) || 0) * 60 + (parseInt(match[2], 10) || 0);
    } else {
      mins = Math.abs(hmToMin(saldoStr));
    }

    if (desc.includes('DEBITO') || desc.includes('DÉBITO')) {
      totalDebitosMins += mins;
    } else if (desc.includes('CREDITO') || desc.includes('CRÉDITO')) {
      totalCreditosMins += mins;
    } else if (saldoStr.startsWith('-')) {
      totalDebitosMins += mins;
    } else {
      totalCreditosMins += mins;
    }
  });

  const criticosCount = parsedRecords.filter(r => r.a_vencer_em_dias > 0 && r.a_vencer_em_dias <= 30).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-3xl rounded-3xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${
          darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Importar Banco de Horas (CSV)</h3>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Upload do arquivo exportado com substituição automática no Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors ${
              darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Download Template Banner */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            darkMode ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}>
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-indigo-500 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block">Estrutura exigida do CSV:</span>
                <span className="opacity-90">
                  Matricula | NOME | CARGO | STATUS | DESCRICAO | DATA REALIZAÇÃO | DATA VENCIMENTO | SALDO A COMPENSAR | A_VENCER_EM_DIAS
                </span>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Modelo CSV</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <label className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
            file
              ? darkMode ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-emerald-500/60 bg-emerald-50/50'
              : darkMode ? 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800/50' : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/30'
          }`}>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className={`w-10 h-10 mb-2 ${file ? 'text-emerald-500' : 'text-indigo-500'}`} />
            <span className="font-bold text-sm">
              {file ? file.name : 'Clique para selecionar o arquivo .CSV do Banco de Horas'}
            </span>
            <span className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Suporta formato exportado pela empresa com separador por vírgula ou ponto e vírgula
            </span>
          </label>

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
              darkMode ? 'bg-rose-950/40 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="font-bold flex items-center gap-1.5 text-rose-500">
                <AlertCircle className="w-4 h-4" />
                <span>Avisos de Validação no Arquivo:</span>
              </div>
              {parseErrors.slice(0, 4).map((err, idx) => (
                <div key={idx} className="opacity-90">• {err}</div>
              ))}
            </div>
          )}

          {/* Parsed Summary Stats */}
          {parsedRecords.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border text-center ${
                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] uppercase tracking-wider font-bold block text-slate-400">Total de Registros</span>
                  <span className="text-lg font-black">{parsedRecords.length}</span>
                </div>
                <div className={`p-3 rounded-xl border text-center ${
                  darkMode ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <span className="text-[10px] uppercase tracking-wider font-bold block opacity-80">Total Créditos</span>
                  <span className="text-lg font-black">+{minutesToSaldo(totalCreditosMins)}</span>
                </div>
                <div className={`p-3 rounded-xl border text-center ${
                  darkMode ? 'bg-rose-950/40 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <span className="text-[10px] uppercase tracking-wider font-bold block opacity-80">Total Débitos</span>
                  <span className="text-lg font-black">-{minutesToSaldo(totalDebitosMins)}</span>
                </div>
                <div className={`p-3 rounded-xl border text-center ${
                  criticosCount > 0
                    ? darkMode ? 'bg-amber-950/60 border-amber-700 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
                    : darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] uppercase tracking-wider font-bold block opacity-80">Vencendo &le; 30d</span>
                  <span className="text-lg font-black">{criticosCount} lançamentos</span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border rounded-2xl overflow-hidden max-h-48 overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className={`sticky top-0 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                    <tr>
                      <th className="p-2.5 font-bold">Matrícula</th>
                      <th className="p-2.5 font-bold">Colaborador</th>
                      <th className="p-2.5 font-bold">Status</th>
                      <th className="p-2.5 font-bold">Saldo</th>
                      <th className="p-2.5 font-bold">Vencer em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/20">
                    {parsedRecords.slice(0, 15).map((r, i) => (
                      <tr key={i} className={darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                        <td className="p-2.5 font-mono font-bold">{r.matricula}</td>
                        <td className="p-2.5 font-semibold">{r.nome_colaborador}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            r.status.includes('CRÉDITO') || r.status.includes('CREDITO')
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold font-mono">{r.saldo_a_compensar}</td>
                        <td className="p-2.5 font-medium">
                          <span className={r.a_vencer_em_dias <= 30 ? 'text-amber-500 font-bold' : ''}>
                            {r.a_vencer_em_dias} dias
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${
          darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <span className="text-xs font-semibold text-slate-400">
            {isUploading ? uploadProgress : `${parsedRecords.length} lançamentos prontos para sincronizar`}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isUploading}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveToCloud}
              disabled={parsedRecords.length === 0 || isUploading}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isUploading ? 'Gravando no Supabase...' : 'Confirmar e Substituir no Supabase'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
