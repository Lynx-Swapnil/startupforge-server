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

// middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// JWT Middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "Unauthorized: No token" });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: "Forbidden: Invalid token" });
    req.user = decoded;
    next();
  });
};

// MongoDB
const uri = process.env.DB_URL;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("startupforge");
    const usersCollection = db.collection("user");
    const startupsCollection = db.collection("startups");
    const opportunitiesCollection = db.collection("opportunities");
    const applicationsCollection = db.collection("applications");
    const paymentsCollection = db.collection("payments");

    // JWT - Issue token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      }).send({ success: true });
    });

    // JWT - Clear token (logout)
    app.post("/logout", (req, res) => {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      }).send({ success: true });
    });

    // Test route
    app.get("/", (req, res) => {
      res.send("StartupForge server is running...");
    });

    // Stripe - Create checkout session
    app.post("/create-checkout-session", async (req, res) => {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: { name: "Premium Plan" },
              unit_amount: req.body.amount * 100,
            },
            quantity: 1,
          }],
          success_url: `${process.env.NEXT_PUBLIC_URL}/success`,
          cancel_url: `${process.env.NEXT_PUBLIC_URL}/cancel`,
        });
        res.json({ url: session.url });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Payments - Save
    app.post("/payments", verifyToken, async (req, res) => {
      try {
        const { userId, email, amount, sessionId, status } = req.body;
        const paymentEntry = { userId, user_email: email, amount, transaction_id: sessionId, payment_status: status, paid_at: new Date() };
        const result = await paymentsCollection.insertOne(paymentEntry);
        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (err) {
        res.status(500).send({ success: false, error: err.message });
      }
    });

    // Payments - Check premium
    app.get("/payments/check-premium/:userId", async (req, res) => {
      const payment = await paymentsCollection.findOne({ userId: req.params.userId });
      res.send({ isPremium: !!payment });
    });

    // Payments - Get all (Admin)
    app.get("/payments", verifyToken, async (req, res) => {
      try {
        const payments = await paymentsCollection.find().sort({ paid_at: -1 }).toArray();
        res.send(payments);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // Admin stats
    app.get("/admin/stats", verifyToken, async (req, res) => {
      const usersCount = await usersCollection.countDocuments();
      const startupsCount = await startupsCollection.countDocuments();
      const oppsCount = await opportunitiesCollection.countDocuments();
      const payments = await paymentsCollection.find().toArray();
      const revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      res.send({ users: usersCount, startups: startupsCount, opportunities: oppsCount, revenue });
    });

    // Admin revenue analytics
    app.get("/admin/revenue-analytics", verifyToken, async (req, res) => {
      try {
        const revenueData = await paymentsCollection.aggregate([
          { $match: { payment_status: "paid" } },
          { $group: { _id: { $dateToString: { format: "%b", date: "$paid_at" } }, totalRevenue: { $sum: "$amount" } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, name: "$_id", revenue: "$totalRevenue" } },
        ]).toArray();
        res.send(revenueData.length > 0 ? revenueData : []);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // Users - Get all
    app.get("/users", verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Users - Block/Unblock
    app.patch("/users/:id", verifyToken, async (req, res) => {
      const { isBlocked } = req.body;
      const result = await usersCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { isBlocked } });
      res.send({ success: true, result });
    });

    // Users - Delete
    app.delete("/users/:id", verifyToken, async (req, res) => {
      const result = await usersCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    });

    // Startups - Create (with status: pending)
    app.post("/startups", verifyToken, async (req, res) => {
      try {
        const data = req.body;
        const newStartup = { ...data, ownerId: data.ownerId, status: "pending", createdAt: new Date() };
        const result = await startupsCollection.insertOne(newStartup);
        res.send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Startups - Get all
    app.get("/startups", async (req, res) => {
      const result = await startupsCollection.find().toArray();
      res.send(result);
    });

    // Startups - Get by owner
    app.get("/startups/by-owner/:ownerId", async (req, res) => {
      try {
        const { ownerId } = req.params;
        const startups = await startupsCollection.find({ ownerId }).toArray();
        const opportunities = await opportunitiesCollection.find({ ownerId }).toArray();
        res.send({ success: true, startups, opportunities });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // Startups - Get single
    app.get("/startups/:id", async (req, res) => {
      try {
        const result = await startupsCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!result) return res.status(404).send({ message: "Startup not found" });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Server error", error });
      }
    });

    // Startups - Update
    app.put("/startups/:id", verifyToken, async (req, res) => {
      try {
        const { _id, ...updatedData } = req.body;
        const result = await startupsCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: updatedData });
        res.send({ success: true, modifiedCount: result.modifiedCount });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // Startups - Admin approve/reject
    app.patch("/startups/:id/status", verifyToken, async (req, res) => {
      try {
        const { status } = req.body;
        const result = await startupsCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status } });
        res.send({ success: true, modifiedCount: result.modifiedCount });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // Startups - Delete
    app.delete("/startups/:id", verifyToken, async (req, res) => {
      try {
        const result = await startupsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send({ success: true, deletedCount: result.deletedCount });
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });

    // Opportunities - Get with server-side search, filter, pagination
    app.get("/opportunities", async (req, res) => {
      try {
        const { ownerId, search, workType, industry, page = 1, limit = 6 } = req.query;
        const query = {};
        if (ownerId) query.ownerId = ownerId;
        if (search) {
          query.$or = [
            { roleTitle: { $regex: search, $options: "i" } },
            { requiredSkills: { $regex: search, $options: "i" } },
          ];
        }
        if (workType && workType !== "all") query.workType = { $in: [workType] };
        if (industry && industry !== "all") query.industry = { $in: [industry] };

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const total = await opportunitiesCollection.countDocuments(query);
        const result = await opportunitiesCollection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray();

        res.send({ opportunities: result, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Opportunities - Get single
    app.get("/opportunities/:id", async (req, res) => {
      try {
        const result = await opportunitiesCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!result) return res.status(404).send({ success: false, message: "Opportunity not found" });
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // Opportunities - Create
    app.post("/opportunities", verifyToken, async (req, res) => {
      try {
        const data = req.body;
        if (!data.roleTitle || !data.description) return res.status(400).send({ success: false, message: "Role Title and Description are required!" });
        const newOpportunity = { ...data, createdAt: new Date() };
        const result = await opportunitiesCollection.insertOne(newOpportunity);
        res.send({ success: true, insertedId: result.insertedId, message: "Opportunity added successfully!" });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // Opportunities - Update
    app.put("/opportunities/:id", verifyToken, async (req, res) => {
      try {
        const { _id, ...updatedData } = req.body;
        const result = await opportunitiesCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { ...updatedData, updatedAt: new Date() } });
        res.send({ success: true, modifiedCount: result.modifiedCount });
      } catch (err) {
        res.status(500).send({ success: false, message: err.message });
      }
    });

    // Opportunities - Delete
    app.delete("/opportunities/:id", verifyToken, async (req, res) => {
      try {
        const result = await opportunitiesCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send({ success: true, deletedCount: result.deletedCount });
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    // Applications - Submit
    app.post("/applications", verifyToken, async (req, res) => {
      const data = req.body;
      const exists = await applicationsCollection.findOne({ opportunityId: data.opportunityId, applicantEmail: data.applicantEmail });
      if (exists) return res.send({ success: false, message: "Already applied" });
      const newApp = { ...data, status: "Pending", appliedAt: new Date() };
      await applicationsCollection.insertOne(newApp);
      res.send({ success: true });
    });

    // Applications - By founder
    app.get("/applications/by-founder/:ownerId", verifyToken, async (req, res) => {
      const { ownerId } = req.params;
      const result = await applicationsCollection.aggregate([
        { $addFields: { opportunityObjId: { $toObjectId: "$opportunityId" } } },
        { $lookup: { from: "opportunities", localField: "opportunityObjId", foreignField: "_id", as: "job" } },
        { $unwind: "$job" },
        { $match: { "job.ownerId": ownerId } },
        { $project: { _id: 1, applicantName: 1, applicantEmail: 1, portfolio: 1, motivation: 1, status: 1, appliedAt: 1, jobTitle: "$job.roleTitle" } },
      ]).toArray();
      res.send(result);
    });

    // Applications - Update status
    app.patch("/applications/:id", verifyToken, async (req, res) => {
      const { status } = req.body;
      const result = await applicationsCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status } });
      res.send({ success: true, result });
    });

    // Applications - Check if applied
    app.get("/applications/check", async (req, res) => {
      const { jobId, email } = req.query;
      const exists = await applicationsCollection.findOne({ opportunityId: jobId, applicantEmail: email });
      res.send({ applied: !!exists });
    });

    // Applications - By user email
    app.get("/applications/by-user/:email", verifyToken, async (req, res) => {
      const { email } = req.params;
      const apps = await applicationsCollection.find({ applicantEmail: email }).toArray();
      const result = await Promise.all(apps.map(async (app) => {
        const job = await opportunitiesCollection.findOne({ _id: new ObjectId(app.opportunityId) });
        return { ...app, job };
      }));
      res.send(result);
    });

    // Only listen locally — Vercel handles this in production
    if (process.env.NODE_ENV !== "production") {
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    }
  } catch (error) {
    console.log("MONGO ERROR:", error);
  }
}

run();

// Export for Vercel serverless
module.exports = app;
