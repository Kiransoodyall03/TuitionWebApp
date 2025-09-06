import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { confirmBooking } from "./bookings/confirm";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// Add logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Create a router for API routes
const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// Booking confirmation endpoint
router.post("/bookings/confirm", confirmBooking);

// Mount all routes under /api
app.use("/api", router);

// Simple 404 handler
app.use((req, res) => {
  console.log(`404 - Path not found: ${req.path}`);
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method
  });
});

export const api = onRequest({
  region: "europe-west1"
}, app);