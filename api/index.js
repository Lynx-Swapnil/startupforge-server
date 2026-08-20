const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// ── Middleware ─────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.NEXT_PUBLIC_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
}));

// ── JWT Middleware ─────────────────────────────────────────
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "Unauthorized: No token" });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: "Forbidden: Invalid token" });
    req.user = decoded;
    next();
  });
};

// ── MongoDB lazy connection ────────────────────────────────
const uri = process.env.DB_URL;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let db;
async function getDB() {
  if (!db) {
    await client.connect();
    db = client.db("startupforge");
  }
  return db;
}

// ── Helper to get collections ──────────────────────────────
async function getCollections() {
  const database = await getDB();
  return {
    usersCollection: database.collection("user"),
    startupsCollection: database.collection("startups"),
    opportunitiesCollection: database.collection("opportunities"),
    applicationsCollection: database.collection("applications"),
    paymentsCollection: database.collection("payments"),
  };
}

// ══════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════

app.get("/", (req, res) => res.send("StartupForge server is running..."));

// ── JWT ───────────────────────────────────────────────────
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  }).send({ success: true });
});

app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  }).send({ success: true });
});

// ── Stripe ────────────────────────────────────────────────
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{ price_data: { currency: "usd", product_data: { name: "Premium Plan" }, unit_amount: req.body.amount * 100 }, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/cancel`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Payments ──────────────────────────────────────────────
app.post("/payments", verifyToken, async (req, res) => {
  try {
    const { paymentsCollection } = await getCollections();
    const { userId, email, amount, sessionId, status } = req.body;
    const result = await paymentsCollection.insertOne({ userId, user_email: email, amount, transaction_id: sessionId, payment_status: status, paid_at: new Date() });
    res.status(201).send({ success: true, insertedId: result.insertedId });
  } catch (err) {
    res.status(500).send({ success: false, error: err.message });
  }
});

app.get("/payments/check-premium/:userId", async (req, res) => {
  try {
    const { paymentsCollection } = await getCollections();
    const payment = await paymentsCollection.findOne({ userId: req.params.userId });
    res.send({ isPremium: !!payment });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get("/payments", verifyToken, async (req, res) => {
  try {
    const { paymentsCollection } = await getCollections();
    const payments = await paymentsCollection.find().sort({ paid_at: -1 }).toArray();
    res.send(payments);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// ── Admin Stats ───────────────────────────────────────────
app.get("/admin/stats", verifyToken, async (req, res) => {
  try {
    const { usersCollection, startupsCollection, opportunitiesCollection, paymentsCollection } = await getCollections();
    const usersCount = await usersCollection.countDocuments();
    const startupsCount = await startupsCollection.countDocuments();
    const oppsCount = await opportunitiesCollection.countDocuments();
    const payments = await paymentsCollection.find().toArray();
    const revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    res.send({ users: usersCount, startups: startupsCount, opportunities: oppsCount, revenue });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get("/admin/revenue-analytics", verifyToken, async (req, res) => {
  try {
    const { paymentsCollection } = await getCollections();
    const revenueData = await paymentsCollection.aggregate([
      { $match: { payment_status: "paid" } },
      { $group: { _id: { $dateToString: { format: "%b", date: "$paid_at" } }, totalRevenue: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, name: "$_id", revenue: "$totalRevenue" } },
    ]).toArray();
    res.send(revenueData);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// ── Users ─────────────────────────────────────────────────
app.get("/users", verifyToken, async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    res.send(await usersCollection.find().toArray());
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.patch("/users/:id", verifyToken, async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const result = await usersCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { isBlocked: req.body.isBlocked } });
    res.send({ success: true, result });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.delete("/users/:id", verifyToken, async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    res.send(await usersCollection.deleteOne({ _id: new ObjectId(req.params.id) }));
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// ── Startups ──────────────────────────────────────────────
app.get("/startups", async (req, res) => {
  try {
    const { startupsCollection } = await getCollections();
    res.send(await startupsCollection.find().toArray());
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get("/startups/by-owner/:ownerId", async (req, res) => {
  try {
    const { startupsCollection, opportunitiesCollection } = await getCollections();
    const startups = await startupsCollection.find({ ownerId: req.params.ownerId }).toArray();
    const opportunities = await opportunitiesCollection.find({ ownerId: req.params.ownerId }).toArray();
    res.send({ success: true, startups, opportunities });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});

app.get("/startups/:id", async (req, res) => {
  try {
    const { startupsCollection } = await getCollections();
    const result = await startupsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!result) return res.status(404).send({ message: "Startup not found" });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Server error" });
  }
});

app.post("/startups", verifyToken, async (req, res) => {
  try {
    const { startupsCollection } = await getCollections();
    const result = await startupsCollection.insertOne({ ...req.body, status: "pending", createdAt: new Date() });
    res.send({ success: true, insertedId: result.insertedId });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.put("/startups/:id", verifyToken, async (req, res) => {
  try {
    const { startupsCollection } = await getCollections();
    const { _id, ...data } = req.body;
    const result = await startupsCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: data });
    res.send({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.patch("/startups/:id/status", verifyToken, async (req, res) => {
  try {
    const { startupsCollection } = await getCollections();
    const result = await startupsCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: req.body.status } });
    res.send({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.delete("/startups/:id", verifyToken, async (req, res) => {
  try {
    const { startupsCollection } = await getCollections();
    res.send(await startupsCollection.deleteOne({ _id: new ObjectId(req.params.id) }));
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// ── Opportunities ─────────────────────────────────────────
app.get("/opportunities", async (req, res) => {
  try {
    const { opportunitiesCollection } = await getCollections();
    const { ownerId, search, workType, industry, page = 1, limit = 6 } = req.query;
    const query = {};
    if (ownerId) query.ownerId = ownerId;
    if (search) query.$or = [{ roleTitle: { $regex: search, $options: "i" } }, { requiredSkills: { $regex: search, $options: "i" } }];
    if (workType && workType !== "all") query.workType = { $in: [workType] };
    if (industry && industry !== "all") query.industry = { $in: [industry] };
    const pageNum = parseInt(page), limitNum = parseInt(limit);
    const total = await opportunitiesCollection.countDocuments(query);
    const result = await opportunitiesCollection.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).toArray();
    res.send({ opportunities: result, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.get("/opportunities/:id", async (req, res) => {
  try {
    const { opportunitiesCollection } = await getCollections();
    const result = await opportunitiesCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!result) return res.status(404).send({ message: "Not found" });
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.post("/opportunities", verifyToken, async (req, res) => {
  try {
    const { opportunitiesCollection } = await getCollections();
    const result = await opportunitiesCollection.insertOne({ ...req.body, createdAt: new Date() });
    res.send({ success: true, insertedId: result.insertedId, message: "Opportunity added!" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.put("/opportunities/:id", verifyToken, async (req, res) => {
  try {
    const { opportunitiesCollection } = await getCollections();
    const { _id, ...data } = req.body;
    const result = await opportunitiesCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { ...data, updatedAt: new Date() } });
    res.send({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.delete("/opportunities/:id", verifyToken, async (req, res) => {
  try {
    const { opportunitiesCollection } = await getCollections();
    res.send(await opportunitiesCollection.deleteOne({ _id: new ObjectId(req.params.id) }));
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// ── Applications ──────────────────────────────────────────
app.get("/applications/check", async (req, res) => {
  try {
    const { applicationsCollection } = await getCollections();
    const exists = await applicationsCollection.findOne({ opportunityId: req.query.jobId, applicantEmail: req.query.email });
    res.send({ applied: !!exists });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get("/applications/by-founder/:ownerId", verifyToken, async (req, res) => {
  try {
    const { applicationsCollection } = await getCollections();
    const result = await applicationsCollection.aggregate([
      { $addFields: { opportunityObjId: { $toObjectId: "$opportunityId" } } },
      { $lookup: { from: "opportunities", localField: "opportunityObjId", foreignField: "_id", as: "job" } },
      { $unwind: "$job" },
      { $match: { "job.ownerId": req.params.ownerId } },
      { $project: { _id: 1, applicantName: 1, applicantEmail: 1, portfolio: 1, motivation: 1, status: 1, appliedAt: 1, jobTitle: "$job.roleTitle" } },
    ]).toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get("/applications/by-user/:email", verifyToken, async (req, res) => {
  try {
    const { applicationsCollection, opportunitiesCollection } = await getCollections();
    const apps = await applicationsCollection.find({ applicantEmail: req.params.email }).toArray();
    const result = await Promise.all(apps.map(async (a) => {
      const job = await opportunitiesCollection.findOne({ _id: new ObjectId(a.opportunityId) });
      return { ...a, job };
    }));
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.post("/applications", verifyToken, async (req, res) => {
  try {
    const { applicationsCollection } = await getCollections();
    const exists = await applicationsCollection.findOne({ opportunityId: req.body.opportunityId, applicantEmail: req.body.applicantEmail });
    if (exists) return res.send({ success: false, message: "Already applied" });
    await applicationsCollection.insertOne({ ...req.body, status: "Pending", appliedAt: new Date() });
    res.send({ success: true });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.patch("/applications/:id", verifyToken, async (req, res) => {
  try {
    const { applicationsCollection } = await getCollections();
    const result = await applicationsCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: req.body.status } });
    res.send({ success: true, result });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// ── Start locally ──────────────────────────────────────────
if (require.main === module) {
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;
