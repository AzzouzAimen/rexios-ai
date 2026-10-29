import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { InfoPage } from '../components/InfoPage';
import { policies, type PolicyKind } from '../data/policies';

export function PolicyPage({ kind }: { kind: PolicyKind }) {
  const { lang } = useApp();
  const policy = policies[kind];
  return <InfoPage title={policy.title[lang]} description={policy.intro[lang]}>
    <article className="card-pixel bg-[#FFFBF1] p-5 sm:p-9 space-y-8">
      <p className="text-xs text-[#5B5B7B] border-b border-[#DCCDAA] pb-4">{lang === 'ar' ? 'آخر تحديث: أكتوبر 2026' : 'Last updated: October 2026'}</p>
      {policy.sections.map(section => <section key={section.id} id={section.id} className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-bold text-[#0B2A9E]">{section.title[lang]}</h2>
        {section.paragraphs.map((paragraph, i) => <p key={i} className="text-sm leading-7 text-[#34345A]">{paragraph[lang]}</p>)}
      </section>)}
      <div className="border-t border-[#DCCDAA] pt-5 text-sm">
        <Link to="/support" className="font-bold text-[#0B2A9E] underline underline-offset-4">{lang === 'ar' ? 'لديك سؤال؟ تواصل مع فريق Rexios' : 'Have a question? Contact the Rexios team'}</Link>
      </div>
    </article>
  </InfoPage>;
}
