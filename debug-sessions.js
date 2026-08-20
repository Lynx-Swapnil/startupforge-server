require("dotenv").config();
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.DB_URL);
async function check() {
  await client.connect();
  const db = client.db("startupforge");
  
  // Show raw session docs
  const sessions = await db.collection("session").find({}).toArray();
  console.log("Sessions:", JSON.stringify(sessions, null, 2));
  
  await client.close();
}
check();
