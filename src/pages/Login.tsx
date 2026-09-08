import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Fingerprint, LockKeyhole, ArrowRight } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import logoImg from '../assets/logo.png';
import helmet3dImg from '../assets/helmet3d.jpg';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const [forgotMode, setForgotMode] = useState(false);

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {

      const cleanEmail = email.trim();
      const { error, data } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message === 'Failed to fetch') {
          setError('Não foi possível conectar ao servidor. Verifique sua conexão ou contate o suporte.');
        } else if (error.message === 'Invalid login credentials') {
          setError('Email ou senha incorretos.');
        } else {
          setError(error.message);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Um erro inesperado ocorreu.';
      if (message === 'Failed to fetch') {
        setError('Não foi possível conectar ao servidor. Verifique sua conexão ou contate o suporte.');
      } else {
        setError(message);
      }
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        if (error.message === 'Failed to fetch') {
          setError('Não foi possível conectar ao servidor. Verifique sua conexão ou contate o suporte.');
        } else {
          setError(error.message);
        }
      } else {
        // In a real app we might ask for email confirmation, but for this demo let's just show success
        // If auto-confirm is enabled in Supabase, this will actually log them in.
        setError('Registration successful. If email confirmation is off, you can now Sign In.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Um erro inesperado ocorreu.';
      if (message === 'Failed to fetch') {
        setError('Não foi possível conectar ao servidor. Verifique sua conexão ou contate o suporte.');
      } else {
        setError(message);
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Por favor, preencha o campo de email primeiro.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/',
      });
      if (error) {
        setError(error.message);
      } else {
        setError('Se o email existir, um link de redefinição foi enviado. Verifique sua caixa de entrada.');
        setForgotMode(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar email de redefinição.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row font-sans text-foreground overflow-hidden selection:bg-primary/30">
      
      {/* Left Pane - Abstract Graphic / Branding */}
      <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-12 border-r border-white/5 bg-gradient-to-br from-[#0a0a0a] to-[#111]">
        
        {/* Subtle Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex items-center gap-3"
        >
          <img src={logoImg} alt="EngenharQ OS Logo" className="h-10 w-auto object-contain" />
        </motion.div>

        <div className="relative z-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 backdrop-blur-sm overflow-hidden"
          >
            <img src={helmet3dImg} alt="3D Safety Helmet" className="w-full h-full object-cover" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4 text-white"
          >
            Padrão Ouro em <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-rose-400">
              Segurança Operacional
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-zinc-400 text-lg leading-relaxed"
          >
            Plataforma preditiva para controle de EPIs, conformidade com a NR-6 e rastreabilidade em tempo real de colaboradores no canteiro de obras.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="relative z-10 flex items-center gap-4 text-sm font-mono text-zinc-600 uppercase tracking-widest"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Industrial Security Protocol • v2.4.0</span>
        </motion.div>
      </div>

      {/* Right Pane - Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Glow effect behind form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50" />

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="w-full max-w-sm relative z-10"
        >
          <div className="md:hidden flex items-center gap-2 mb-12">
            <img src={logoImg} alt="EngenharQ OS Logo" className="h-8 w-auto object-contain" />
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Autenticação</h2>
            <p className="text-zinc-400 text-sm">Insira suas credenciais corporativas para acessar o sistema.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-red-950/50 border border-red-900/50 rounded-lg text-red-400 text-sm font-medium backdrop-blur-sm"
              >
                {error}
              </motion.div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Email Corporativo</label>
                <div className="relative">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-mono text-sm"
                    placeholder="engenheiro@construtora.com"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Senha</label>
                  <button type="button" onClick={handleForgotPassword} className="text-xs text-primary hover:text-primary-dark transition-colors font-medium cursor-pointer">Esqueceu?</button>
                </div>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-mono text-sm tracking-widest"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-2 space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group bg-white text-black hover:bg-zinc-200 cursor-pointer font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? 'Verificando Credenciais...' : 'Acessar Workspace'}
                  {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </span>
              </button>
              
              <button
                type="button"
                onClick={handleSignUp}
                disabled={loading}
                className="w-full bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white cursor-pointer font-medium py-3.5 px-4 rounded-xl transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Cadastrar Novo Usuário
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
