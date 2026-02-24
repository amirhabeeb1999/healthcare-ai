@echo off
REM Healthcare AI Frontend Deployment Script for Windows
REM Usage: deploy.bat [environment]

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=production

echo 🚀 Deploying Healthcare AI Frontend to %ENVIRONMENT%...

REM Check if AWS CLI is configured
aws sts get-caller-identity >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ AWS CLI not configured. Run 'aws configure' first.
    exit /b 1
)

REM Build the application
echo 📦 Building application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed
    exit /b 1
)

REM Create S3 bucket (if it doesn't exist)
set BUCKET_NAME=healthcare-ai-frontend-%ENVIRONMENT%
echo 🪣 Ensuring S3 bucket exists: %BUCKET_NAME%
aws s3api create-bucket --bucket %BUCKET_NAME% --region us-east-1 2>nul || echo Bucket already exists

REM Enable static website hosting
echo 🌐 Configuring static website hosting...
aws s3 website %BUCKET_NAME% --index-document index.html --error-document 404.html

REM Set bucket policy for public read
echo 🔓 Setting bucket policy...
echo { > temp-policy.json
echo   "Version": "2012-10-17", >> temp-policy.json
echo   "Statement": [ >> temp-policy.json
echo     { >> temp-policy.json
echo       "Sid": "PublicReadGetObject", >> temp-policy.json
echo       "Effect": "Allow", >> temp-policy.json
echo       "Principal": "*", >> temp-policy.json
echo       "Action": "s3:GetObject", >> temp-policy.json
echo       "Resource": "arn:aws:s3:::%BUCKET_NAME%/*" >> temp-policy.json
echo     } >> temp-policy.json
echo   ] >> temp-policy.json
echo } >> temp-policy.json

aws s3api put-bucket-policy --bucket %BUCKET_NAME% --policy file://temp-policy.json
del temp-policy.json

REM Deploy to S3
echo 📤 Uploading files to S3...
aws s3 sync out\ s3://%BUCKET_NAME% --delete --acl public-read

echo ✅ Deployment complete!
echo 🌍 Website URL: http://%BUCKET_NAME%.s3-website-us-east-1.amazonaws.com
echo 🌍 Alternative URL: http://%BUCKET_NAME%.s3.us-east-1.amazonaws.com
