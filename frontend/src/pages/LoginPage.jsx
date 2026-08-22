import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EnvelopeSimple, Lock, Eye, EyeSlash, CircleNotch, Dna } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('admin@hospital.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success('Signed in');
      navigate('/dashboard');
    } catch {
      toast.error('Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // min-h-[100dvh] per §3.E — no h-screen (iOS Safari)
    <div
      className="min-h-[100dvh] flex items-center justify-center p-4"
      style={{ background: 'var(--surface-base)' }}
    >
      {/*
        No animated blob orbs — §9.A no neon/outer glows.
        No AI-purple gradient text on the title.
        Asymmetric two-column layout at md+ (§4.3 anti-center bias).
      */}
      <div className="w-full max-w-[900px] min-h-[520px] flex rounded-xl overflow-hidden animate-fade-up"
        style={{ border: '1px solid var(--surface-border-hi)', background: 'var(--surface-raised)' }}
      >
        {/* Left panel — brand side */}
        <div
          className="hidden md:flex flex-col justify-between p-10 w-[46%] flex-shrink-0"
          style={{ background: 'var(--surface-overlay)', borderRight: '1px solid var(--surface-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center"
              style={{ background: 'var(--accent)', color: '#23212C' }}
            >
              <Dna size={20} weight="bold" />
            </div>
            <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              OncoSight
            </span>
          </div>

          <div>
            <p className="text-2xl font-semibold leading-snug mb-4" style={{ color: 'var(--text-primary)' }}>
              Multimodal cancer diagnosis, powered by explainable AI.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              AUC 0.9886 on held-out test data. Grad-CAM visual attention and SHAP feature attribution on every case.
            </p>
          </div>

          {/* Stats strip — real numbers, not fake precision */}
          <div className="flex gap-6">
            {[
              { value: '0.9886', label: 'Test AUC' },
              { value: '96.9%', label: 'Accuracy' },
              { value: '0.9724', label: 'F1 Score' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="font-mono font-semibold text-lg" style={{ color: 'var(--accent)' }}>
                  {stat.value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 flex flex-col justify-center p-8 lg:p-12">
          {/* Mobile logo (hidden on md+) */}
          <div className="flex items-center gap-3 mb-8 md:hidden">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: 'var(--accent)', color: '#23212C' }}
            >
              <Dna size={18} weight="bold" />
            </div>
            <span className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>
              OncoSight
            </span>
          </div>

          <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Sign in to your account
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Clinical Decision Support System
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Email address
              </label>
              <div className="relative">
                <EnvelopeSimple
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <input
                  type="email"
                  className="input-field pl-10"
                  placeholder="doctor@hospital.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  id="login-email"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pl-10 pr-10"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  id="login-password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Single CTA, one intent label — Sign in */}
            <button
              type="submit"
              className="btn-primary w-full mt-2"
              style={{ height: '44px' }}
              disabled={isSubmitting}
              id="login-submit"
            >
              {isSubmitting
                ? <CircleNotch size={18} className="animate-spin" />
                : 'Sign in'}
            </button>
          </form>

          {/* Demo hint — plain, not marketing copy */}
          <p className="text-xs mt-6" style={{ color: 'var(--text-tertiary)' }}>
            Demo: admin@hospital.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
