import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Loader2
} from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

interface LoginModalProps {
  isOpen: boolean;
  onLoginGoogle: (email: string, personalName?: string, photoUrl?: string) => Promise<void>;
  onLoginWithPassword: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  onRegisterWithPassword: (email: string, password: string, name: string) => Promise<{ success: boolean; message?: string }>;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginGoogle,
  onLoginWithPassword,
  onRegisterWithPassword,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '1095378668318-ndplgnk6regr0di59c11195stto8bims.apps.googleusercontent.com';

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const decoded: any = jwtDecode(credentialResponse.credential);
        const userEmail = decoded.email || '';
        const name = decoded.name || decoded.given_name || 'Personal de Salud';
        const picture = decoded.picture || '';

        await onLoginGoogle(userEmail, name, picture);
      } catch (err: any) {
        setErrorMessage('Error al autenticar con Google. Intenta nuevamente.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (tab === 'register') {
      if (!fullName.trim()) {
        setErrorMessage('Por favor escribe tu nombre completo.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Las contraseñas no coinciden.');
        return;
      }

      setIsLoading(true);
      const res = await onRegisterWithPassword(cleanEmail, password, fullName.trim());
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.message || 'Error al crear la cuenta.');
      }
    } else {
      setIsLoading(true);
      const res = await onLoginWithPassword(cleanEmail, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.message || 'Error al iniciar sesión.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 text-center my-auto"
      >
        {/* App Logo & Title */}
        <div className="space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 mx-auto flex items-center justify-center text-white shadow-xl shadow-teal-900/40">
            <Calendar className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-black text-slate-100 tracking-tight">
            Calendario<span className="text-teal-400">Medico</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Control de turnos con sincronización protegida en Turso.
          </p>
        </div>

        {/* 1. GOOGLE ONE-CLICK SIGN IN */}
        {googleClientId && (
          <div className="pt-1">
            <div className="flex justify-center">
              <GoogleOAuthProvider clientId={googleClientId}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMessage('Error al conectar con Google.')}
                  useOneTap
                  theme="filled_blue"
                  shape="pill"
                  text="signin_with"
                />
              </GoogleOAuthProvider>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[10.5px] text-slate-500 uppercase tracking-wider font-bold">
                o con contraseña
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>
          </div>
        )}

        {/* 2. TAB SWITCHER: [ Iniciar Sesión ] | [ Crear Cuenta ] */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'login'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'register'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Error notification banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs text-left flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. PASSWORD FORM (Login / Register) */}
        <form onSubmit={handlePasswordSubmit} className="space-y-3 text-left">
          {tab === 'register' && (
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Nombre Completo:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Ej: Licda. Karen Rodríguez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] text-slate-400 font-medium block mb-1">
              Correo Electrónico:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                placeholder="tu.correo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 font-mono focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-medium block mb-1">
              Contraseña:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 p-1"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Confirmar Contraseña:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[46px] mt-2 px-4 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-950/50 active:scale-95 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{tab === 'register' ? 'Creando cuenta...' : 'Verificando...'}</span>
              </>
            ) : (
              <>
                <span>{tab === 'register' ? 'Crear Cuenta y Entrar' : 'Iniciar Sesión'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badge footer */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>Tus contraseñas se almacenan con cifrado seguro</span>
        </div>
      </motion.div>
    </div>
  );
};
