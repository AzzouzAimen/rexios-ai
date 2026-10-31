import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { Language } from '../types';

export function PasswordInput({ lang, className = '', id, style, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { lang: Language }) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;
  const label = visible ? (lang === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password') : (lang === 'ar' ? 'إظهار كلمة المرور' : 'Show password');
  const Icon = visible ? EyeOff : Eye;
  return <div className="relative">
    <input {...props} id={inputId} type={visible ? 'text' : 'password'} style={{ ...style, paddingInlineEnd: '2.75rem' }} className={`w-full input-pixel text-xs ${className}`} />
    <button type="button" onClick={() => setVisible(value => !value)} aria-label={label} title={label} aria-pressed={visible} aria-controls={inputId} className="absolute end-1 top-1/2 -translate-y-1/2 p-2 rounded text-[#5B5B7B] hover:text-[#0B2A9E] focus-visible:outline-2 focus-visible:outline-[#0B2A9E] cursor-pointer">
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  </div>;
}
