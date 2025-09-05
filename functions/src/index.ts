import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// Create a router for API routes
const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.use("/api", router);

export const api = onRequest({
  region: "europe-west1",
}, app);