import React, { useState, useRef } from 'react';
import { Technician, Atestado } from '../types';
import { formatDisplayDate } from '../utils/dateUtils';
import { X, Upload, FileText, Calendar, Check, AlertCircle, FileCheck, Eye } from 'lucide-react';

interface AtestadoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician: Technician;
  onSaveAtestado: (atestado: Atestado) => void;
  darkMode?: boolean;
}

export const AtestadoUploadModal: React.FC<AtestadoUploadModalProps> = ({
  isOpen,
  onClose,
  technician,
  onSaveAtestado,
  darkMode = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dataAtestado, setDataAtestado] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [diasAfastamento, setDiasAfastamento] = useState<number>(1);
  const [medicoOuClinica, setMedicoOuClinica] = useState<string>('');
  const [cid, setCid] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    size: number;
    dataUrl: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('O arquivo é muito grande. Tamanho máximo permitido: 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedFile) {
      setErrorMsg('Por favor, selecione e anexe o arquivo do atestado (PDF ou Foto).');
      return;
    }
    if (!dataAtestado) {
      setErrorMsg('Por favor, informe a data do atestado.');
      return;
    }

    setIsSubmitting(true);

    // Determine reference month (e.g. "Novembro/2026")
    const [y, m] = dataAtestado.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthIndex = Number(m) - 1;
    const mesReferencia = `${monthNames[monthIndex] || m} de ${y}`;

    const newAtestado: Atestado = {
      id: `atestado-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      technicianId: technician.id,
      technicianName: technician.name,
      ddd: technician.ddd,
      dataAtestado,
      mesReferencia,
      diasAfastamento: Math.max(1, Number(diasAfastamento) || 1),
      medicoOuClinica: medicoOuClinica.trim() || undefined,
      cid: cid.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      fileName: selectedFile.name,
      fileType: selectedFile.type,
      fileData: selectedFile.dataUrl,
      fileSize: selectedFile.size,
      createdAt: new Date().toISOString()
    };

    try {
      await onSaveAtestado(newAtestado);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setSelectedFile(null);
      setMedicoOuClinica('');
      setCid('');
      setObservacoes('');
      onClose();
    }
  };

  const isImage = selectedFile?.type.startsWith('image/');
  const isPdf = selectedFile?.type === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className={`rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-600 to-pink-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Anexar Atestado Médico
              </h2>
              <p className="text-xs text-rose-100">
                Colaborador: <strong className="font-bold">{technician.name}</strong> (DDD {technician.ddd})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Data do Atestado & Dias de Afastamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Data do Atestado: *
              </label>
              <input
                type="date"
                value={dataAtestado}
                onChange={e => setDataAtestado(e.target.value)}
                required
                className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Dias de Afastamento: *
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={diasAfastamento}
                onChange={e => setDiasAfastamento(Number(e.target.value))}
                required
                className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Row 2: Médico / Clínica & CID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Médico / CRM / Clínica / Hospital:
              </label>
              <input
                type="text"
                value={medicoOuClinica}
                onChange={e => setMedicoOuClinica(e.target.value)}
                placeholder="Ex: Dr. Carlos Silva - CRM 12345 / UBS"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                CID / Diagnóstico (Opcional):
              </label>
              <input
                type="text"
                value={cid}
                onChange={e => setCid(e.target.value)}
                placeholder="Ex: CID J06 / Consulta"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Row 3: Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Observações Adicionais:
            </label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Ex: Atestado entregue referente à consulta médica do período da manhã."
              rows={2}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          {/* Row 4: Upload File Area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Arquivo do Atestado (Foto ou PDF): *
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-rose-300 dark:border-rose-800 rounded-2xl p-6 text-center cursor-pointer hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                    Clique aqui para selecionar o arquivo
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Formatos aceitos: PDF, JPG, PNG (Máx 10MB)
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate max-w-xs" title={selectedFile.name}>
                      {selectedFile.name}
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      {Math.round(selectedFile.size / 1024)} KB • Arquivo carregado com sucesso
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                  >
                    Trocar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    title="Remover arquivo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mini preview if image */}
          {selectedFile && isImage && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center max-h-48 overflow-hidden">
              <img
                src={selectedFile.dataUrl}
                alt="Pré-visualização do atestado"
                className="max-h-44 object-contain rounded-lg shadow-xs"
              />
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Enviando Atestado...' : 'Salvar e Enviar Atestado'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
