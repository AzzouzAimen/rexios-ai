type Text = { ar: string; en: string };
type PolicySection = { id: string; title: Text; paragraphs: Text[] };
export type PolicyKind = 'terms' | 'privacy';

export const policies: Record<PolicyKind, { title: Text; intro: Text; sections: PolicySection[] }> = {
  terms: {
    title: { en: 'Terms of Use', ar: 'شروط الاستخدام' },
    intro: {
      en: 'The rules for sharing challenges, submitting proposals and participating in Rexios AI.',
      ar: 'قواعد نشر التحديات وتقديم المقترحات والمشاركة في Rexios AI.',
    },
    sections: [
      {
        id: 'purpose', title: { en: '1. Purpose & platform overview', ar: '١. الغرض من المنصة' },
        paragraphs: [{
          en: 'Rexios AI connects technical talent, including STEM students, graduates and independent developers, with industrial enterprises facing operational and engineering challenges. Companies publish technical challenges, talent submits proposals, and the community exchanges knowledge. AI tools help companies structure challenge briefs and compare pending proposals; final selection remains with the company.',
          ar: 'تربط Rexios AI المواهب التقنية، بما في ذلك طلبة التخصصات العلمية والهندسية والخريجين والمطورين المستقلين، بالمؤسسات الصناعية التي تواجه تحديات تشغيلية وهندسية. تنشر الشركات تحدياتها وتقدم المواهب مقترحاتها ويتبادل المجتمع المعرفة. تساعد أدوات الذكاء الاصطناعي الشركات على صياغة التحديات ومقارنة المقترحات قيد المراجعة، ويبقى قرار الاختيار للشركة.',
        }],
      },
      {
        id: 'accounts', title: { en: '2. Accounts, verification & sharing', ar: '٢. الحسابات والتحقق ومشاركة البيانات' },
        paragraphs: [
          { en: 'Accounts are intended for individuals aged 18 or older and authorized representatives of enterprises. Users must provide accurate account and profile details. During the MVP phase, commercial registration and candidate credentials are not systematically verified; an account is not a verification badge.', ar: 'الحسابات مخصصة للأفراد البالغين 18 عامًا أو أكثر ولممثلي المؤسسات المخولين. يجب تقديم معلومات صحيحة للحساب والملف الشخصي. لا يجري التحقق المنهجي من السجل التجاري أو مؤهلات المرشحين في مرحلة النسخة الأولية، ولا يعني وجود حساب أن صاحبه موثّق.' },
          { en: 'Companies publish challenges under their company identity. Do not include highly sensitive or proprietary information in public descriptions, community posts or AI prompts. Private challenge notes and files are restricted to the company and its selected applicant. Agree on any necessary confidentiality terms before sharing sensitive information.', ar: 'تنشر الشركات التحديات بهويتها المؤسسية. لا تضع معلومات شديدة الحساسية أو مملوكة للشركة في الأوصاف العامة أو منشورات المجتمع أو مدخلات الذكاء الاصطناعي. تقتصر الملاحظات والملفات الخاصة بالتحدي على الشركة والمتقدم المختار. اتفق على شروط السرية اللازمة قبل مشاركة معلومات حساسة.' },
          { en: 'Talent submits proposals directly to the company rather than posting full proprietary solutions publicly. Authors remain responsible for the quality, origin and permissions of their submissions. Use the Report action on challenges, questions or answers to flag misuse, or contact support for other concerns.', ar: 'تُرسل المواهب مقترحاتها مباشرة إلى الشركة بدلًا من نشر الحلول الكاملة المملوكة لها علنًا. يتحمل المؤلفون مسؤولية جودة أعمالهم ومصدرها والتصاريح المرتبطة بها. استخدم إجراء الإبلاغ في التحديات أو الأسئلة أو الإجابات للإبلاغ عن إساءة الاستخدام، أو تواصل مع الدعم بخصوص المخاوف الأخرى.' },
        ],
      },
      {
        id: 'confidentiality', title: { en: '3. Confidentiality & intellectual property', ar: '٣. السرية والملكية الفكرية' },
        paragraphs: [
          { en: 'Technical data, schematics and operational information shared by an enterprise remain its intellectual property. Access to a private section does not transfer ownership or permission to redistribute that material.', ar: 'تظل البيانات التقنية والمخططات والمعلومات التشغيلية التي تشاركها المؤسسة ملكًا فكريًا لها. لا يمنح الوصول إلى القسم الخاص ملكية تلك المواد أو إذنًا بإعادة نشرها.' },
          { en: 'If an NDA is required, the company and applicant must arrange and accept it directly before exchanging sensitive details. The current MVP does not provide a digital NDA signing or verification workflow.', ar: 'إذا كانت هناك حاجة إلى اتفاقية عدم إفشاء، فعلى الشركة والمتقدم ترتيبها والموافقة عليها مباشرة قبل تبادل التفاصيل الحساسة. لا توفر النسخة الأولية الحالية إجراءً لتوقيع اتفاقيات عدم الإفشاء أو التحقق منها رقميًا.' },
          { en: 'Rights to a submitted solution, delivery terms and any payment arrangements must be agreed between the candidate and enterprise. Publishing a challenge or accepting a proposal does not itself settle those agreements.', ar: 'يجب الاتفاق بين المرشح والمؤسسة على حقوق الحل المقدم وشروط التسليم وأي ترتيبات مالية. لا يحسم نشر التحدي أو قبول المقترح هذه الاتفاقات تلقائيًا.' },
        ],
      },
      {
        id: 'conduct', title: { en: '4. User obligations & conduct', ar: '٤. التزامات المستخدمين والسلوك' },
        paragraphs: [
          { en: 'Provide accurate profile, academic and professional information. Do not post spam, harassment, misleading claims, unauthorized confidential material or content that infringes another party’s rights.', ar: 'قدم معلومات صحيحة عن ملفك وخلفيتك الأكاديمية والمهنية. يُمنع نشر الرسائل المزعجة أو المضايقات أو الادعاءات المضللة أو المواد السرية دون تصريح أو المحتوى الذي ينتهك حقوق الآخرين.' },
          { en: 'Do not share enterprise specifications outside the platform without permission. For academic or portfolio use, submit a written request and obtain explicit approval from both the enterprise and Rexios AI before using the material.', ar: 'لا تشارك مواصفات المؤسسة خارج المنصة دون إذن. للاستخدام الأكاديمي أو في معرض أعمالك، قدم طلبًا مكتوبًا واحصل على موافقة صريحة من المؤسسة وRexios AI قبل استخدام المواد.' },
        ],
      },
      {
        id: 'responsibility', title: { en: '5. Platform role & disputes', ar: '٥. دور المنصة والنزاعات' },
        paragraphs: [
          { en: 'Rexios AI is a matchmaking and communication platform. AI drafts and proposal comparisons can contain errors and are suggestions for human review, not guarantees of competence, safety or suitability. Companies are responsible for reviewing proposals and making their own decisions.', ar: 'Rexios AI منصة للربط والتواصل. قد تحتوي الصياغات والمقارنات التي ينتجها الذكاء الاصطناعي على أخطاء، وهي اقتراحات للمراجعة البشرية وليست ضمانًا للكفاءة أو السلامة أو الملاءمة. تتحمل الشركات مسؤولية مراجعة المقترحات واتخاذ قراراتها.' },
          { en: 'The platform can receive reports and help facilitate communication about disputes. It does not determine intellectual property ownership or replace agreements between the parties. Final contractual arrangements and dispute resolution remain the responsibility of the enterprise and candidate.', ar: 'يمكن للمنصة تلقي البلاغات والمساعدة في التواصل بشأن النزاعات. ولا تحدد ملكية الحقوق الفكرية ولا تحل محل اتفاقات الأطراف. تبقى الترتيبات التعاقدية النهائية وتسوية النزاعات مسؤولية المؤسسة والمرشح.' },
        ],
      },
    ],
  },
  privacy: {
    title: { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
    intro: { en: 'What Rexios AI stores, how its AI tools use text, and how to contact us about your data.', ar: 'البيانات التي تخزنها Rexios AI وكيف تستخدم أدوات الذكاء الاصطناعي النصوص وطريقة التواصل بشأن بياناتك.' },
    sections: [
      {
        id: 'collection', title: { en: '1. Information we collect', ar: '١. المعلومات التي نجمعها' },
        paragraphs: [
          { en: 'Account and talent data: name, email, password hash, academic and professional background, self-reported skills, profile links, and CV or proposal files you choose to upload.', ar: 'بيانات الحساب والمواهب: الاسم والبريد الإلكتروني وبصمة كلمة المرور والخلفية الأكاديمية والمهنية والمهارات التي تصرح بها وروابط الملف وملفات السيرة الذاتية أو المقترحات التي تختار رفعها.' },
          { en: 'Enterprise and activity data: company name and contact details, public challenge specifications, private notes and files, proposals, review decisions, discussions, reactions and notifications. We also store essential session data, question view counts and technical service logs.', ar: 'بيانات المؤسسات والنشاط: اسم الشركة وبيانات التواصل ومواصفات التحديات العامة والملاحظات والملفات الخاصة والمقترحات وقرارات المراجعة والنقاشات والتفاعلات والإشعارات. نخزن أيضًا بيانات الجلسة الضرورية وعدد مشاهدات الأسئلة وسجلات تشغيل الخدمة.' },
          { en: 'Support and reports: the name, reply email, topic and message you send to support, and the account, content reference, reason and explanation attached to a report.', ar: 'الدعم والبلاغات: الاسم وبريد الرد والموضوع والرسالة التي ترسلها للدعم، والحساب ومرجع المحتوى والسبب والتوضيح المرتبط بالبلاغ.' },
        ],
      },
      {
        id: 'ai', title: { en: '2. AI processing & third parties', ar: '٢. معالجة الذكاء الاصطناعي والأطراف الخارجية' },
        paragraphs: [
          { en: 'When a company uses an AI feature, relevant text is sent to an external model through the Featherless AI API. Challenge drafting processes the company’s input, clarification answers and revision requests. Do not include confidential information or personal data that is unnecessary for the task.', ar: 'عندما تستخدم الشركة ميزة ذكاء اصطناعي، تُرسل النصوص ذات الصلة إلى نموذج خارجي عبر واجهة Featherless AI. تعالج صياغة التحديات مدخلات الشركة وإجابات الاستيضاح وطلبات التعديل. لا تدرج معلومات سرية أو بيانات شخصية غير ضرورية للمهمة.' },
          { en: 'Proposal comparison sends challenge requirements, pending proposal text, proposed delivery time and declared technical skills. Names, contact details, academic history, CV files and private challenge notes are excluded from that comparison input. Personal information written directly inside a proposal may still be included in its text.', ar: 'تُرسل مقارنة المقترحات متطلبات التحدي ونصوص المقترحات قيد المراجعة والمدة المقترحة للتسليم والمهارات التقنية المصرح بها. تُستبعد الأسماء وبيانات التواصل والخلفية الأكاديمية وملفات السيرة الذاتية والملاحظات الخاصة بالتحدي من مدخلات المقارنة. قد تبقى المعلومات الشخصية المكتوبة داخل نص المقترح ضمن النص المرسل.' },
          { en: 'The latest completed proposal comparison is stored so the company can revisit it. Automatic CV parsing and AI profile creation are not currently available. We do not sell or lease candidate data or resume files to advertisers. Requests to the AI provider use HTTPS; provider-side processing is also subject to that provider’s terms.', ar: 'تُحفظ أحدث مقارنة مكتملة للمقترحات لتتمكن الشركة من الرجوع إليها. لا تتوفر حاليًا قراءة السير الذاتية أو إنشاء الملفات الشخصية تلقائيًا بالذكاء الاصطناعي. لا نبيع بيانات المرشحين أو ملفات سيرهم الذاتية ولا نؤجرها للمعلنين. تستخدم الطلبات الموجهة لمزود الذكاء الاصطناعي بروتوكول HTTPS، وتخضع المعالجة لديه أيضًا لشروطه.' },
        ],
      },
      {
        id: 'visibility', title: { en: '3. Public & restricted information', ar: '٣. المعلومات العامة والمقيدة' },
        paragraphs: [
          { en: 'Published challenges, their company identity, public attachments, community questions, answers and public discussions are visible to visitors. Company contact details are displayed when the company chooses to share them. Proposals and attached CVs are available to the applicant and the company reviewing them, not the public feed.', ar: 'التحديات المنشورة وهوية شركاتها ومرفقاتها العامة وأسئلة المجتمع وإجاباته والنقاشات العامة متاحة للزوار. تظهر بيانات التواصل مع الشركة عندما تختار مشاركتها. تتاح المقترحات والسير الذاتية المرفقة للمتقدم والشركة التي تراجعها، ولا تظهر في المنشورات العامة.' },
          { en: 'Private challenge notes and files are restricted by account permissions to the company and selected applicant. Selection is not a verification of the applicant’s identity or credentials. Support messages and reports are kept out of public pages and are intended for the Rexios team’s review.', ar: 'تُقيد الملاحظات والملفات الخاصة بالتحدي بصلاحيات الحساب لتتاح للشركة والمتقدم المختار. لا يعني الاختيار التحقق من هوية المتقدم أو مؤهلاته. لا تظهر رسائل الدعم والبلاغات في الصفحات العامة وهي مخصصة لمراجعة فريق Rexios.' },
        ],
      },
      {
        id: 'security', title: { en: '4. Sessions & data protection', ar: '٤. الجلسات وحماية البيانات' },
        paragraphs: [
          { en: 'An essential session cookie keeps you signed in. Your language preference is stored in your browser. Passwords are stored as hashes, and access to restricted content is checked on the server. These measures do not constitute a guarantee that storage is encrypted or that a service cannot be compromised.', ar: 'يحافظ ملف ارتباط ضروري للجلسة على تسجيل دخولك، ويُحفظ اختيار اللغة في متصفحك. تُخزن كلمات المرور كبصمات مشفرة، ويتحقق الخادم من صلاحيات الوصول إلى المحتوى المقيد. لا تشكل هذه الإجراءات ضمانًا لتشفير التخزين أو لاستحالة اختراق الخدمة.' },
          { en: 'Keep highly sensitive industrial information out of this demonstration environment. Agree directly on confidentiality and data handling before sharing operational material.', ar: 'تجنب وضع المعلومات الصناعية شديدة الحساسية في هذه البيئة التجريبية. اتفق مباشرة على السرية وكيفية التعامل مع البيانات قبل مشاركة المواد التشغيلية.' },
        ],
      },
      {
        id: 'rights', title: { en: '5. Your data & support requests', ar: '٥. بياناتك وطلبات الدعم' },
        paragraphs: [
          { en: 'You can update supported profile fields in your account. To request access to, correction of, or deletion of account data, use Contact & Support and select Privacy & data. Requests are handled manually by the team. Do not send passwords, API keys or sensitive documents in a support message.', ar: 'يمكنك تعديل حقول الملف المتاحة من حسابك. لطلب الوصول إلى بيانات الحساب أو تصحيحها أو حذفها، استخدم صفحة التواصل والدعم واختر الخصوصية والبيانات. يتعامل الفريق مع الطلبات يدويًا. لا ترسل كلمات مرور أو مفاتيح واجهات برمجة أو مستندات حساسة في رسالة الدعم.' },
        ],
      },
    ],
  },
};
