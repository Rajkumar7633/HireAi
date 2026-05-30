const mongoose = require("mongoose")
const User = require("../models/User")
const bcrypt = require("bcryptjs")

require("dotenv").config()

async function checkAndFixUser(email, password, role, name) {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to MongoDB")

    // Check if user exists
    const user = await User.findOne({ email })
    
    if (!user) {
      console.log("User not found. Creating new user...")
      
      const salt = await bcrypt.genSalt(10)
      const hash = await bcrypt.hash(password, salt)
      
      const newUser = new User({
        email,
        password: hash,
        passwordHash: hash,
        role: role || "job_seeker",
        name: name || "User",
        emailVerified: true
      })
      
      await newUser.save()
      console.log("User created successfully!")
      console.log("Email:", email)
      console.log("Role:", role || "job_seeker")
    } else {
      console.log("User found!")
      console.log("Email:", user.email)
      console.log("Role:", user.role)
      console.log("Name:", user.name)
      console.log("Email Verified:", user.emailVerified)
      
      // Update password hash if needed
      const salt = await bcrypt.genSalt(10)
      const hash = await bcrypt.hash(password, salt)
      
      user.password = hash
      user.passwordHash = hash
      if (role) user.role = role
      if (name) user.name = name
      user.emailVerified = true
      
      await user.save()
      console.log("User updated successfully!")
      console.log("Email:", email)
      console.log("Role:", user.role)
    }
    
    await mongoose.disconnect()
    console.log("Disconnected from MongoDB")
  } catch (error) {
    console.error("Error:", error)
    process.exit(1)
  }
}

// Get command line arguments
const email = process.argv[2]
const password = process.argv[3]
const role = process.argv[4]
const name = process.argv[5]

if (!email || !password) {
  console.log("Usage: node checkUser.js <email> <password> [role] [name]")
  console.log("Example: node checkUser.js user@example.com password123 college_admin John")
  process.exit(1)
}

checkAndFixUser(email, password, role, name)
