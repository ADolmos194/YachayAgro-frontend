#!/bin/bash
echo "Starting Frontend Validation..."
pnpm ci:validate
if [ $? -eq 0 ]; then
    echo "----------------------------------------"
    echo "✅ Frontend Validation passed successfully!"
    echo "----------------------------------------"
else
    echo "----------------------------------------"
    echo "❌ Frontend Validation failed!"
    echo "----------------------------------------"
    exit 1
fi
