/**
 * Splash AI — seed script
 *
 * Creates a demo user, a course, two materials (chunked + embedded if an
 * OPENAI_API_KEY is available), and one sample quiz.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@splash.ai";
const DEMO_PASSWORD = "demo1234";

const STRATEGY_PRIMER = `
# Strategy Primer — Business Management 101

Business strategy is the set of decisions a firm makes to create and sustain a
competitive advantage in its market. A useful starting point is Porter's Five
Forces, a framework that identifies the structural drivers of industry
profitability.

The five forces are:
1. Rivalry among existing competitors — how intensely firms compete on price,
   features, and service.
2. Threat of new entrants — how easily newcomers can set up and erode profits.
3. Threat of substitute products or services.
4. Bargaining power of suppliers.
5. Bargaining power of buyers.

A firm can seek advantage by either cost leadership (lowest sustainable cost) or
differentiation (offering something buyers will pay more for). Stuck-in-the-
middle firms often underperform because they lack a clear position.

SWOT analysis — Strengths, Weaknesses, Opportunities, Threats — is a simpler
tool used to map internal capabilities against external conditions. Unlike
Porter's Five Forces, it is descriptive rather than predictive; it should
inform strategic choice rather than replace it.
`.trim();

const ORG_BEHAVIOUR_PRIMER = `
# Organisational Behaviour — Week 1

Organisational behaviour (OB) studies how individuals, groups, and structures
shape behaviour within organisations. Its goal is to apply this knowledge to
improve organisational effectiveness.

Three levels of analysis:
- Individual: personality, motivation, perception, attitudes.
- Group: teams, leadership, communication, conflict, power.
- Organisational: structure, culture, change, human resource policy.

Herzberg's two-factor theory distinguishes hygiene factors (pay, working
conditions — absence causes dissatisfaction) from motivators (achievement,
recognition — presence causes satisfaction). Improving hygiene alone does not
motivate; motivators must be present.

Maslow's hierarchy of needs orders human needs from physiological and safety
needs at the base, through belongingness and esteem, to self-actualisation at
the top. Managers should recognise that individuals operate at different levels
and adjust management style accordingly.

Organisational culture is the shared assumptions, values, and norms that guide
behaviour. Schein describes three layers: artifacts (visible, e.g. dress code),
espoused values (what the organisation says it believes), and basic
underlying assumptions (what is truly believed).
`.trim();

async function main() {
  console.log("🌱 Seeding Splash AI…");

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo Student",
      hashedPassword,
    },
  });

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      level: "INTERMEDIATE",
      preferredLength: "NORMAL",
    },
  });

  const course = await prisma.course.upsert({
    where: { id: "seed-bus-101" },
    update: {},
    create: {
      id: "seed-bus-101",
      title: "Business Management 101",
      code: "BUS101",
      degree: "BSc Business Management",
      year: 1,
      semester: 1,
      lecturer: "Prof. Ada Lovelace",
      ownerId: user.id,
      enrollments: { create: { userId: user.id } },
    },
  });

  const canEmbed = Boolean(process.env.OPENAI_API_KEY);

  const materials = [
    { filename: "strategy-primer.md", content: STRATEGY_PRIMER },
    { filename: "org-behaviour-week1.md", content: ORG_BEHAVIOUR_PRIMER },
  ];

  for (const m of materials) {
    const existing = await prisma.courseMaterial.findFirst({
      where: { courseId: course.id, filename: m.filename },
    });
    if (existing) continue;

    const material = await prisma.courseMaterial.create({
      data: {
        courseId: course.id,
        filename: m.filename,
        mimeType: "text/markdown",
        size: Buffer.byteLength(m.content, "utf-8"),
        storageKey: `seed/${m.filename}`,
        status: canEmbed ? "PROCESSING" : "READY",
      },
    });

    if (canEmbed) {
      try {
        const { chunkText } = await import("../src/services/chunkingService");
        const { embedBatch, toPgVectorLiteral } = await import(
          "../src/services/embeddingService"
        );
        const chunks = chunkText(m.content);
        const embeddings = await embedBatch(chunks.map((c) => c.content));

        await prisma.materialChunk.createMany({
          data: chunks.map((c) => ({
            materialId: material.id,
            chunkIndex: c.chunkIndex,
            content: c.content,
            tokenCount: c.tokenCount,
          })),
        });
        for (let i = 0; i < chunks.length; i++) {
          const literal = toPgVectorLiteral(embeddings[i]);
          await prisma.$executeRaw(
            Prisma.sql`
              UPDATE "MaterialChunk"
              SET embedding = ${Prisma.raw(`'${literal}'`)}::vector
              WHERE "materialId" = ${material.id} AND "chunkIndex" = ${chunks[i].chunkIndex}
            `
          );
        }

        await prisma.courseMaterial.update({
          where: { id: material.id },
          data: { status: "READY" },
        });
        console.log(`  · embedded ${m.filename} (${chunks.length} chunks)`);
      } catch (err) {
        await prisma.courseMaterial.update({
          where: { id: material.id },
          data: {
            status: "FAILED",
            error: err instanceof Error ? err.message.slice(0, 500) : "Embedding failed",
          },
        });
        console.warn(`  · could not embed ${m.filename}:`, err);
      }
    } else {
      console.log(`  · seeded ${m.filename} (no OPENAI_API_KEY — chunks not embedded)`);
    }
  }

  // Sample quiz (5 MCQs on the seeded material)
  const existingQuiz = await prisma.quiz.findFirst({
    where: { userId: user.id, courseId: course.id },
  });
  if (!existingQuiz) {
    await prisma.quiz.create({
      data: {
        userId: user.id,
        courseId: course.id,
        title: "Strategy & OB fundamentals",
        topic: "Business foundations",
        questions: {
          create: [
            {
              order: 0,
              type: "MCQ",
              prompt: "Which of Porter's Five Forces captures how intensely firms compete on price and features?",
              options: [
                "Threat of new entrants",
                "Rivalry among existing competitors",
                "Bargaining power of suppliers",
                "Threat of substitute products",
              ],
              correctAnswer: "Rivalry among existing competitors",
              explanation:
                "Porter defines rivalry as the competitive intensity between firms already in the industry, driven by factors like number of competitors, product differentiation, and exit barriers.",
              topic: "Porter's Five Forces",
            },
            {
              order: 1,
              type: "MCQ",
              prompt: "According to Porter, firms that pursue neither cost leadership nor clear differentiation tend to:",
              options: [
                "Outperform the market",
                "Attract the largest customer base",
                "Be 'stuck in the middle' and underperform",
                "Automatically become price setters",
              ],
              correctAnswer: "Be 'stuck in the middle' and underperform",
              explanation:
                "Porter argues a firm must commit to a generic strategy — cost leadership or differentiation. Firms hedging between the two lack a clear competitive position and typically underperform.",
              topic: "Generic strategies",
            },
            {
              order: 2,
              type: "MCQ",
              prompt: "In Herzberg's two-factor theory, which of the following is classified as a hygiene factor?",
              options: [
                "Recognition for good work",
                "Pay and working conditions",
                "Opportunities for achievement",
                "Responsibility on the job",
              ],
              correctAnswer: "Pay and working conditions",
              explanation:
                "Hygiene factors (pay, conditions, company policies) prevent dissatisfaction when adequate but do not actively motivate. Motivators (achievement, recognition, responsibility) drive satisfaction.",
              topic: "Herzberg two-factor theory",
            },
            {
              order: 3,
              type: "MCQ",
              prompt: "Which level of Maslow's hierarchy sits at the very top?",
              options: ["Safety needs", "Belongingness", "Esteem", "Self-actualisation"],
              correctAnswer: "Self-actualisation",
              explanation:
                "Maslow placed self-actualisation — realising one's potential — at the top of the pyramid, above physiological, safety, belongingness, and esteem needs.",
              topic: "Maslow's hierarchy",
            },
            {
              order: 4,
              type: "MCQ",
              prompt: "Schein's model of organisational culture describes three layers. The deepest layer is:",
              options: [
                "Artifacts",
                "Espoused values",
                "Basic underlying assumptions",
                "Written policies",
              ],
              correctAnswer: "Basic underlying assumptions",
              explanation:
                "Schein distinguishes visible artifacts (surface), espoused values (what the organisation says), and basic underlying assumptions (deeply held beliefs) — the last being the deepest and hardest to change.",
              topic: "Schein's culture model",
            },
          ],
        },
      },
    });
    console.log("  · created sample quiz (5 MCQs)");
  }

  console.log(`✅ Seed complete. Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
