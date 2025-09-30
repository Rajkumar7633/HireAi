from flask import Flask, request, jsonify
from flask_cors import CORS
from nlp_processor import calculate_match_score, parse_resume_text, extract_text_from_pdf
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

@app.route('/api/ml/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'HireAI ML Engine',
        'version': '1.0.0'
    })

@app.route('/api/ml/parse-resume', methods=['POST'])
def parse_resume_endpoint():
    """Parse resume from file path or text"""
    try:
        data = request.get_json()
        
        # Handle file path (from backend upload)
        if 'filePath' in data:
            file_path = data.get('filePath')
            if not os.path.exists(file_path):
                return jsonify({"error": "File not found"}), 400
            
            # Extract text from PDF
            resume_text = extract_text_from_pdf(file_path)
            if not resume_text:
                return jsonify({"error": "Could not extract text from file"}), 400
        
        # Handle direct text input
        elif 'resume_text' in data:
            resume_text = data.get('resume_text', '')
        else:
            return jsonify({"error": "Missing filePath or resume_text"}), 400

        if not resume_text.strip():
            return jsonify({"error": "Empty resume text"}), 400

        # Parse the resume
        results = parse_resume_text(resume_text)
        
        return jsonify({
            'rawText': resume_text,
            'skills': results.get('skills', []),
            'experience': results.get('experience', 'Not specified'),
            'education': results.get('education', ['Not specified']),
            'textLength': len(resume_text)
        })
        
    except Exception as e:
        logger.error(f"Error in parse_resume_endpoint: {e}")
        return jsonify({"error": "Failed to parse resume"}), 500

@app.route('/api/ml/calculate-match', methods=['POST'])
def calculate_match_endpoint():
    """Calculate match score between resume and job description"""
    try:
        data = request.get_json()
        
        resume_text = data.get('resumeText', '')
        job_text = data.get('jobText', '')
        resume_skills = data.get('resumeSkills', [])
        job_skills = data.get('jobSkills', [])
        
        if not resume_text or not job_text:
            return jsonify({"error": "Missing resume text or job text"}), 400
        
        # Calculate match score
        results = calculate_match_score(
            resume_text=resume_text,
            job_description_text=job_text,
            job_skills=job_skills,
            resume_skills=resume_skills
        )
        
        return jsonify({
            'score': results.get('match_score', 0),
            'matchedSkills': results.get('matched_skills', []),
            'missingSkills': results.get('missing_skills', []),
            'suggestions': results.get('suggestions', []),
            'details': {
                'textSimilarity': results.get('text_similarity', 0),
                'skillMatch': results.get('skill_match_percentage', 0),
                'atsScore': results.get('ats_score', 0)
            }
        })
        
    except Exception as e:
        logger.error(f"Error in calculate_match_endpoint: {e}")
        return jsonify({"error": "Failed to calculate match"}), 500

@app.route('/api/ml/analyze-job', methods=['POST'])
def analyze_job_endpoint():
    """Analyze job description and extract key information"""
    try:
        data = request.get_json()
        job_text = data.get('jobText', '')
        
        if not job_text:
            return jsonify({"error": "Missing job text"}), 400
        
        # Parse job description (reuse resume parsing logic)
        results = parse_resume_text(job_text)
        
        return jsonify({
            'skills': results.get('skills', []),
            'experience': results.get('experience', 'Not specified'),
            'textLength': len(job_text),
            'cleanedText': job_text.strip()
        })
        
    except Exception as e:
        logger.error(f"Error in analyze_job_endpoint: {e}")
        return jsonify({"error": "Failed to analyze job"}), 500

if __name__ == '__main__':
    # Create uploads directory if it doesn't exist
    os.makedirs('uploads', exist_ok=True)
    
    # Get port from environment or default to 5000
    port = int(os.environ.get('PORT', 5000))
    
    logger.info(f"Starting HireAI ML Engine on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
