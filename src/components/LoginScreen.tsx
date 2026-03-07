import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import EscolaLogo from './EscolaLogo';

interface LoginScreenProps {
  onLogin: (username: string, password: string, rememberMe: boolean) => boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password, rememberMe);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="glass-strong rounded-3xl p-10 max-w-sm w-full shadow-lg text-center animate-scale-in relative z-10">
        <EscolaLogo className="w-24 mx-auto mb-5 drop-shadow-md" />
        <h1 className="text-2xl font-black mb-1 tracking-tight text-foreground">Anísio Teixeira</h1>
        <p className="text-[10px] text-primary mb-8 uppercase font-extrabold tracking-[0.2em]">Gestão Inteligente</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Seu Nome (Prof/Aluno/Gestão)"
            value={username}
            className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-foreground placeholder:text-muted-foreground"
            onChange={e => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="PIN de Acesso"
            value={password}
            className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium text-foreground placeholder:text-muted-foreground"
            onChange={e => setPassword(e.target.value)}
          />
          <label className="flex items-center gap-2.5 justify-center cursor-pointer group mt-2">
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
              ${rememberMe ? 'bg-primary border-primary' : 'bg-card border-border group-hover:border-primary/40'}`}>
              {rememberMe && <Check size={14} className="text-primary-foreground" />}
            </div>
            <span className="text-xs font-semibold text-muted-foreground transition-colors group-hover:text-foreground">Manter sessão iniciada</span>
            <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
          </label>
          <button
            type="submit"
            className="w-full mt-4 bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{ boxShadow: 'var(--shadow-primary)' }}
          >
            Entrar no Sistema <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
