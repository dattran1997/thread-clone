/**
 * Prisma seed script — demo data for Threads Clone
 *
 * Run:
 *   npx prisma db seed
 *  — or —
 *   ts-node --project tsconfig.seed.json prisma/seed.ts
 *
 * All demo accounts use password: Demo1234!
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── helpers ──────────────────────────────────────────────────────────────────

const hr  = 60 * 60 * 1000;
const day = 24 * hr;
const now = Date.now();

function ago(ms: number) {
  return new Date(now - ms);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Seeding database…\n');

  // ── 0. CLEAN SLATE (makes seed idempotent / re-runnable) ────────────────────
  console.log('  → cleaning previous seed data');
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.threadLike.deleteMany();
  await prisma.threadRepost.deleteMany();
  await prisma.threadSave.deleteMany();
  await prisma.threadQuote.deleteMany();
  await prisma.threadHashtag.deleteMany();
  await prisma.mention.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.hashtag.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash('Demo1234!', 10);

  // ── 1. USERS ────────────────────────────────────────────────────────────────
  console.log('  → users');

  const [alice, bob, charlie, diana, edgar] = await Promise.all([
    prisma.user.upsert({
      where:  { email: 'alice@demo.com' },
      update: {},
      create: {
        email:        'alice@demo.com',
        username:     'alice',
        displayName:  'Alice Chen',
        passwordHash: hash,
        bio:          'Building the future, one commit at a time 🚀 | Ex-Google | Founder of @techforward',
        avatarUrl:    'https://i.pravatar.cc/150?u=alice@demo.com',
        isVerified:   true,
        emailVerified: true,
        links:        ['https://alicechen.dev', 'https://github.com/alice'],
        topics:       ['Technology', 'AI', 'Startups'],
        profile:      { create: { location: 'San Francisco, CA' } },
      },
    }),

    prisma.user.upsert({
      where:  { email: 'bob@demo.com' },
      update: {},
      create: {
        email:        'bob@demo.com',
        username:     'bob_dev',
        displayName:  'Bob Martinez',
        passwordHash: hash,
        bio:          'Full-stack dev ☕ Coffee addict. Making stuff on the internet | Open source enthusiast',
        avatarUrl:    'https://i.pravatar.cc/150?u=bob@demo.com',
        emailVerified: true,
        links:        ['https://github.com/bobm'],
        topics:       ['Development', 'Open Source', 'Coffee'],
        profile:      { create: { location: 'Austin, TX' } },
      },
    }),

    prisma.user.upsert({
      where:  { email: 'charlie@demo.com' },
      update: {},
      create: {
        email:        'charlie@demo.com',
        username:     'charlie_lens',
        displayName:  'Charlie Nguyen',
        passwordHash: hash,
        bio:          '📸 Street photographer & visual storyteller | Tokyo × NYC | Camera always in hand',
        avatarUrl:    'https://i.pravatar.cc/150?u=charlie@demo.com',
        emailVerified: true,
        topics:       ['Photography', 'Travel', 'Art'],
        profile:      { create: { location: 'New York, NY' } },
      },
    }),

    prisma.user.upsert({
      where:  { email: 'diana@demo.com' },
      update: {},
      create: {
        email:        'diana@demo.com',
        username:     'diana_codes',
        displayName:  'Diana Park',
        passwordHash: hash,
        bio:          'Senior SWE @ OpenAI 🤖 | TypeScript evangelist | She/her | prev: Meta, Stripe',
        avatarUrl:    'https://i.pravatar.cc/150?u=diana@demo.com',
        isVerified:   true,
        emailVerified: true,
        links:        ['https://dianapark.io', 'https://twitter.com/diana_codes'],
        topics:       ['AI', 'TypeScript', 'Career'],
        profile:      { create: { location: 'Seattle, WA' } },
      },
    }),

    prisma.user.upsert({
      where:  { email: 'edgar@demo.com' },
      update: {},
      create: {
        email:        'edgar@demo.com',
        username:     'edgar_eats',
        displayName:  'Edgar Williams',
        passwordHash: hash,
        bio:          '🍕 Food blogger & amateur chef | Finding hidden gems in every city | Chicago based',
        avatarUrl:    'https://i.pravatar.cc/150?u=edgar@demo.com',
        emailVerified: true,
        topics:       ['Food', 'Travel', 'Lifestyle'],
        profile:      { create: { location: 'Chicago, IL' } },
      },
    }),
  ]);

  // ── 2. FOLLOW GRAPH ─────────────────────────────────────────────────────────
  console.log('  → follows');

  const followPairs = [
    // alice is the most-followed
    { followerId: bob.id,     followingId: alice.id },
    { followerId: charlie.id, followingId: alice.id },
    { followerId: diana.id,   followingId: alice.id },
    { followerId: edgar.id,   followingId: alice.id },
    // alice follows back most people
    { followerId: alice.id,   followingId: bob.id },
    { followerId: alice.id,   followingId: charlie.id },
    { followerId: alice.id,   followingId: diana.id },
    { followerId: alice.id,   followingId: edgar.id },
    // mutual among the rest
    { followerId: charlie.id, followingId: bob.id },
    { followerId: bob.id,     followingId: charlie.id },
    { followerId: diana.id,   followingId: bob.id },
    { followerId: diana.id,   followingId: charlie.id },
    { followerId: edgar.id,   followingId: diana.id },
    { followerId: charlie.id, followingId: diana.id },
  ];

  await Promise.all(
    followPairs.map(({ followerId, followingId }) =>
      prisma.follow.upsert({
        where:  { followerId_followingId: { followerId, followingId } },
        update: {},
        create: { followerId, followingId, status: 'ACCEPTED' },
      }),
    ),
  );

  // Tally + persist follower counts
  const followerTally: Record<string, number> = {};
  for (const { followingId } of followPairs) {
    followerTally[followingId] = (followerTally[followingId] ?? 0) + 1;
  }
  await Promise.all(
    Object.entries(followerTally).map(([id, count]) =>
      prisma.user.update({ where: { id }, data: { followerCount: count } }),
    ),
  );

  // ── 3. HASHTAGS ─────────────────────────────────────────────────────────────
  console.log('  → hashtags');

  const tagNames = [
    'typescript', 'webdev', 'ai', 'photography',
    'food', 'opensource', 'startup', 'coffee', 'travel', 'nextjs',
  ];
  const hashtagRows = await Promise.all(
    tagNames.map((tag) =>
      prisma.hashtag.upsert({
        where:  { tag },
        update: {},
        create: { tag },
      }),
    ),
  );
  const hashtagMap: Record<string, string> = Object.fromEntries(
    hashtagRows.map((h) => [h.tag, h.id]),
  );

  // ── 4. THREADS ──────────────────────────────────────────────────────────────
  console.log('  → threads');

  // Helper — create a thread with optional hashtags and/or poll
  async function mkThread(opts: {
    authorId: string;
    text: string;
    tags?: string[];
    poll?: { options: string[]; expiresInHours: number };
    createdAt?: Date;
  }) {
    const thread = await prisma.thread.create({
      data: {
        authorId:  opts.authorId,
        text:      opts.text,
        createdAt: opts.createdAt ?? new Date(),

        hashtags: opts.tags?.length
          ? { create: opts.tags.map((tag) => ({ hashtagId: hashtagMap[tag] })) }
          : undefined,

        poll: opts.poll
          ? {
              create: {
                expiresAt: new Date(now + opts.poll.expiresInHours * hr),
                options:   {
                  create: opts.poll.options.map((text, i) => ({ text, order: i })),
                },
              },
            }
          : undefined,
      },
    });

    // Increment hashtag counters
    if (opts.tags?.length) {
      await Promise.all(
        opts.tags.map((tag) =>
          prisma.hashtag.update({
            where: { id: hashtagMap[tag] },
            data:  { threadCount: { increment: 1 } },
          }),
        ),
      );
    }

    return thread;
  }

  // ── alice ──
  const t1 = await mkThread({
    authorId: alice.id,
    text: `Just shipped real-time collaboration for @techforward 🎉 Six months in the making, dozens of false starts, one brilliant team. The CRDTs finally clicked. #startup #typescript`,
    tags: ['startup', 'typescript'],
    createdAt: ago(2 * hr),
  });

  const t2 = await mkThread({
    authorId: alice.id,
    text: `Hot take: the best AI products of the next 3 years won't be chatbots. They'll be invisible — woven into tools you already use every day. The interface wars are just beginning. #ai`,
    tags: ['ai'],
    createdAt: ago(5 * hr),
  });

  const t3 = await mkThread({
    authorId: alice.id,
    text: `What's your go-to stack for a new side project in 2026?`,
    tags: ['webdev', 'typescript'],
    poll: {
      options: ['Next.js + NestJS', 'SvelteKit + FastAPI', 'Remix + Hono', 'T3 Stack'],
      expiresInHours: 48,
    },
    createdAt: ago(1 * day),
  });

  const t16 = await mkThread({
    authorId: alice.id,
    text: `The open source community is carrying this entire industry on its back and we collectively don't compensate them enough. Find a project you depend on and support it. #opensource`,
    tags: ['opensource'],
    createdAt: ago(5 * day),
  });

  const t19 = await mkThread({
    authorId: alice.id,
    text: `Three things I wish I knew before starting a company:\n\n1. Distribution beats product in year one\n2. Your first hire defines your culture forever\n3. Revenue is not validation — retention is\n\n#startup`,
    tags: ['startup'],
    createdAt: ago(7 * day),
  });

  // ── bob ──
  const t4 = await mkThread({
    authorId: bob.id,
    text: `Finally migrated our entire codebase from JS to TypeScript strict mode. Took 3 weeks. Found 47 latent bugs in the process. Zero regrets. 💪 #typescript #webdev`,
    tags: ['typescript', 'webdev'],
    createdAt: ago(3 * hr),
  });

  const t5 = await mkThread({
    authorId: bob.id,
    text: `Unpopular opinion: you don't need a state management library for most React apps. useState + useContext + a well-designed custom hook gets you 90% of the way there. Fight me. #webdev`,
    tags: ['webdev'],
    createdAt: ago(6 * hr),
  });

  const t6 = await mkThread({
    authorId: bob.id,
    text: `Just brewed my first pour-over with Ethiopian Yirgacheffe I home-roasted myself. The depth of flavor is absolutely insane. Maybe I chose the wrong career 😂 #coffee`,
    tags: ['coffee'],
    createdAt: ago(2 * day),
  });

  const t17 = await mkThread({
    authorId: bob.id,
    text: `Deployed to prod on a Friday afternoon. Nothing broke. I'm retiring. It's all downhill from here. #webdev`,
    tags: ['webdev'],
    createdAt: ago(6 * day),
  });

  const t20 = await mkThread({
    authorId: bob.id,
    text: `The best debugging session is the one where you realise the bug is actually in your mental model, not the code. Spent 2 hours yesterday. One comment in the RFC would have saved it all. #webdev`,
    tags: ['webdev'],
    createdAt: ago(8 * day),
  });

  // ── charlie ──
  const t7 = await mkThread({
    authorId: charlie.id,
    text: `Early morning in Brooklyn. The light at 5:47 AM hits different. Sometimes the best shots happen before everyone else wakes up. 📸 #photography`,
    tags: ['photography'],
    createdAt: ago(4 * hr),
  });

  const t8 = await mkThread({
    authorId: charlie.id,
    text: `Film vs digital — which do you prefer for street photography?`,
    tags: ['photography'],
    poll: {
      options: ['Film — it has soul', 'Digital — practical', 'Both, mood-dependent'],
      expiresInHours: 24,
    },
    createdAt: ago(18 * hr),
  });

  const t9 = await mkThread({
    authorId: charlie.id,
    text: `Spent 3 weeks in Tokyo documenting the train system. The contrast between rush-hour chaos and the precise, almost ceremonial order of it all is endlessly fascinating. Already planning the next visit. #travel #photography`,
    tags: ['travel', 'photography'],
    createdAt: ago(3 * day),
  });

  const t21 = await mkThread({
    authorId: charlie.id,
    text: `Gear check: I've shot with $5k bodies and disposables from a gas station. The camera matters less than you think after the first year. Eyes, light, and patience — that's the trinity. #photography`,
    tags: ['photography'],
    createdAt: ago(4 * day),
  });

  // ── diana ──
  const t10 = await mkThread({
    authorId: diana.id,
    text: `TypeScript 5.8 just dropped and the performance improvements are very real. Compile time on our monorepo dropped ~30%. If you haven't upgraded yet, do it today. #typescript`,
    tags: ['typescript'],
    createdAt: ago(1 * hr),
  });

  const t11 = await mkThread({
    authorId: diana.id,
    text: `Working on LLMs has changed how I think about software interfaces entirely. We've spent 70 years designing for humans who adapt to computers. Now we can design for computers that adapt to humans. Wild times. #ai`,
    tags: ['ai'],
    createdAt: ago(8 * hr),
  });

  const t12 = await mkThread({
    authorId: diana.id,
    text: `PSA: if your PR description says "fixes bug", I'm sending it back. Write as if the reviewer has zero context — because they don't. Future-you will also thank you. #webdev`,
    tags: ['webdev'],
    createdAt: ago(2 * day),
  });

  const t18 = await mkThread({
    authorId: diana.id,
    text: `Reminder: "move fast and break things" was always terrible advice. The most impactful engineering teams I've worked with moved deliberately and built things that lasted. Real speed comes from not having to fix everything you broke. #startup #webdev`,
    tags: ['startup', 'webdev'],
    createdAt: ago(3 * day),
  });

  const t22 = await mkThread({
    authorId: diana.id,
    text: `Interviewing tip that nobody says: the best candidates I've hired asked better questions than I did. If you're not preparing thoughtful questions, you're leaving a huge signal on the table. #career`,
    createdAt: ago(9 * day),
  });

  // ── edgar ──
  const t13 = await mkThread({
    authorId: edgar.id,
    text: `Found a tiny Sicilian spot in Pilsen that makes sfincione better than anything I've had outside Palermo. No Instagram presence. Cash only. Packed every night. That's always the sign. 🍕 #food`,
    tags: ['food'],
    createdAt: ago(7 * hr),
  });

  const t14 = await mkThread({
    authorId: edgar.id,
    text: `Hot take: the best meal you'll ever have isn't at a Michelin-starred restaurant. It's at a 12-seat place run by one family, with a menu that changes based on what's fresh that morning. #food`,
    tags: ['food'],
    createdAt: ago(1 * day),
  });

  const t15 = await mkThread({
    authorId: edgar.id,
    text: `Road tripping from Chicago to New Orleans next month: Nashville → Memphis → NOLA. Drop your absolute must-eat spots for each city. I want the real ones, not the tourist traps. 👇 #food #travel`,
    tags: ['food', 'travel'],
    createdAt: ago(4 * day),
  });

  // ── 5. REPLIES ──────────────────────────────────────────────────────────────
  console.log('  → replies');

  const replies: Array<{
    authorId: string; text: string; parentId: string; rootId: string; createdAt: Date;
  }> = [
    // thread on t1 (alice's launch)
    {
      authorId: bob.id,
      text:     'Congrats! Real-time collab is such a hard problem to get right. How did you handle conflict resolution?',
      parentId: t1.id, rootId: t1.id,
      createdAt: ago(1.5 * hr),
    },
    // thread on t2 (alice's AI hot take)
    {
      authorId: diana.id,
      text:     'Completely agree. The best features are the ones users don\'t notice because they just work. That\'s the highest bar.',
      parentId: t2.id, rootId: t2.id,
      createdAt: ago(4.5 * hr),
    },
    // thread on t4 (bob's TS migration)
    {
      authorId: alice.id,
      text:     '47 bugs 😬 Which category were most of them? Null-checks or something sneakier?',
      parentId: t4.id, rootId: t4.id,
      createdAt: ago(2.5 * hr),
    },
    // thread on t5 (bob's opinion)
    {
      authorId: diana.id,
      text:     'Hard agree up to a point — once you hit async server state you\'re basically reinventing TanStack Query anyway.',
      parentId: t5.id, rootId: t5.id,
      createdAt: ago(5 * hr),
    },
    // thread on t9 (charlie's tokyo)
    {
      authorId: alice.id,
      text:     'These are stunning. The composition in the platform shot especially. What body are you shooting with these days?',
      parentId: t9.id, rootId: t9.id,
      createdAt: ago(2.8 * day),
    },
    // thread on t11 (diana's AI thought)
    {
      authorId: alice.id,
      text:     "This is the framing I've been looking for. Going to steal this for my next investor deck 🙏",
      parentId: t11.id, rootId: t11.id,
      createdAt: ago(7 * hr),
    },
    // thread on t15 (edgar's road trip)
    {
      authorId: diana.id,
      text:     'Cozy Corner BBQ in Memphis. Get there by 10 AM — they sell out by noon most days. Don\'t sleep on the half-slab.',
      parentId: t15.id, rootId: t15.id,
      createdAt: ago(3.8 * day),
    },
    {
      authorId: charlie.id,
      text:     'Nashville: Prince\'s Hot Chicken on 28th Ave. The medium is hotter than it should be legal to serve.',
      parentId: t15.id, rootId: t15.id,
      createdAt: ago(3.7 * day),
    },
    // thread on t17 (bob's friday deploy)
    {
      authorId: alice.id,
      text:     'Lmaooo the courage. Frame it.',
      parentId: t17.id, rootId: t17.id,
      createdAt: ago(5.9 * day),
    },
    {
      authorId: charlie.id,
      text:     'This is the kind of chad energy we all aspire to.',
      parentId: t17.id, rootId: t17.id,
      createdAt: ago(5.8 * day),
    },
  ];

  const createdReplies = await Promise.all(
    replies.map((r) => prisma.thread.create({ data: r })),
  );

  // Tally reply counts per parent
  const replyTally: Record<string, number> = {};
  for (const r of replies) {
    replyTally[r.parentId] = (replyTally[r.parentId] ?? 0) + 1;
  }
  await Promise.all(
    Object.entries(replyTally).map(([id, count]) =>
      prisma.thread.update({ where: { id }, data: { replyCount: { increment: count } } }),
    ),
  );

  // ── 6. LIKES ────────────────────────────────────────────────────────────────
  console.log('  → likes');

  const likePairs: Array<{ userId: string; threadId: string }> = [
    // t1 — alice's launch
    { userId: bob.id,     threadId: t1.id },
    { userId: charlie.id, threadId: t1.id },
    { userId: diana.id,   threadId: t1.id },
    { userId: edgar.id,   threadId: t1.id },
    // t2 — alice's AI hot take
    { userId: bob.id,     threadId: t2.id },
    { userId: diana.id,   threadId: t2.id },
    { userId: charlie.id, threadId: t2.id },
    { userId: edgar.id,   threadId: t2.id },
    // t4 — bob's TS migration
    { userId: alice.id,   threadId: t4.id },
    { userId: diana.id,   threadId: t4.id },
    { userId: charlie.id, threadId: t4.id },
    { userId: edgar.id,   threadId: t4.id },
    // t5 — bob's hot take
    { userId: alice.id,   threadId: t5.id },
    { userId: diana.id,   threadId: t5.id },
    { userId: charlie.id, threadId: t5.id },
    // t7 — charlie's photo
    { userId: alice.id,   threadId: t7.id },
    { userId: bob.id,     threadId: t7.id },
    { userId: diana.id,   threadId: t7.id },
    { userId: edgar.id,   threadId: t7.id },
    // t9 — charlie's tokyo
    { userId: alice.id,   threadId: t9.id },
    { userId: bob.id,     threadId: t9.id },
    { userId: edgar.id,   threadId: t9.id },
    { userId: diana.id,   threadId: t9.id },
    // t10 — diana's TS 5.8
    { userId: alice.id,   threadId: t10.id },
    { userId: bob.id,     threadId: t10.id },
    { userId: charlie.id, threadId: t10.id },
    // t11 — diana's AI thought
    { userId: alice.id,   threadId: t11.id },
    { userId: bob.id,     threadId: t11.id },
    { userId: charlie.id, threadId: t11.id },
    { userId: edgar.id,   threadId: t11.id },
    // t13 — edgar's food find
    { userId: alice.id,   threadId: t13.id },
    { userId: charlie.id, threadId: t13.id },
    { userId: diana.id,   threadId: t13.id },
    // t14 — edgar's hot take food
    { userId: alice.id,   threadId: t14.id },
    { userId: charlie.id, threadId: t14.id },
    { userId: bob.id,     threadId: t14.id },
    // t16 — alice's open source
    { userId: bob.id,     threadId: t16.id },
    { userId: diana.id,   threadId: t16.id },
    { userId: charlie.id, threadId: t16.id },
    // t17 — bob's friday deploy
    { userId: alice.id,   threadId: t17.id },
    { userId: diana.id,   threadId: t17.id },
    { userId: charlie.id, threadId: t17.id },
    { userId: edgar.id,   threadId: t17.id },
    // t18 — diana's move fast
    { userId: alice.id,   threadId: t18.id },
    { userId: bob.id,     threadId: t18.id },
    { userId: charlie.id, threadId: t18.id },
    { userId: edgar.id,   threadId: t18.id },
    // t19 — alice's founder tips
    { userId: bob.id,     threadId: t19.id },
    { userId: diana.id,   threadId: t19.id },
    { userId: charlie.id, threadId: t19.id },
    // t21 — charlie's gear check
    { userId: alice.id,   threadId: t21.id },
    { userId: edgar.id,   threadId: t21.id },
    // some reply likes
    { userId: alice.id,   threadId: createdReplies[0].id },
    { userId: diana.id,   threadId: createdReplies[0].id },
    { userId: alice.id,   threadId: createdReplies[8].id }, // "Frame it"
    { userId: charlie.id, threadId: createdReplies[8].id },
    { userId: edgar.id,   threadId: createdReplies[8].id },
  ];

  await Promise.all(
    likePairs.map(({ userId, threadId }) =>
      prisma.threadLike.upsert({
        where:  { userId_threadId: { userId, threadId } },
        update: {},
        create: { userId, threadId },
      }),
    ),
  );

  // Tally + persist like counts
  const likeTally: Record<string, number> = {};
  for (const { threadId } of likePairs) {
    likeTally[threadId] = (likeTally[threadId] ?? 0) + 1;
  }
  await Promise.all(
    Object.entries(likeTally).map(([id, count]) =>
      prisma.thread.update({ where: { id }, data: { likeCount: count } }),
    ),
  );

  // ── 7. POLL VOTES ────────────────────────────────────────────────────────────
  console.log('  → poll votes');

  // t3 — alice's stack poll (4 options)
  const t3Poll = await prisma.poll.findUnique({
    where:   { threadId: t3.id },
    include: { options: { orderBy: { order: 'asc' } } },
  });
  if (t3Poll) {
    const [opt0, opt1, opt2, opt3] = t3Poll.options; // Next.js, SvelteKit, Remix, T3
    const t3Votes = [
      { userId: bob.id,     pollOptionId: opt0.id },
      { userId: charlie.id, pollOptionId: opt2.id },
      { userId: diana.id,   pollOptionId: opt0.id },
      { userId: edgar.id,   pollOptionId: opt3.id },
    ];
    await Promise.all(
      t3Votes.map((v) =>
        prisma.pollVote.upsert({
          where:  { userId_pollOptionId: { userId: v.userId, pollOptionId: v.pollOptionId } },
          update: {},
          create: v,
        }),
      ),
    );
    const votesByOption: Record<string, number> = {};
    t3Votes.forEach(({ pollOptionId }) => {
      votesByOption[pollOptionId] = (votesByOption[pollOptionId] ?? 0) + 1;
    });
    await Promise.all(
      Object.entries(votesByOption).map(([id, count]) =>
        prisma.pollOption.update({ where: { id }, data: { voteCount: count } }),
      ),
    );
  }

  // t8 — charlie's film vs digital (3 options)
  const t8Poll = await prisma.poll.findUnique({
    where:   { threadId: t8.id },
    include: { options: { orderBy: { order: 'asc' } } },
  });
  if (t8Poll) {
    const [opt0, opt1, opt2] = t8Poll.options; // Film, Digital, Both
    const t8Votes = [
      { userId: alice.id,  pollOptionId: opt0.id },
      { userId: bob.id,    pollOptionId: opt1.id },
      { userId: diana.id,  pollOptionId: opt2.id },
      { userId: edgar.id,  pollOptionId: opt2.id },
    ];
    await Promise.all(
      t8Votes.map((v) =>
        prisma.pollVote.upsert({
          where:  { userId_pollOptionId: { userId: v.userId, pollOptionId: v.pollOptionId } },
          update: {},
          create: v,
        }),
      ),
    );
    const votesByOption: Record<string, number> = {};
    t8Votes.forEach(({ pollOptionId }) => {
      votesByOption[pollOptionId] = (votesByOption[pollOptionId] ?? 0) + 1;
    });
    await Promise.all(
      Object.entries(votesByOption).map(([id, count]) =>
        prisma.pollOption.update({ where: { id }, data: { voteCount: count } }),
      ),
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  console.log('\n✅  Seed complete!\n');
  console.log('Demo accounts  (password for all: Demo1234!)');
  console.log('─────────────────────────────────────────────');
  console.log('  alice@demo.com    →  @alice        ✓ verified');
  console.log('  bob@demo.com      →  @bob_dev');
  console.log('  charlie@demo.com  →  @charlie_lens');
  console.log('  diana@demo.com    →  @diana_codes  ✓ verified');
  console.log('  edgar@demo.com    →  @edgar_eats');
  console.log('─────────────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
