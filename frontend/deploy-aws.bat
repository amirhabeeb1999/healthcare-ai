@echo off
REM Healthcare AI Frontend AWS Deployment Script
REM Deploys to AWS ECS using Docker

echo 🚀 Deploying Healthcare AI Frontend to AWS ECS...

REM Check if AWS CLI is configured
aws sts get-caller-identity >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ AWS CLI not configured. Run 'aws configure' first.
    exit /b 1
)

REM Set variables
set APP_NAME=healthcare-ai-frontend
set REGION=us-east-1
set ACCOUNT_ID=244271316300

echo 📦 Building Docker image...
docker build -t %APP_NAME%:latest .
if %ERRORLEVEL% neq 0 (
    echo ❌ Docker build failed
    exit /b 1
)

echo 🔐 Logging into Amazon ECR...
aws ecr get-login-password --region %REGION% | docker login --username AWS --password-stdin %ACCOUNT_ID%.dkr.ecr.%REGION%.amazonaws.com
if %ERRORLEVEL% neq 0 (
    echo ❌ ECR login failed
    exit /b 1
)

echo 📋 Creating ECR repository...
aws ecr create-repository --repository-name %APP_NAME% --region %REGION% 2>nul || echo Repository already exists

echo 🏷️ Tagging and pushing image...
docker tag %APP_NAME%:latest %ACCOUNT_ID%.dkr.ecr.%REGION%.amazonaws.com/%APP_NAME%:latest
docker push %ACCOUNT_ID%.dkr.ecr.%REGION%.amazonaws.com/%APP_NAME%:latest
if %ERRORLEVEL% neq 0 (
    echo ❌ Docker push failed
    exit /b 1
)

echo 📝 Creating ECS task definition...
aws ecs register-task-definition --cli-input-json file://task-definition.json --region %REGION%

echo 🚀 Updating ECS service...
aws ecs update-service --cluster healthcare-ai-cluster --service %APP_NAME%-service --task-definition %APP_NAME%:1 --region %REGION%

echo ✅ Deployment complete!
echo 🌍 Application will be available at the ECS service load balancer URL

REM Clean up
docker rmi %APP_NAME%:latest 2>nul
docker rmi %ACCOUNT_ID%.dkr.ecr.%REGION%.amazonaws.com/%APP_NAME%:latest 2>nul
