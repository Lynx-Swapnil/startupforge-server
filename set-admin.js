require("dotenv").config();
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.DB_URL);
async function setAdmin() {
  await client.connect();
  const db = client.db("startupforge");
  // Set ALL registered users as admin for now
  const r1 = await db.collection("user").updateOne(
    { email: "lynxswapnil@gmail.com" },
    { $set: { role: "admin" } }
  );
  const r2 = await db.collection("user").updateOne(
    { email: "mr.admin123@gmail.com" },
    { $set: { role: "admin" } }
  );
  console.log("lynxswapnil@gmail.com updated:", r1.modifiedCount > 0 ? "✅ Made admin" : "❌ Not found");
  console.log("mr.admin123@gmail.com updated:", r2.modifiedCount > 0 ? "✅ Made admin" : "❌ Not found yet");
  await client.close();
}
setAdmin();
