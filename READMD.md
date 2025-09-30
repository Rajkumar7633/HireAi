# HireAI - AI-Powered Recruitment Platform

A comprehensive recruitment platform that connects job seekers with recruiters using advanced AI matching technology.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Installation & Setup

1. **Clone and install dependencies:**
   \`\`\`bash
   npm run setup
   \`\`\`

2. **Configure environment variables:**

   - Copy `.env` file and update with your actual values
   - Update `MONGODB_URI` with your MongoDB connection string
   - Set a secure `JWT_SECRET`
   - Configure email service credentials for notifications

3. **Start the development servers:**
   \`\`\`bash
   npm run dev
   \`\`\`

This will start both:

- Frontend (Next.js): http://localhost:3000
- Backend (Express): http://localhost:5001

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build the frontend for production
- `npm run start` - Start both frontend and backend in production mode
- `npm run setup` - Install all dependencies (frontend + backend)
- `npm run seed` - Seed the database with demo data

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, and shadcn/ui
- **Backend**: Express.js with Socket.io for real-time features
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication
- **File Upload**: Multer for resume and document handling
- **Real-time**: Socket.io for notifications and live updates

## 📁 Project Structure

\`\`\`
├── app/ # Next.js app directory
├── backend/ # Express.js backend
│ ├── routes/ # API routes
│ ├── models/ # MongoDB models
│ ├── middleware/ # Custom middleware
│ └── config/ # Configuration files
├── components/ # React components
├── lib/ # Utility libraries
└── uploads/ # File upload directory
\`\`\`

## 🔧 Environment Variables

See `.env` file for all required environment variables. Key variables:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token signing
- `FRONTEND_URL` - Frontend URL for CORS
- `NEXT_PUBLIC_BACKEND_URL` - Backend URL for API calls

## 📝 Features

- AI-powered resume screening and job matching
- Real-time notifications via Socket.io
- File upload for resumes and documents
- Comprehensive user authentication
- Admin dashboard and analytics
- Video interview scheduling
- Email notifications
- Advanced search and filtering

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
