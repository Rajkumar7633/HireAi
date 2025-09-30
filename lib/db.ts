import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
}

let cached = (global as any).mongoose

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose
    })
  }
  cached.conn = await cached.promise
  return cached.conn
}

// This file is kept for compatibility but will use MongoDB instead
export const db = {
  // Legacy compatibility - actual operations handled by MongoDB models
}

export async function fetchFromApi(path: string, options?: RequestInit) {
  const response = await fetch(path, options)
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || `API call to ${path} failed with status ${response.status}`)
  }
  return response.json()
}
