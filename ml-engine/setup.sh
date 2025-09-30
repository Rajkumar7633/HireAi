#!/bin/bash

# Setup script for ML Engine
echo "Setting up HireAI ML Engine..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install requirements
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Create necessary directories
mkdir -p uploads
mkdir -p logs

echo "Setup complete! To run the ML engine:"
echo "1. Activate virtual environment: source venv/bin/activate"
echo "2. Run the server: python app.py"
