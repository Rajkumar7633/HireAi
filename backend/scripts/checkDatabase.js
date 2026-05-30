const mongoose = require("mongoose")

require("dotenv").config()

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to MongoDB")
    console.log("Database:", mongoose.connection.name)
    console.log("Host:", mongoose.connection.host)
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray()
    console.log("\nCollections found:")
    collections.forEach(col => console.log(`  - ${col.name}`))
    
    // Check users collection
    const User = require("../models/User")
    const userCount = await User.countDocuments()
    console.log(`\nTotal users in database: ${userCount}`)
    
    // List all users
    const users = await User.find({}, { email: 1, role: 1, name: 1, _id: 0 })
    console.log("\nUsers in database:")
    users.forEach(user => {
      console.log(`  - Email: ${user.email}, Role: ${user.role}, Name: ${user.name}`)
    })
    
    await mongoose.disconnect()
    console.log("\nDisconnected from MongoDB")
  } catch (error) {
    console.error("Error:", error)
    process.exit(1)
  }
}

checkDatabase()
