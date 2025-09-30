// import mongoose from "mongoose"
// Ensure all models are registered on cold start before any populate calls
import "@/models/register"
// const MONGODB_URI = process.env.MONGODB_URI

// if (!MONGODB_URI) {
//   throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
// }

// let cached = (global as any).mongoose

// if (!cached) {
//   cached = (global as any).mongoose = { conn: null, promise: null }
// }

// // Only use valid Mongoose options
// mongoose.set("bufferCommands", false)
mongoose.set("strictPopulate", false)
// Allow population of paths not explicitly in schema (helps during gradual schema alignment)
mongoose.set("strictPopulate", false)

// export async function connectDB() {
//   // Always check connection state first
//   if (cached.conn && cached.conn.connection.readyState === 1) {
//     return cached.conn
//   }

//   // Reset if connection is not ready
//   if (cached.conn && cached.conn.connection.readyState !== 1) {
//     cached.conn = null
//     cached.promise = null
//   }

//   if (!cached.promise) {
//     const opts = {
//       serverSelectionTimeoutMS: 10000, // 10 seconds
//       socketTimeoutMS: 30000, // 30 seconds
//       connectTimeoutMS: 10000, // 10 seconds
//       maxPoolSize: 5,
//       minPoolSize: 1,
//       maxIdleTimeMS: 30000,
//       retryWrites: true,
//       retryReads: true,
//       bufferCommands: false,
//       directConnection: true, // For localhost
//     }

//     console.log("Attempting to connect to MongoDB...")
//     console.log("Connection URI:", MONGODB_URI.replace(/\/\/.*@/, "//***:***@"))

//     cached.promise = mongoose
//       .connect(MONGODB_URI!, opts)
//       .then((mongoose) => {
//         console.log("Connected to MongoDB successfully")
//         console.log("Database host:", mongoose.connection.host)
//         console.log("Database name:", mongoose.connection.name)
//         console.log("Connection state:", mongoose.connection.readyState)

//         mongoose.connection.on("error", (error) => {
//           console.error("MongoDB connection error:", error)
//           cached.conn = null
//           cached.promise = null
//         })

//         mongoose.connection.on("disconnected", () => {
//           console.warn("MongoDB disconnected")
//           cached.conn = null
//           cached.promise = null
//         })

//         mongoose.connection.on("reconnected", () => {
//           console.log("MongoDB reconnected")
//         })

//         return mongoose
//       })
//       .catch((error) => {
//         console.error("MongoDB connection error:", error.message)
//         cached.promise = null
//         throw error
//       })
//   }

//   try {
//     cached.conn = await cached.promise

//     if (cached.conn.connection.readyState !== 1) {
//       throw new Error(`Connection not ready. State: ${cached.conn.connection.readyState}`)
//     }

//     return cached.conn
//   } catch (e) {
//     cached.promise = null
//     cached.conn = null
//     console.error("Failed to connect to MongoDB:", e)
//     throw e
//   }
// }

// export async function ensureConnection(retries = 3) {
//   for (let i = 0; i < retries; i++) {
//     try {
//       const conn = await connectDB()
//       if (conn.connection.readyState === 1) {
//         console.log(`Database connection established (attempt ${i + 1})`)
//         return conn
//       }
//       throw new Error(`Connection not ready. State: ${conn.connection.readyState}`)
//     } catch (error) {
//       console.error(`Connection attempt ${i + 1} failed:`, error)
//       if (i === retries - 1) throw error

//       cached.conn = null
//       cached.promise = null

//       const delay = 2000 * (i + 1)
//       console.log(`Retrying in ${delay}ms...`)
//       await new Promise((resolve) => setTimeout(resolve, delay))
//     }
//   }
//   throw new Error("Failed to establish database connection after retries")
// }

// export async function executeQuery<T>(
//   queryFn: () => Promise<T>,
//   queryName = 'query',
//   maxRetries = 2
// ): Promise<T> {
//   let lastError: any

//   for (let attempt = 1; attempt <= maxRetries; attempt++) {
//     try {
//       console.log(`${queryName} (attempt ${attempt})`)

//       // Ensure fresh connection
//       const conn = await ensureConnection()

//       if (conn.connection.readyState !== 1) {
//         throw new Error(`Database not ready. State: ${conn.connection.readyState}`)
//       }

//       // Create timeout promise
//       const timeoutMs = 25000
//       const timeoutPromise = new Promise<never>((_, reject) => {
//         setTimeout(() => {
//           reject(new Error(`Query timeout after ${timeoutMs}ms`))
//         }, timeoutMs)
//       })

//       const result = await Promise.race([
//         queryFn(),
//         timeoutPromise
//       ])

