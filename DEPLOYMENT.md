# HireAI Deployment Guide

This guide covers deploying HireAI to production using **Vercel** (frontend) and **Render** (backend).

---

## Environment Variables Setup

### Local Development
- Use `.env` file (already configured)
- Copy from `.env.example` if needed
- Run both frontend and backend locally

### Production Deployment

#### Frontend (Vercel)
Set these environment variables in Vercel dashboard:
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
NEXT_PUBLIC_COMPANY_NAME=HireAI
NEXT_PUBLIC_COMPANY_WEBSITE=https://your-app.vercel.app
NEXT_PUBLIC_BRAND_COLOR=#6d28d9
NEXT_PUBLIC_ACCENT_COLOR=#eef2ff
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
NEXT_PUBLIC_RECRUITER_PRO_PRICE=your-recruiter-pro-price-id
NEXT_PUBLIC_STUDENT_PLUS_PRICE=your-student-plus-price-id
NEXT_PUBLIC_ADMIN_ENABLED=1
```

#### Backend (Render)
Set these environment variables in Render dashboard:
```
MONGODB_URI=mongodb+srv://RajKumar7633:Raj@76330Raj@cluster0.kd5li4c.mongodb.net/?appName=Cluster0
REDIS_URL=redis://default:A655r7uky8w9z9keo062ar0wf3n0uao5sn7ruwyxjl60v4rkvnn@<host>:<port>
JWT_SECRET=your-production-jwt-secret-here
ENCRYPTION_KEY=your-production-encryption-key-here
BACKEND_PORT=5001
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="HireAI <no-reply@yourapp.com>"
EMAIL_SERVICE_HOST=smtp.gmail.com
EMAIL_SERVICE_PORT=587
EMAIL_SERVICE_USER=your-email@gmail.com
EMAIL_SERVICE_PASS=your-app-password
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-pro
ENABLE_AI_SDK=true
AI_SHORTLIST_THRESHOLD=75
AI_MIN_ATS_SCORE=65
OPENAI_API_KEY=your-openai-api-key
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
CLOUDINARY_FOLDER=hireai/interviews
JUDGE0_URL=https://ce.judge0.com
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
BILLING_ENABLED=1
RECRUITER_PRO_PRICE=your-recruiter-pro-price-id
STUDENT_PLUS_PRICE=your-student-plus-price-id
ADMIN_ALLOW_SELF_SIGNUP=1
ANALYTICS_CACHE=1
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
NODE_ENV=production
LOG_LEVEL=warn
```

---

## Deployment Steps

### 1. Frontend Deployment (Vercel)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. Configure build settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Add environment variables (see Frontend section above)
5. Deploy

### 2. Backend Deployment (Render)

1. Go to [Render](https://render.com) and create a new **Web Service**
2. Connect your GitHub repository
3. Configure build settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Add environment variables (see Backend section above)
5. Deploy

### 3. Database Setup

#### MongoDB Atlas
1. Create a MongoDB Atlas account
2. Create a cluster
3. Get connection string
4. Add to environment variables

#### Redis Cloud
1. Create a Redis Cloud account
2. Create a database
3. Get connection string
4. Add to environment variables

### 4. Stripe Setup

1. Create a Stripe account
2. Get API keys (publishable and secret)
3. Create products and prices
4. Add to environment variables
5. Configure webhook endpoint in Stripe dashboard

### 5. LiveKit Setup

1. Create a LiveKit account
2. Create a project
3. Get API key and secret
4. Add to environment variables

---

## Post-Deployment Checklist

- [ ] Update CORS settings in backend to allow production URLs
- [ ] Configure Stripe webhook endpoint
- [ ] Test email sending functionality
- [ ] Test file uploads (Cloudinary)
- [ ] Test code execution (Judge0)
- [ ] Test LiveKit video meetings
- [ ] Test AI features (Groq)
- [ ] Test authentication flow
- [ ] Test payment flow
- [ ] Monitor logs for errors

---

## Troubleshooting

### Backend Not Connecting to Database
- Check MongoDB connection string
- Verify IP whitelist in MongoDB Atlas
- Check Render logs for connection errors

### CORS Errors
- Update CORS configuration in backend
- Add production URLs to allowed origins
- Check that frontend URL is correct

### Email Not Sending
- Verify SMTP credentials
- Check if app password is correct for Gmail
- Review email service logs

### Stripe Webhook Failures
- Verify webhook secret
- Check webhook endpoint is accessible
- Review Stripe dashboard for webhook events

---

## Environment Files Summary

- `.env` - Local development (all variables)
- `.env.example` - Template for new developers
- `.env.production` - Production reference (copy values to Vercel/Render)
- `.env.local` - Removed (consolidated into .env)
- `.env.docker` - Removed (not needed for Vercel/Render)
- `backend/.env` - Removed (backend now uses root .env)

---

## Security Notes

- Never commit `.env` files to version control
- Use strong secrets for JWT and encryption keys
- Rotate secrets regularly
- Use environment-specific secrets
- Enable 2FA on all service accounts
- Monitor for unauthorized access
