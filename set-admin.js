require("dotenv").config();
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.DB_URL);

async function setAdmin() {
  await client.connect();
  const db = client.db("startupforge");

  // Make mr.admin123@gmail.com the ONLY admin
  const r1 = await db.collection("user").updateOne(
    { email: "mr.admin123@gmail.com" },
    { $set: { role: "admin" } }
  );

  // Demote lynxswapnil@gmail.com back to regular Founder
  const r2 = await db.collection("user").updateOne(
    { email: "lynxswapnil@gmail.com" },
    { $set: { role: "Founder" } }
  );

  console.log("mr.admin123@gmail.com → admin:", r1.modifiedCount > 0 ? "✅ Done" : "❌ Not found (register first)");
  console.log("lynxswapnil@gmail.com  → Founder:", r2.modifiedCount > 0 ? "✅ Done" : "⚠️ Not found");

  await client.close();
}

setAdmin();
