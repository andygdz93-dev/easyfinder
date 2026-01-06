# EasyFinder AI - fly.io Deployment Guide 

Prerequisites 

fly.io account (sign up at https://fly.io) 

flyctl CLI installed 

MongoDB Atlas connection string ready 

Step 1: Install flyctl CLI 

macOS: 

brew install flyctl 
 

Windows (PowerShell): 

powershell -Command \"iwr https://fly.io/install.ps1 -useb | iex\" 
 

Linux: 

curl -L https://fly.io/install.sh | sh 
 

Step 2: Login to fly.io 

fly auth login 
 
 

Step 3: Deploy Backend 

cd backend 
 
# Create the app (choose a unique name) 
fly launch --name easyfinder-api --no-deploy --region iad 
 
# Set your secrets (IMPORTANT: Replace <db_password> with your actual password) 
fly secrets set MONGO_URL=\"mongodb+srv://easyfinderai2_db:<db_password>@easyfinderai2.d09iphl.mongodb.net/easyfinder?appName=easyfinderai2\" 
fly secrets set DB_NAME=\"easyfinder\" 
fly secrets set CORS_ORIGINS=\"https://easyfinder-web.fly.dev\" 
fly secrets set APP_ENV=\"production\" 
fly secrets set SENDGRID_API_KEY=\"mock_key\" 
fly secrets set FROM_EMAIL=\"demo@easyfinder.ai\" 
 
# Deploy 
fly deploy 
 

Verify backend is running: 

curl https://easyfinder-api.fly.dev/api/ 
# Should return: {\"message\":\"EasyFinder AI API v1.0.0\",\"status\":\"running\"} 
 
 

Step 4: Deploy Frontend 

First, update the frontend .env for production: 

cd frontend 
 
# Create production env file 
echo \"REACT_APP_BACKEND_URL=https://easyfinder-api.fly.dev\" > .env.production 
 

Then deploy: 

# Create the app 
fly launch --name easyfinder-web --no-deploy --region iad 
 
# Deploy 
fly deploy 
 
 

Step 5: Update CORS (if using different app names) 

If your app names are different, update the backend CORS: 

cd backend 
fly secrets set CORS_ORIGINS=\"https://YOUR-FRONTEND-APP.fly.dev\" 
 
 

Troubleshooting 

App keeps crashing? 

# Check logs 
fly logs -a easyfinder-api 
 
# Check app status 
fly status -a easyfinder-api 
 

PORT issues? 

The Dockerfile already handles this with ${PORT:-8001}. fly.io sets PORT automatically. 

MongoDB connection issues? 

Make sure you added your fly.io app's IP to MongoDB Atlas whitelist 

Go to MongoDB Atlas → Network Access → Add IP Address → "Allow Access from Anywhere" (0.0.0.0/0) 

Memory issues? 

fly scale memory 512 -a easyfinder-api 
 
 

Quick Reference Commands 

# View logs 
fly logs -a easyfinder-api 
 
# SSH into container 
fly ssh console -a easyfinder-api 
 
# Restart app 
fly apps restart easyfinder-api 
 
# Check secrets 
fly secrets list -a easyfinder-api 
 
# Scale up 
fly scale count 2 -a easyfinder-api 
 
 

Your URLs (after deployment) 

Backend API: https://easyfinder-api.fly.dev/api/ 

Frontend: https://easyfinder-web.fly.dev/
