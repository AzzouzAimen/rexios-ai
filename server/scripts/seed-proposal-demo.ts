import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
export const proposalDemoId = 'demo-proposal-comparison';
export async function seedProposalDemo(client: PrismaClient = db) {
  const owner = await client.user.findUnique({ where: { email: 'c@demo.test' } });
  if (!owner || owner.role !== 'COMPANY') throw new Error('Seed the normal demo accounts first; c@demo.test must be a company.');
  const passwordHash = await hash(process.env.DEMO_PASSWORD || '123', 12);
  await client.problem.upsert({ where: { id: proposalDemoId }, update: {}, create: {
    id: proposalDemoId, companyUserId: owner.id, status: 'OPEN', category: 'CHALLENGE', difficulty: 'medium', budgetDzd: 120000,
    deadlineAt: new Date(Date.now() + 30 * 86400000),
    title: 'سجل عيوب الخياطة دون اتصال', titleEn: 'Offline stitching defect log',
    summary: 'تسجيل عيوب 12 محطة خياطة محليًا وتصدير تقرير CSV يومي.', summaryEn: 'Log defects locally for 12 sewing stations and export a daily CSV report.',
    description: 'يسجل المشرف عيوب الخياطة على الورق. نحتاج أداة رقمية تسجل المحطة ونوع العيب والتاريخ، تحفظ البيانات محليًا وتصدر CSV يوميًا. شبكة المصنع غير مستقرة؛ يجب أن يعمل التسجيل والتصدير دون اتصال. لا صور ولا رؤية حاسوبية. مدة النموذج المستهدفة أربعة أسابيع.',
    descriptionEn: 'A supervisor records seam defects on paper. Build a digital tool recording station, defect type and date, retaining records locally and exporting daily CSV reports. The workshop network is unreliable: recording and export must work offline. No images or computer vision. Target prototype delivery is four weeks.',
    deliverables: ['نموذج إدخال للمحطة والعيب والتاريخ.', 'سجل محلي يمكن استرجاعه بعد إعادة التشغيل.', 'تقرير CSV يومي.'],
    deliverablesEn: ['Entry form for station, defect type and date.', 'Local history retained across restarts.', 'Daily CSV report.'],
    constraints: ['التسجيل والتصدير دون إنترنت.', 'دعم 12 محطة.', 'لا حاجة إلى صور أو كاميرات.'], constraintsEn: ['Recording and export must work offline.', 'Support 12 stations.', 'No images or cameras required.'],
    criteria: ['تسجيل العيوب واسترجاعها بعد إعادة التشغيل.', 'تصدير CSV صالح دون شبكة.', 'اختبار الحقول المطلوبة.'], criteriaEn: ['Record defects and recover them after restart.', 'Export a valid CSV without a network.', 'Test required-field validation.'], skills: ['REACT', 'SQL'],
  } });
  const people = [
    { first: 'أمينة', last: 'بن علي', en: 'Amina', surname: 'Benali', skills: ['REACT', 'SQL'], days: 24,
      ar: 'أقترح واجهة React محلية مع خدمة على حاسوب المشرف وقاعدة SQLite. يحفظ النموذج رقم المحطة ونوع العيب والتاريخ ويتحقق من الحقول المطلوبة. يبقى السجل بعد إعادة التشغيل ويصدر CSV يوميًا دون إنترنت. سأختبر المحطات الاثنتي عشرة مع فصل الشبكة وإعادة تشغيل الحاسوب، وأتحقق من الحقول والتصدير. أحتاج توضيح سياسة النسخ الاحتياطي قبل التنفيذ.',
      text: 'I propose a local React interface with a service on the supervisor’s computer and SQLite storage. The form records station, defect type and date with required-field validation. History survives restarts and exports daily CSV without internet. I will test all 12 stations with the network disconnected and the computer restarted, and verify validation and export. I need clarification on backup policy.' },
    { first: 'يوسف', last: 'مراد', en: 'Youssef', surname: 'Mourad', skills: ['PYTHON', 'SQL'], days: 21,
      ar: 'سأبني أداة Python تسجل رقم المحطة ونوع العيب والتاريخ في قاعدة SQL وتعرض ملخصًا يوميًا وتصدر CSV. أبدأ بنموذج صغير ثم أجربه مع المشرف وأضيف التحقق من الحقول. سأوفر دليل استخدام قصير. لم أحدد بعد مكان استضافة الخدمة وطريقة تشغيلها عند انقطاع الشبكة.',
      text: 'I will build a Python tool that records station, defect type and date in a SQL database, displays a daily summary and exports CSV. I will start with a small prototype, test it with the supervisor and add field validation. A short user guide is included. I have not yet defined where the service is hosted or how it operates during network outages.' },
    { first: 'نادية', last: 'خليل', en: 'Nadia', surname: 'Khalil', skills: ['REACT', 'SQL'], days: 14,
      ar: 'أقترح لوحة React مرتبطة بقاعدة بيانات مستضافة في السحابة لتسجيل عيوب المحطات الاثنتي عشرة وتوليد تقارير CSV. أضيف مخططات يومية والتحقق من الإدخال. يتطلب تسجيل العيوب وتصدير التقارير اتصالًا دائمًا بالإنترنت. سأختبر الواجهة على المتصفح وأوفر عرضًا تجريبيًا مستضافًا.',
      text: 'I propose a React dashboard connected to a cloud-hosted database to log defects for all 12 stations and generate CSV reports. I will add daily charts and input validation. Recording defects and exporting reports require a permanent internet connection. I will test the browser interface and provide a hosted demonstration.' },
    { first: 'بلال', last: 'سعيد', en: 'Bilal', surname: 'Said', skills: ['REACT', 'SQL', 'PYTHON'], days: 7,
      ar: 'أجيد React وSQL وPython ويمكنني تقديم حل احترافي وسهل الاستخدام لمشكلتكم في وقت قصير. سأعمل بجد على المشروع وأتواصل مع الفريق باستمرار. أحتاج إلى مناقشة المتطلبات التفصيلية قبل تحديد طريقة التخزين وآلية العمل دون اتصال والاختبارات.',
      text: 'I know React, SQL and Python and can deliver a professional, easy-to-use solution quickly. I will work hard on the project and communicate regularly with your team. I need to discuss the detailed requirements before defining storage, offline operation and testing.' },
  ];
  await client.$transaction(async tx => {
    for (const [index, person] of people.entries()) {
      const userId = `demo-comparison-talent-${index + 1}`;
      await tx.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, email: `p${index + 1}@demo.test`, role: 'TALENT', displayName: `${person.first} ${person.last}`, displayNameEn: `${person.en} ${person.surname}`, passwordHash,
        talent: { create: { firstName: person.first, lastName: person.last, firstNameEn: person.en, lastNameEn: person.surname, educationLevel: 'مهندس دولة', institutionMajor: 'هندسة البرمجيات', institutionMajorEn: 'Software engineering', experienceLevel: '1–3 سنوات خبرة', skills: person.skills, githubUrl: `https://example.com/demo/proposal-${index + 1}` } } } });
      await tx.application.upsert({ where: { problemId_applicantUserId: { problemId: proposalDemoId, applicantUserId: userId } }, update: {}, create: {
        id: `demo-comparison-application-${index + 1}`, problemId: proposalDemoId, applicantUserId: userId, coverMessage: person.ar, coverMessageEn: person.text, deliveryDays: person.days, consent: true, status: 'UNDER_REVIEW',
        submittedAt: new Date(Date.now() - (4 - index) * 3600000), createdAt: new Date(Date.now() - (4 - index) * 3600000),
      } });
    }
  });
  console.log(`Proposal demo ready: ${proposalDemoId} (company c@demo.test). Existing records and decisions were preserved.`);
}
if (require.main === module) seedProposalDemo().catch(() => { console.error('Proposal demo seed failed. Check database access and the demo company account.'); process.exitCode = 1; }).finally(() => db.$disconnect());
