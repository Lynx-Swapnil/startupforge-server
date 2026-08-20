require("dotenv").config();
const { MongoClient } = require("mongodb");


const uri = process.env.DB_URL;
const client = new MongoClient(uri);

async function seed() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("startupforge");
    const usersCollection = db.collection("user");
    const startupsCollection = db.collection("startups");
    const opportunitiesCollection = db.collection("opportunities");
    const applicationsCollection = db.collection("applications");

    // ── CLEAR existing seed data ──────────────────────────
    await startupsCollection.deleteMany({ _seeded: true });
    await opportunitiesCollection.deleteMany({ _seeded: true });
    await applicationsCollection.deleteMany({ _seeded: true });
    console.log("Cleared old seed data");

    // ── SEED STARTUPS ─────────────────────────────────────
    const startups = await startupsCollection.insertMany([
      {
        name: "EcoTrack",
        industry: "Climate Tech",
        description: "EcoTrack helps businesses measure and reduce their carbon footprint using AI-powered analytics and real-time reporting dashboards.",
        fundingStage: "Seed",
        founderEmail: "alice@ecotrack.io",
        logoUrl: "https://ui-avatars.com/api/?name=EcoTrack&background=22c55e&color=fff&size=128",
        status: "approved",
        ownerId: "seed-founder-1",
        createdAt: new Date(),
        _seeded: true,
      },
      {
        name: "MediLink",
        industry: "HealthTech",
        description: "MediLink connects patients with specialists via a telemedicine platform powered by AI triage and smart appointment scheduling.",
        fundingStage: "Pre-Seed",
        founderEmail: "bob@medilink.health",
        logoUrl: "https://ui-avatars.com/api/?name=MediLink&background=6366f1&color=fff&size=128",
        status: "approved",
        ownerId: "seed-founder-2",
        createdAt: new Date(),
        _seeded: true,
      },
      {
        name: "FinEdge",
        industry: "FinTech",
        description: "FinEdge is a next-generation personal finance platform that uses ML to automate budgeting, investing, and tax optimization for millennials.",
        fundingStage: "Series A",
        founderEmail: "carol@finedge.io",
        logoUrl: "https://ui-avatars.com/api/?name=FinEdge&background=f59e0b&color=fff&size=128",
        status: "approved",
        ownerId: "seed-founder-3",
        createdAt: new Date(),
        _seeded: true,
      },
      {
        name: "SpaceBase",
        industry: "Deep Tech",
        description: "SpaceBase builds low-cost CubeSat constellations to provide real-time Earth observation data for agriculture, logistics, and defense sectors.",
        fundingStage: "Seed",
        founderEmail: "dan@spacebase.io",
        logoUrl: "https://ui-avatars.com/api/?name=SpaceBase&background=8b5cf6&color=fff&size=128",
        status: "pending",
        ownerId: "seed-founder-4",
        createdAt: new Date(),
        _seeded: true,
      },
      {
        name: "LearnSpark",
        industry: "EdTech",
        description: "LearnSpark gamifies K-12 STEM education with adaptive learning paths, live coding challenges, and real-world project simulations.",
        fundingStage: "Pre-Seed",
        founderEmail: "emma@learnspark.io",
        logoUrl: "https://ui-avatars.com/api/?name=LearnSpark&background=ec4899&color=fff&size=128",
        status: "approved",
        ownerId: "seed-founder-5",
        createdAt: new Date(),
        _seeded: true,
      },
      {
        name: "BuildFast",
        industry: "SaaS",
        description: "BuildFast is a no-code SaaS builder that lets non-technical founders launch and monetize their web apps in under 48 hours.",
        fundingStage: "Seed",
        founderEmail: "frank@buildfast.io",
        logoUrl: "https://ui-avatars.com/api/?name=BuildFast&background=0ea5e9&color=fff&size=128",
        status: "approved",
        ownerId: "seed-founder-6",
        createdAt: new Date(),
        _seeded: true,
      },
    ]);
    console.log(`Seeded ${startups.insertedCount} startups`);

    // ── SEED OPPORTUNITIES ────────────────────────────────
    const opps = await opportunitiesCollection.insertMany([
      {
        roleTitle: "Senior Frontend Developer",
        requiredSkills: "React, Next.js, Tailwind CSS, TypeScript",
        workType: "Remote",
        commitment: "Full-time",
        deadline: "2026-09-30",
        description: "Build beautiful, performant UI components for our climate dashboard using React and Next.js.",
        startupName: "EcoTrack",
        ownerId: "seed-founder-1",
        createdAt: new Date(),
        _seeded: true,
      },
      {
        roleTitle: "Backend Engineer",
        requiredSkills: "Node.js, MongoDB, REST API, AWS",
        workType: "Remote",
        commitment: "Full-time",
        deadline: "2026-09-15",
        description: "Design and maintain our high-availability API infrastructure handling millions of requests per day.",
        startupName: "EcoTrack",
        ownerId: "seed-founder-1",
        createdAt: new Date(Date.now() - 86400000),
        _seeded: true,
      },
      {
        roleTitle: "AI/ML Engineer",
        requiredSkills: "Python, TensorFlow, NLP, LLM",
        workType: "Hybrid",
        commitment: "Full-time",
        deadline: "2026-10-01",
        description: "Build AI triage models and patient risk scoring systems to assist doctors in real-time diagnosis.",
        startupName: "MediLink",
        ownerId: "seed-founder-2",
        createdAt: new Date(Date.now() - 172800000),
        _seeded: true,
      },
      {
        roleTitle: "Product Designer",
        requiredSkills: "Figma, UI/UX, Prototyping, Design Systems",
        workType: "Remote",
        commitment: "Part-time",
        deadline: "2026-09-20",
        description: "Create user-centric designs for our mobile-first telemedicine experience.",
        startupName: "MediLink",
        ownerId: "seed-founder-2",
        createdAt: new Date(Date.now() - 259200000),
        _seeded: true,
      },
      {
        roleTitle: "Blockchain Developer",
        requiredSkills: "Solidity, Web3.js, Ethereum, Smart Contracts",
        workType: "Remote",
        commitment: "Full-time",
        deadline: "2026-10-15",
        description: "Develop smart contracts for our decentralized investment rounds and equity tracking system.",
        startupName: "FinEdge",
        ownerId: "seed-founder-3",
        createdAt: new Date(Date.now() - 345600000),
        _seeded: true,
      },
      {
        roleTitle: "Growth Hacker / Marketing Lead",
        requiredSkills: "SEO, Content Marketing, Paid Ads, Analytics",
        workType: "Remote",
        commitment: "Part-time",
        deadline: "2026-09-10",
        description: "Drive user acquisition and growth through data-driven marketing campaigns.",
        startupName: "LearnSpark",
        ownerId: "seed-founder-5",
        createdAt: new Date(Date.now() - 432000000),
        _seeded: true,
      },
      {
        roleTitle: "Mobile Developer (React Native)",
        requiredSkills: "React Native, Expo, iOS, Android",
        workType: "On-site",
        commitment: "Full-time",
        deadline: "2026-09-25",
        description: "Build and ship cross-platform mobile apps for our gamified learning platform.",
        startupName: "LearnSpark",
        ownerId: "seed-founder-5",
        createdAt: new Date(Date.now() - 518400000),
        _seeded: true,
      },
      {
        roleTitle: "DevOps Engineer",
        requiredSkills: "Docker, Kubernetes, CI/CD, AWS",
        workType: "Remote",
        commitment: "Contract",
        deadline: "2026-10-30",
        description: "Set up and manage our cloud infrastructure, CI/CD pipelines, and monitoring systems.",
        startupName: "BuildFast",
        ownerId: "seed-founder-6",
        createdAt: new Date(Date.now() - 604800000),
        _seeded: true,
      },
    ]);
    console.log(`Seeded ${opps.insertedCount} opportunities`);

    // ── SEED APPLICATIONS ─────────────────────────────────
    const oppIds = Object.values(opps.insertedIds);
    await applicationsCollection.insertMany([
      {
        opportunityId: oppIds[0].toString(),
        applicantName: "Sarah Chen",
        applicantEmail: "sarah@example.com",
        portfolio: "https://sarahchen.dev",
        motivation: "I am passionate about climate tech and have 5 years of React experience at top startups.",
        status: "Pending",
        appliedAt: new Date(),
        _seeded: true,
      },
      {
        opportunityId: oppIds[0].toString(),
        applicantName: "James Park",
        applicantEmail: "james@example.com",
        portfolio: "https://jamespark.io",
        motivation: "EcoTrack's mission aligns perfectly with my values. I'd love to contribute my Next.js expertise.",
        status: "Accepted",
        appliedAt: new Date(Date.now() - 86400000),
        _seeded: true,
      },
      {
        opportunityId: oppIds[2].toString(),
        applicantName: "Priya Sharma",
        applicantEmail: "priya@example.com",
        portfolio: "https://github.com/priya-ml",
        motivation: "I have worked on NLP systems at Google Health. This role perfectly matches my experience.",
        status: "Pending",
        appliedAt: new Date(Date.now() - 172800000),
        _seeded: true,
      },
    ]);
    console.log("Seeded 3 applications");

    console.log("\n✅ Database seeded successfully!");
    console.log("\n📋 Summary:");
    console.log("  - 6 Startups (5 approved, 1 pending)");
    console.log("  - 8 Opportunities across different startups");
    console.log("  - 3 Applications");
    console.log("\n🔐 NEXT STEP: Register on your live site, then run set-admin.js to make yourself admin");

  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await client.close();
  }
}

seed();
