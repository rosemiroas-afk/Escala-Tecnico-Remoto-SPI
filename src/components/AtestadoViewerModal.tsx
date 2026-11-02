import React from 'react';
import { Atestado } from '../types';
import { formatDisplayDate } from '../utils/dateUtils';
import { X, Download, FileText, Calendar, Clock, User, Stethoscope } from 'lucide-react';

interface AtestadoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  atestado: Atestado | null;
  darkMode?: boolean;
}

export const AtestadoViewerModal: React.FC<AtestadoViewerModalProps> = ({
  isOpen,
  onClose,
  atestado,
  darkMode = false
}) => {
  if (!isOpen || !atestado) return null;

  const isImage = atestado.fileType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(atestado.fileName);
  const isPdf = atestado.fileType === 'application/pdf' || atestado.fileName.toLowerCase().endsWith('.pdf');

  const handleDownload = () => {
    if (!atestado.fileData) return;
    const a = document.createElement('a');
    a.href = atestado.fileData;
    a.download = atestado.fileName || `Atestado_${atestado.technicianName}_${atestado.dataAtestado}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className={`rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Visualização de Atestado Médico
              </h2>
              <p className="text-xs text-rose-100">
                Colaborador: <strong className="font-bold">{atestado.technicianName}</strong> (DDD {atestado.ddd})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Baixar arquivo no computador"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Details Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Data do Atestado</span>
            <strong className="text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-rose-500" />
              {formatDisplayDate(atestado.dataAtestado)} ({atestado.dataAtestado})
            </strong>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Afastamento</span>
            <strong className="text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {atestado.diasAfastamento} {atestado.diasAfastamento === 1 ? 'dia' : 'dias'}
            </strong>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Médico / CRM</span>
            <span className="text-slate-700 dark:text-slate-300 text-xs block truncate mt-0.5" title={atestado.medicoOuClinica || 'Não informado'}>
              {atestado.medicoOuClinica || 'Não informado'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">CID / Diagnóstico</span>
            <span className="text-slate-700 dark:text-slate-300 text-xs block truncate mt-0.5" title={atestado.cid || 'Não informado'}>
              {atestado.cid || 'Não informado'}
            </span>
          </div>

          {atestado.observacoes && (
            <div className="col-span-full pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Observações do Colaborador:</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 italic">
                "{atestado.observacoes}"
              </p>
            </div>
          )}
        </div>

        {/* File Preview Container */}
        <div className="p-4 flex-1 overflow-y-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950/50 min-h-[340px]">
          {isImage && atestado.fileData ? (
            <div className="max-w-full flex items-center justify-center">
              <img
                src={atestado.fileData}
                alt={`Atestado de ${atestado.technicianName}`}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-300 dark:border-slate-700"
              />
            </div>
          ) : isPdf && atestado.fileData ? (
            <iframe
              src={atestado.fileData}
              title={`PDF Atestado - ${atestado.fileName}`}
              className="w-full h-[60vh] rounded-xl border border-slate-300 dark:border-slate-700 bg-white"
            />
          ) : (
            <div className="text-center p-8">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {atestado.fileName}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Clique no botão abaixo para baixar e abrir o arquivo no seu dispositivo.
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Atestado ({Math.round((atestado.fileSize || 0) / 1024)} KB)</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <span className="text-[11px] text-slate-400">
            Arquivo: {atestado.fileName}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
