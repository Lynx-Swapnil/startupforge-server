require("dotenv").config();
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.DB_URL);
async function listAll() {
  await client.connect();
  const db = client.db("startupforge");
  const collections = await db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));
  
  // Check each user-related collection
  for (const col of ["user", "users", "User", "account", "session"]) {
    try {
      const count = await db.collection(col).countDocuments();
      const docs = await db.collection(col).find({}).limit(3).toArray();
      console.log(`\n${col} (${count} docs):`, JSON.stringify(docs.map(d => ({ email: d.email, role: d.role, name: d.name })), null, 2));
    } catch(e) {}
  }
  await client.close();
}
listAll();
