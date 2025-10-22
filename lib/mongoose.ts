import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
    console.warn("[mongoose] MONGODB_URI is not set. Add it to your .env file.");
}

let cached = (global as any).mongoose as { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectMongo() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose
            .connect(MONGODB_URI, {
                dbName: process.env.MONGODB_DB || undefined,
            })
            .then((m) => m);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}
