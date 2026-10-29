import { useEffect, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function InfoPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const { lang, dir } = useApp();
  const { pathname, hash } = useLocation();
  useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname, hash]);
  return <div dir={dir} className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-7">
    <header className="space-y-4">
      <span className="inline-block bg-[#C6FF3D] border-2 border-[#12122B] rounded px-3 py-1 text-xs font-bold shadow-pixel-s">REXIOS AI</span>
      <h1 className="text-3xl sm:text-4xl font-bold text-[#12122B]">{title}</h1>
      <p className="text-sm sm:text-base text-[#5B5B7B] max-w-2xl leading-relaxed">{description}</p>
      <nav aria-label={lang === 'ar' ? 'السياسات والدعم' : 'Policies and support'} className="flex flex-wrap gap-2 pt-2">
        {[
          ['/terms', lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'],
          ['/privacy', lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'],
          ['/support', lang === 'ar' ? 'التواصل والدعم' : 'Contact & Support'],
        ].map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => `px-3 py-2 text-xs font-bold rounded border-2 border-[#12122B] ${isActive ? 'bg-[#0B2A9E] text-[#FFFBF1] shadow-pixel-s' : 'bg-[#FFFBF1] text-[#12122B] hover:bg-[#EFE4CC]'}`}>{label}</NavLink>)}
      </nav>
    </header>
    {children}
  </div>;
}
