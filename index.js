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