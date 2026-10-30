import React, { useState } from 'react';
import { AppUser, Technician } from '../types';
import { DDD_INFO } from '../data/defaultTechnicians';
import { Lock, User, KeyRound, ShieldAlert, CheckCircle2, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  users: AppUser[];
  technicians: Technician[];
  onLogin: (user: AppUser) => void;
  onUpdateUserPin: (userId: string, newPin: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  users,
  technicians,
  onLogin,
  onUpdateUserPin
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('admin');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);

  // First Login Password Setup State
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [changeError, setChangeError] = useState<string>('');
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null);

  if (!isOpen) return null;

  const currentUserData = users.find(u => u.id === selectedUserId);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentUserData) {
      setErrorMsg('Usuário não encontrado.');
      return;
    }

    if (enteredPin !== currentUserData.pin) {
      setErrorMsg('Senha/PIN incorreto. (Padrão inicial: 1234)');
      return;
    }

    // Check if it's the first login with default PIN '1234'
    const isFirstAccess = (currentUserData.primeiro_acesso !== undefined)
      ? currentUserData.primeiro_acesso
      : (currentUserData.isFirstLogin ?? true);

    if (isFirstAccess && currentUserData.pin === '1234') {
      setPendingUser(currentUserData);
      setIsChangingPassword(true);
      return;
    }

    // Normal successful login
    onLogin(currentUserData);
    setEnteredPin('');
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');

    if (!pendingUser) return;
    if (newPin.trim().length < 4) {
      setChangeError('A nova senha deve ter no mínimo 4 caracteres ou dígitos.');
      return;
    }

    if (newPin === '1234') {
      setChangeError('Por favor, crie uma senha diferente do PIN inicial 1234.');
      return;
    }

    if (newPin !== confirmPin) {
      setChangeError('A confirmação da senha não coincide.');
      return;
    }

    // Update password and complete login without looping
    const trimmedPin = newPin.trim();
    onUpdateUserPin(pendingUser.id, trimmedPin);
    const updatedUser: AppUser = {
      ...pendingUser,
      pin: trimmedPin,
      primeiro_acesso: false,
      isFirstLogin: false
    };

    onLogin(updatedUser);
    setIsChangingPassword(false);
    setPendingUser(null);
    setNewPin('');
    setConfirmPin('');
    setEnteredPin('');
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-xs border border-white/20">
            {isChangingPassword ? (
              <KeyRound className="w-7 h-7 text-amber-300" />
            ) : (
              <Lock className="w-7 h-7 text-indigo-200" />
            )}
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">
            Escala Técnico Remoto
          </h2>
          <p className="text-xs text-indigo-100 mt-1 font-medium">
            São Paulo Interior (DDDs 13, 14, 15 e 19)
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {!isChangingPassword ? (
            /* Standard Login Step */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Identificação do Usuário:
                </label>
                <select
                  value={selectedUserId}
                  onChange={e => {
                    setSelectedUserId(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                >
                  <option value="admin">Administrador Geral</option>
                  {[...technicians]
                    .filter(t => t.active)
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Código PIN / Senha de Acesso:
                  </label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                    Inicial: 1234
                  </span>
                </div>

                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={enteredPin}
                    onChange={e => {
                      setEnteredPin(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="Digite seu PIN (padrão: 1234)"
                    className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 tracking-widest transition-all"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <span>Acessar Meu Painel</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <p>🔒 <strong>Segurança Individual:</strong> Cada técnico visualiza exclusivamente sua própria escala e folgas.</p>
                <p>🔑 <strong>Primeiro Acesso:</strong> Ao entrar pela primeira vez com o PIN <strong>1234</strong>, o sistema solicitará o cadastro de uma nova senha pessoal.</p>
              </div>
            </form>
          ) : (
            /* First Login Password Setup Step */
            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block font-bold">Primeiro Acesso Detectado</strong>
                  <span>Por segurança, cadastre uma nova senha pessoal para o usuário <strong>{pendingUser?.name}</strong>.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nova Senha / Novo PIN Pessoal:
                </label>
                <input
                  type="password"
                  value={newPin}
                  onChange={e => {
                    setNewPin(e.target.value);
                    setChangeError('');
                  }}
                  placeholder="Mínimo 4 caracteres (Ex: 9876)"
                  className="w-full text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white tracking-widest"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirmar Nova Senha:
                </label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={e => {
                    setConfirmPin(e.target.value);
                    setChangeError('');
                  }}
                  placeholder="Repita a nova senha"
                  className="w-full text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white tracking-widest"
                  required
                />
              </div>

              {changeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{changeError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPendingUser(null);
                  }}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Senha & Entrar</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
