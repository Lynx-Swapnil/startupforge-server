require("dotenv").config();
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.DB_URL);
async function listUsers() {
  await client.connect();
  const db = client.db("startupforge");
  const users = await db.collection("user").find({}).toArray();
  console.log("All users in DB:", JSON.stringify(users.map(u => ({ id: u.id, email: u.email, role: u.role, name: u.name })), null, 2));
  await client.close();
}
listUsers();
