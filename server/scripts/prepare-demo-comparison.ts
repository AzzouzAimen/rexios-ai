import 'reflect-metadata';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadAiEnvironment } from '../src/ai/ai.environment';
import { ProposalComparisonService } from '../src/ai/proposal-comparison.service';
import { accountInclude, type PrismaService } from '../src/database/prisma.service';

// Use the real comparison workflow, including validation, freshness and persistence.
// No synthetic ranking is inserted. Existing fresh results are reused.
async function main() {
  loadAiEnvironment();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const owner = await db.user.findUnique({ where: { email: 'c@demo.test' }, include: accountInclude });
    if (!owner || owner.role !== 'COMPANY') throw new Error('The demo company account is missing.');
    const service = new ProposalComparisonService(db as PrismaService);
    const id = 'demo-proposal-comparison';
    let state = await service.get(owner, id);
    if (!state.canCompare) throw new Error('The demo requires an open challenge with at least two pending proposals. Decisions will not be reset.');
    if (!state.comparison || state.stale) {
      if (!process.env.FEATHERLESS_API_KEY?.trim()) throw new Error('Configure FEATHERLESS_API_KEY in the server environment first.');
      console.log('Generating a real demo comparison. This may take a couple of minutes.');
      state = await service.generate(owner, id, 'en', {
        signal: AbortSignal.timeout(Number(process.env.AI_REQUEST_TIMEOUT_MS) || 180000),
        progress: event => { if (event.type === 'phase') console.log(`Phase: ${event.phase}`); },
      });
    }
    console.log(JSON.stringify({ problemId: id, pending: state.pendingCount, saved: !!state.comparison, stale: state.stale, generatedAt: state.comparison?.generatedAt }));
  } finally { await db.$disconnect(); }
}
if (require.main === module) main().catch(() => {
  console.error('Could not prepare the demo comparison. Check database access, demo state and AI configuration; existing proposals and decisions were preserved.');
  process.exitCode = 1;
});
