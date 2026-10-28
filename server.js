require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
app.use(express.json({ limit: "20kb" }));

// Serve the frontend from /public.
app.use(express.static(path.join(__dirname, "public")));

const transactionSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    type: {
      type: String,
      required: true,
      enum: ["income", "expense"]
    }
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

let connectionPromise;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Add it to your .env file.");
  }
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    }).catch((err) => {
      connectionPromise = null;
      throw err;
    });
  }
  await connectionPromise;
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

// Health check: visit /api/health to verify the backend is running.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "not connected"
  });
});

// GET: load saved transactions from MongoDB.
app.get("/api/transactions", asyncHandler(async (req, res) => {
  await connectToDatabase();
  const transactions = await Transaction.find().sort({ createdAt: -1 }).lean();
  res.json(transactions);
}));

// POST: save a new transaction.
app.post("/api/transactions", asyncHandler(async (req, res) => {
  await connectToDatabase();

  const description = typeof req.body.description === "string"
    ? req.body.description.trim()
    : "";
  const amount = Number(req.body.amount);
  const type = req.body.type;

  if (!description) {
    return res.status(400).json({ message: "Description is required." });
  }
  if (description.length > 120) {
    return res.status(400).json({ message: "Description must be 120 characters or fewer." });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "Amount must be a positive number." });
  }
  if (!["income", "expense"].includes(type)) {
    return res.status(400).json({ message: "Type must be income or expense." });
  }

  const transaction = await Transaction.create({ description, amount, type });
  res.status(201).json(transaction);
}));

// DELETE: remove one transaction by its MongoDB ID.
app.delete("/api/transactions/:id", asyncHandler(async (req, res) => {
  await connectToDatabase();

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid transaction ID." });
  }

  const deleted = await Transaction.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "Transaction not found." });
  }
  res.json({ message: "Transaction deleted." });
}));

// DELETE: remove all transactions.
app.delete("/api/transactions", asyncHandler(async (req, res) => {
  await connectToDatabase();
  const result = await Transaction.deleteMany({});
  res.json({ message: "All transactions deleted.", deletedCount: result.deletedCount });
}));

// API errors return JSON; don't expose connection strings or internal details.
app.use((err, req, res, next) => {
  console.error("API error:", err.message);
  if (res.headersSent) return next(err);
  const status = err.name === "ValidationError" ? 400 : 500;
  res.status(status).json({
    message: status === 400 ? "The transaction data is invalid." :
      "Server error. Check the server logs and MongoDB connection settings."
  });
});

module.exports = app;

// Run locally with `npm start`. Vercel imports the app without opening a port.
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Budgetly backend running at http://localhost:${port}`);
  });
}