const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();

const uri = process.env.MONGODB_URI;
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
    cors({
        credentials: true,
        origin: [process.env.CLIENT_URL],
    })
);
app.use(express.json());

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        const db = client.db("blood-donation-platform");

        const usersCollection = db.collection("user");
        const donationRequestCollection = db.collection("donationRequests");
        const fundingCollection = db.collection("fundings");


        // ==========================
        // POST FUNDING API
        // ==========================

        app.post("/api/funding", async (req, res) => {
            //   console.log("Funding API called");
            //   console.log(req.body);
            try {
                const { userEmail, amount, sessionId } = req.body;

                if (!userEmail || !amount || !sessionId) {
                    return res.status(400).json({
                        success: false,
                        message: "userEmail, amount and sessionId are required",
                    });
                }

                const existing = await fundingCollection.findOne({ sessionId });

                if (existing) {
                    return res.status(409).json({
                        success: false,
                        message: "Funding already recorded",
                    });
                }

                const result = await fundingCollection.insertOne({
                    userEmail,
                    amount: Number(amount),
                    sessionId,
                    createdAt: new Date(),
                });

                res.status(201).json({
                    success: true,
                    message: "Funding added successfully",
                    insertedId: result.insertedId,
                });
            } catch (error) {
                console.error("Error adding funding:", error);

                res.status(500).json({
                    success: false,
                    message: "Failed to add funding",
                });
            }
        });
        // ==========================
        // Transactions history API
        // ==========================
        app.get("/api/funding", async (req, res) => {
            try {
                const result = await fundingCollection
                    .find()
                    .sort({ createdAt: -1 })
                    .toArray();

                res.send(result);
            } catch (error) {
                res.status(500).send(error);
            }
        });

        // MongoDB deployment validation
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (err) {
        console.error("Failed to connect to MongoDB structural routine:", err);
    }
}

run().catch(console.dir);

// Base Routes
app.get("/", (req, res) => {
    res.send("Server is running fine!");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});