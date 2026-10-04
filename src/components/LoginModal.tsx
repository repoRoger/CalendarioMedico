import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar, Mail, ArrowRight, ShieldCheck, Sparkles
} from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { UserSession } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  currentUser: UserSession;
  onLogin: (email: string, personalName?: string, photoUrl?: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  currentUser,
  onLogin,
}) => {
  const [customEmail, setCustomEmail] = useState('');

  if (!isOpen) return null;

  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '1095378668318-ndplgnk6regr0di59c11195stto8bims.apps.googleusercontent.com';

  // Handle successful Google OAuth Sign-In response
  const handleGoogleSuccess = (credentialResponse: any) => {
    if (credentialResponse.credential) {
      try {
        const decoded: any = jwtDecode(credentialResponse.credential);
        const email = decoded.email || '';
        const name = decoded.name || decoded.given_name || 'Personal de Salud';
        const picture = decoded.picture || '';

        onLogin(email, name, picture);
      } catch (err) {
        console.error('Error decoding Google JWT credential:', err);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    onLogin(customEmail.trim(), undefined, undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 text-center my-auto"
      >
        {/* App Logo & Title */}
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 mx-auto flex items-center justify-center text-white shadow-xl shadow-teal-900/40">
            <Calendar className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-black text-slate-100 tracking-tight">
            Calendario<span className="text-teal-400">Medico</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Inicia sesión para ver tu rol de turnos aislado y seguro en Turso.
          </p>
        </div>

        {/* GOOGLE SIGN IN & EMAIL ACCESS */}
        <div className="space-y-4 pt-1">
          {googleClientId && (
            <div className="flex justify-center">
              <GoogleOAuthProvider clientId={googleClientId}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.error('Error al iniciar sesión con Google')}
                  useOneTap
                  theme="filled_blue"
                  shape="pill"
                  text="signin_with"
                />
              </GoogleOAuthProvider>
            </div>
          )}

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
              o con tu correo
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-2.5 text-left">
            <label className="text-[11px] text-slate-400 font-medium block">
              Correo electrónico:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                placeholder="ejemplo@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none min-h-[44px]"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <span>Acceder con este correo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Security badge note */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>Datos protegidos y aislados por tu cuenta en Turso</span>
        </div>
      </motion.div>
    </div>
  );
};
