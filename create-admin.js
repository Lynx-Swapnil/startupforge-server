require("dotenv").config();
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const uri = process.env.DB_URL;
const client = new MongoClient(uri);

async function createAdmin() {
  await client.connect();
  const db = client.db("startupforge");

  const adminEmail = "mr.admin123@gmail.com";
  const adminPassword = "Admin@1234";
  const adminName = "Admin";

  // Check if user already exists
  const existing = await db.collection("user").findOne({ email: adminEmail });
  if (existing) {
    // Just update role to admin
    await db.collection("user").updateOne({ email: adminEmail }, { $set: { role: "admin" } });
    console.log(`✅ Updated existing user to admin: ${adminEmail}`);
    await client.close();
    return;
  }

  // Create user in better-auth format
  const userId = crypto.randomUUID();
  const now = new Date();

  await db.collection("user").insertOne({
    id: userId,
    name: adminName,
    email: adminEmail,
    emailVerified: true,
    image: `https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff`,
    role: "admin",
    isBlocked: false,
    createdAt: now,
    updatedAt: now,
  });

  // Create account with hashed password (better-auth format)
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await db.collection("account").insertOne({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId: userId,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });

  console.log("✅ Admin user created successfully!");
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Role: admin`);

  await client.close();
}

createAdmin().catch(console.error);
