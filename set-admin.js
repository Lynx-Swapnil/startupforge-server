require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.DB_URL;
const client = new MongoClient(uri);

async function setAdmin() {
  await client.connect();
  const db = client.db("startupforge");
  const usersCollection = db.collection("user");

  const adminEmail = "mr.admin123@gmail.com";
  const result = await usersCollection.updateOne(
    { email: adminEmail },
    { $set: { role: "admin" } }
  );

  if (result.modifiedCount > 0) {
    console.log(`✅ Successfully set ${adminEmail} as admin!`);
  } else {
    console.log(`❌ User not found. Make sure you registered on the site first with ${adminEmail}`);
  }
  await client.close();
}

setAdmin();
