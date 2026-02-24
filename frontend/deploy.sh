#!/bin/bash

# Healthcare AI Frontend Deployment Script
# Usage: ./deploy.sh [environment]

ENVIRONMENT=${1:-production}
echo "🚀 Deploying Healthcare AI Frontend to $ENVIRONMENT..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Run 'aws configure' first."
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Create S3 bucket (if it doesn't exist)
BUCKET_NAME="healthcare-ai-frontend-$ENVIRONMENT"
echo "🪣 Ensuring S3 bucket exists: $BUCKET_NAME"
aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region us-east-1 \
    --create-bucket-configuration LocationConstraint=us-east-1 2>/dev/null || echo "Bucket already exists"

# Enable static website hosting
echo "🌐 Configuring static website hosting..."
aws s3 website $BUCKET_NAME \
    --index-document index.html \
    --error-document 404.html

# Set bucket policy for public read
echo "🔓 Setting bucket policy..."
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy file:///tmp/bucket-policy.json

# Deploy to S3
echo "📤 Uploading files to S3..."
aws s3 sync out/ s3://$BUCKET_NAME --delete --acl public-read

echo "✅ Deployment complete!"
echo "🌍 Website URL: http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
echo "🌍 Alternative URL: http://$BUCKET_NAME.s3.us-east-1.amazonaws.com"
