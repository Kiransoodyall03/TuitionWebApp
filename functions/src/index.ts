import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

// Test with just one import first
import {microsoftLogin} from "./auth/login";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// Test with just one route
app.get("/auth/microsoft/login", microsoftLogin);

// Add a basic health check
app.get("/health", (req, res) => {
  res.json({status: "ok", timestamp: new Date().toISOString()});
});

export const api = onRequest({
  region: "europe-west1",
}, app);