//       console.log(`${queryName} completed successfully`)
//       return result

//     } catch (error: any) {
//       lastError = error
//       console.error(`${queryName} attempt ${attempt} failed:`, error.message)

//       if (attempt === maxRetries) {
//         console.error(`All ${queryName} attempts failed`)
//         break
//       }

//       // Reset connection on any error
//       cached.conn = null
//       cached.promise = null

//       // Close existing connection if it exists
//       if (mongoose.connection.readyState !== 0) {
//         try {
//           await mongoose.connection.close()
//         } catch (closeError) {
//           console.log("Connection close error (ignoring):", closeError)
//         }
//       }

//       await new Promise(resolve => setTimeout(resolve, 3000))
//     }
//   }

//   console.log(`Returning empty result due to failed ${queryName}`)
//   throw lastError || new Error(`Query ${queryName} failed after ${maxRetries} attempts`)
// }


import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
}

let cached = (global as any).mongoose

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

mongoose.set("bufferCommands", false)

export async function connectDB() {
  // Always check connection state first
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn
  }

  // Reset if connection is not ready
  if (cached.conn && cached.conn.connection.readyState !== 1) {
    cached.conn = null
    cached.promise = null
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 60000, // 60 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10, // Increased pool size
      minPoolSize: 2, // Increased minimum connections
      maxIdleTimeMS: 60000, // Increased idle timeout
      retryWrites: true,
      retryReads: true,
      bufferCommands: false,
      heartbeatFrequencyMS: 10000, // Added heartbeat
      family: 4, // Use IPv4
    }

    console.log("Attempting to connect to MongoDB...")
    console.log("Connection URI:", MONGODB_URI.replace(/\/\/.*@/, "//***:***@"))

    cached.promise = mongoose
      .connect(MONGODB_URI!, opts)
      .then((mongoose) => {
        console.log("Connected to MongoDB successfully")
        console.log("Database host:", mongoose.connection.host)
        console.log("Database name:", mongoose.connection.name)
        console.log("Connection state:", mongoose.connection.readyState)

        mongoose.connection.on("error", (error) => {
          console.error("MongoDB connection error:", error)
          cached.conn = null
          cached.promise = null
        })

        mongoose.connection.on("disconnected", () => {
          console.warn("MongoDB disconnected")
          cached.conn = null
          cached.promise = null
        })

        mongoose.connection.on("reconnected", () => {
          console.log("MongoDB reconnected")
        })

        return mongoose
      })
      .catch((error) => {
        console.error("MongoDB connection error:", error.message)
        cached.promise = null
        throw error
      })
  }

  try {
    cached.conn = await cached.promise

    if (cached.conn.connection.readyState !== 1) {
      throw new Error(`Connection not ready. State: ${cached.conn.connection.readyState}`)
    }

    return cached.conn
  } catch (e) {
    cached.promise = null
    cached.conn = null
    console.error("Failed to connect to MongoDB:", e)
    throw e
  }
}

export async function ensureConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await connectDB()
      if (conn.connection.readyState === 1) {
        console.log(`Database connection established (attempt ${i + 1})`)
        return conn
      }
      throw new Error(`Connection not ready. State: ${conn.connection.readyState}`)
    } catch (error) {
      console.error(`Connection attempt ${i + 1} failed:`, error)
      if (i === retries - 1) throw error

      cached.conn = null
      cached.promise = null

      const delay = 2000 * (i + 1)
      console.log(`Retrying in ${delay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error("Failed to establish database connection after retries")
}

export async function executeQuery<T>(queryFn: () => Promise<T>, queryName = "query", maxRetries = 2): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`${queryName} (attempt ${attempt})`)

      // Ensure fresh connection
      const conn = await ensureConnection()

      if (conn.connection.readyState !== 1) {
        throw new Error(`Database not ready. State: ${conn.connection.readyState}`)
      }

      const timeoutMs = 30000
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Query timeout after ${timeoutMs}ms`))
        }, timeoutMs)
      })

      const result = await Promise.race([queryFn(), timeoutPromise])

      console.log(`${queryName} completed successfully`)
      return result
    } catch (error: any) {
      lastError = error
      console.error(`${queryName} attempt ${attempt} failed:`, error.message)

      if (attempt === maxRetries) {
        console.error(`All ${queryName} attempts failed`)
        break
      }

      // Reset connection on any error
      cached.conn = null
      cached.promise = null

      // Close existing connection if it exists
      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.connection.close()
        } catch (closeError) {
          console.log("Connection close error (ignoring):", closeError)
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }

  console.log(`Returning empty result due to failed ${queryName}`)
  throw lastError || new Error(`Query ${queryName} failed after ${maxRetries} attempts`)
}
