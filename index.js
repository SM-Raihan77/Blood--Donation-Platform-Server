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




        // ==========================
        // CREATE DONATION REQUEST
        // ==========================
        app.post("/api/donation-requests", async (req, res) => {
            try {
                const donationRequest = {
                    ...req.body,
                    status: "pending",
                    createdAt: new Date(),
                };

                const result = await donationRequestCollection.insertOne(donationRequest);

                res.status(201).send({
                    success: true,
                    message: "Donation request created successfully",
                    insertedId: result.insertedId,
                });
            } catch (error) {
                console.error("Error creating donation request:", error);

                res.status(500).send({
                    success: false,
                    message: "Failed to create donation request",
                    error: error.message,
                });
            }
        });



        // ==========================
        // GET ALL DONATION REQUESTS
        // ==========================
        app.get("/api/donation-requests", async (req, res) => {
            try {
                const { status, page = 1, limit } = req.query;


                const query = {};

                if (status) {
                    query.status = status;
                }

                const total = await donationRequestCollection.countDocuments(query);

                let cursor = donationRequestCollection
                    .find(query)
                    .sort({ createdAt: -1 });

                // Pagination
                if (limit) {
                    const skip = (Number(page) - 1) * Number(limit);

                    cursor = cursor
                        .skip(skip)
                        .limit(Number(limit));
                }

                const result = await cursor.toArray();

                res.send({
                    success: true,
                    data: result,
                    total,
                    currentPage: Number(page),
                    totalPages: limit
                        ? Math.ceil(total / Number(limit))
                        : 1,
                });

            } catch (error) {
                console.error("Error fetching donation requests:", error);

                res.status(500).send({
                    success: false,
                    message: "Failed to fetch donation requests",
                    error: error.message,
                });
            }
        });
        // ==========================
        // GET SINGLE DONATION REQUEST BY ID
        // ==========================
        app.get("/api/donation-requests/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const query = { _id: new ObjectId(id) };
                const result = await donationRequestCollection.findOne(query);

                if (!result) {
                    return res.status(404).send({
                        success: false,
                        message: "Donation request not found",
                    });
                }

                res.send({ success: true, data: result });
            } catch (error) {
                console.error("Error fetching single donation request:", error);
                res.status(500).send({
                    success: false,
                    message: "Failed to fetch donation request",
                    error: error.message,
                });
            }
        });

        // ==========================
        // GET MY DONATION REQUESTS
        // ==========================
        app.get("/api/my-donation-requests", async (req, res) => {
            try {
                const { email, page = 1, limit } = req.query;
                console.log("Email:", email);
                console.log("Page:", page);
                console.log("Limit:", limit);

                if (!email) {
                    return res.status(400).send({
                        success: false,
                        message: "Email is required",
                    });
                }

                const query = { requesterEmail: email };


                const total = await donationRequestCollection.countDocuments(query);


                let cursor = donationRequestCollection
                    .find(query)
                    .sort({ createdAt: -1 });

                if (limit) {
                    const skip = (Number(page) - 1) * Number(limit);

                    cursor = cursor
                        .skip(skip)
                        .limit(Number(limit));
                }

                const result = await cursor.toArray();
                console.log("Fetched Documents:", result.length);
                console.log("Total Pages:", limit ? Math.ceil(total / Number(limit)) : 1);

                res.send({
                    success: true,
                    data: result,
                    total,
                    currentPage: Number(page),
                    totalPages: limit
                        ? Math.ceil(total / Number(limit))
                        : 1,
                });

            } catch (error) {
                console.error("Error fetching my donation requests:", error);

                res.status(500).send({
                    success: false,
                    message: "Failed to fetch my donation requests",
                    error: error.message,
                });
            }
        });


        // ==========================
        // UPDATE (FULL) DONATION REQUEST
        // ==========================
        app.put("/api/donation-requests/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const updatedData = req.body;
                const {
                    recipientName, district, upazila, hospitalName,
                    fullAddress, bloodGroup, donationDate, donationTime,
                    requestMessage, status,
                } = updatedData;

                if (
                    !recipientName || !district || !upazila || !hospitalName ||
                    !fullAddress || !bloodGroup || !donationDate ||
                    !donationTime || !requestMessage
                ) {
                    return res.status(400).send({
                        success: false,
                        message: "All required fields must be provided",
                    });
                }

                const allowedStatuses = ["pending", "inprogress", "done", "canceled"];
                if (status && !allowedStatuses.includes(status)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid status value",
                    });
                }

                const updateDoc = {
                    $set: {
                        recipientName, district, upazila, hospitalName,
                        fullAddress, bloodGroup, donationDate, donationTime,
                        requestMessage,
                        status: status || "pending",
                        updatedAt: new Date(),
                    },
                };

                const result = await donationRequestCollection.updateOne(
                    { _id: new ObjectId(id) },
                    updateDoc
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "Donation request not found",
                    });
                }

                res.send({ success: true, message: "Donation request updated successfully" });
            } catch (error) {
                console.error("Error updating donation request:", error);
                res.status(500).send({
                    success: false,
                    message: "Failed to update donation request",
                    error: error.message,
                });
            }
        });

        // ==========================
        // DELETE DONATION REQUEST
        // ==========================
        app.delete("/api/donation-requests/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const result = await donationRequestCollection.deleteOne({
                    _id: new ObjectId(id),
                });

                if (result.deletedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "Donation request not found",
                    });
                }

                res.send({ success: true, message: "Donation request deleted successfully" });
            } catch (error) {
                console.error("Error deleting donation request:", error);
                res.status(500).send({
                    success: false,
                    message: "Failed to delete donation request",
                    error: error.message,
                });
            }
        });



        // ==========================
        // UPDATE DONATION REQUEST STATUS
        // ==========================
        app.patch("/api/donation-requests/:id/status", async (req, res) => {
            try {
                const { id } = req.params;
                const { status } = req.body;
                const allowedStatuses = ["pending", "inprogress", "done", "canceled"];

                if (!allowedStatuses.includes(status)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid status value",
                    });
                }

                const result = await donationRequestCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status } }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "Donation request not found",
                    });
                }

                res.send({ success: true, message: `Donation request status updated to ${status}` });
            } catch (error) {
                console.error("Error updating donation request status:", error);
                res.status(500).send({
                    success: false,
                    message: "Failed to update donation request status",
                    error: error.message,
                });
            }
        });
        // ==========================
        // GET SINGLE USER BY EMAIL 
        // ==========================
        app.get("/api/users/:email", async (req, res) => {
            try {
                const { email } = req.params;
                const cleanEmail = email.trim().toLowerCase(); // Safe extraction

                const result = await usersCollection.findOne({ email: cleanEmail });

                if (!result) {
                    return res.status(404).send({
                        success: false,
                        message: "User not found",
                    });
                }

                res.send({ success: true, data: result });
            } catch (error) {
                console.error("Error fetching user:", error);
                return res.status(500).send({
                    success: false,
                    message: "Failed to fetch user",
                    error: error.message,
                });
            }
        });

        // ===================================
        // UPDATE USER PROFILE 
        // ===================================
        app.patch("/api/users/:email", async (req, res) => {
            try {
                const { email } = req.params;
                const cleanEmail = email.trim().toLowerCase();

                const payload = req.body;


                const allowedFields = [
                    "name", "image", "phone", "gender", "bloodGroup",
                    "district", "upazila", "role", "status"
                ];

                const updateDoc = {};


                for (const field of allowedFields) {
                    if (payload[field] !== undefined) {
                        updateDoc[field] = payload[field];
                    }
                }

                if (Object.keys(updateDoc).length === 0) {
                    return res.status(400).json({ success: false, message: "No valid fields provided" });
                }

                updateDoc.updatedAt = new Date();

                const result = await usersCollection.updateOne(
                    { email: cleanEmail },
                    { $set: updateDoc }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "User not found",
                    });
                }

                return res.json({ success: true, message: "User updated successfully" });

            } catch (error) {
                console.error("Error updating user profile:", error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to update profile",
                });
            }
        });


        // ==========================
        // MongoDB deployment validation
        // ==========================
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