require("dotenv").config();
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.DB_URL);
async function cleanup() {
  await client.connect();
  const db = client.db("startupforge");
  const r1 = await db.collection("user").deleteOne({ email: "mr.admin123@gmail.com" });
  const r2 = await db.collection("account").deleteMany({ accountId: { $regex: "" } });
  console.log("Deleted user:", r1.deletedCount);
  await client.close();
}
cleanup();
