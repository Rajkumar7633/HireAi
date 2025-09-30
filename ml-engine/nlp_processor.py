import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pdfplumber
import os
import re
import logging
from collections import Counter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load spaCy model with error handling
def load_spacy_model():
    try:
        return spacy.load("en_core_web_sm")
    except OSError:
        logger.warning("spaCy model 'en_core_web_sm' not found. Attempting to download...")
        try:
            import subprocess
            subprocess.check_call(["python", "-m", "spacy", "download", "en_core_web_sm"])
            return spacy.load("en_core_web_sm")
        except Exception as e:
            logger.error(f"Failed to download spaCy model: {e}")
            return None

# Initialize NLP model
nlp = load_spacy_model()

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using pdfplumber"""
    try:
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return ""

def clean_text(text):
    """Clean and preprocess text"""
    # Remove extra whitespace and special characters
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\w\s\-\.]', ' ', text)
    return text.strip()

def extract_skills(text):
    """Extract skills from text using keyword matching and NLP"""
    if not text:
        return []
    
    text_lower = text.lower()
    
    # Comprehensive skill database
    technical_skills = [
        # Programming Languages
        "python", "java", "javascript", "typescript", "c++", "c#", "php", "ruby", "go", "rust", "swift", "kotlin", "scala", "r",
        
        # Web Technologies
        "html", "css", "react", "angular", "vue", "svelte", "jquery", "bootstrap", "tailwind", "sass", "less",
        "node.js", "nodejs", "express", "fastapi", "django", "flask", "spring", "laravel", "rails",
        
        # Databases
        "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "sqlite",
        
        # Cloud & DevOps
        "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "gitlab", "github", "ci/cd", "terraform", "ansible",
        
        # Data Science & ML
        "machine learning", "deep learning", "data science", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn",
        "tableau", "power bi", "jupyter", "matplotlib", "seaborn",
        
        # Other Technologies
        "git", "linux", "unix", "bash", "api", "rest", "graphql", "microservices", "agile", "scrum", "testing", "qa"
    ]
    
    soft_skills = [
        "leadership", "communication", "teamwork", "problem solving", "critical thinking", "creativity",
        "time management", "project management", "analytical thinking", "attention to detail"
    ]
    
    all_skills = technical_skills + soft_skills
    found_skills = []
    
    # Extract skills using keyword matching
    for skill in all_skills:
        if skill in text_lower:
            found_skills.append(skill)
    
    # Use spaCy for additional entity extraction if available
    if nlp:
        try:
            doc = nlp(text)
            for ent in doc.ents:
                if ent.label_ in ['ORG', 'PRODUCT'] and len(ent.text) > 2:
                    skill_candidate = ent.text.lower().strip()
                    if skill_candidate not in found_skills and len(skill_candidate) < 20:
                        found_skills.append(skill_candidate)
        except Exception as e:
            logger.warning(f"Error in spaCy processing: {e}")
    
    # Remove duplicates and return top skills
    unique_skills = list(set(found_skills))
    return unique_skills[:25]  # Limit to top 25 skills

def extract_experience(text):
    """Extract years of experience from text"""
    if not text:
        return "Not specified"
    
    experience_patterns = [
        r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)',
        r'(\d+)\+?\s*yrs?\s*(?:of\s*)?(?:experience|exp)',
        r'experience\s*(?:of\s*)?(\d+)\+?\s*years?',
        r'(\d+)\+?\s*years?\s*in\s*(?:the\s*)?(?:field|industry|role)',
        r'(\d+)\+?\s*years?\s*(?:working|work)',
        r'over\s*(\d+)\s*years?',
        r'more\s*than\s*(\d+)\s*years?'
    ]
    
    text_lower = text.lower()
    for pattern in experience_patterns:
        match = re.search(pattern, text_lower)
        if match:
            years = match.group(1)
            return f"{years}+ years"
    
    # Check for experience levels
    if any(word in text_lower for word in ['senior', 'lead', 'principal', 'architect']):
        return "Senior level (5+ years)"
    elif any(word in text_lower for word in ['junior', 'entry', 'graduate', 'intern']):
        return "Entry level (0-2 years)"
    elif any(word in text_lower for word in ['mid', 'intermediate']):
        return "Mid level (2-5 years)"
    
    return "Not specified"

def extract_education(text):
    """Extract education information from text"""
    if not text:
        return ["Not specified"]
    
    education_patterns = [
        r'(?:bachelor|master|phd|b\.s\.|m\.s\.|b\.a\.|m\.a\.|b\.tech|m\.tech|mba).*?(?:in|of)\s*([^,\n\.]+)',
        r'(?:university|college|institute).*?([^,\n\.]+)',
        r'(?:degree|graduate|graduated).*?(?:in|from)\s*([^,\n\.]+)',
        r'(?:bs|ms|ba|ma|phd)\s+(?:in\s+)?([^,\n\.]+)'
    ]
    
    education_info = []
    text_lower = text.lower()
    
    for pattern in education_patterns:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        for match in matches:
            cleaned_match = match.strip()
            if len(cleaned_match) > 3 and len(cleaned_match) < 50:
                education_info.append(cleaned_match.title())
    
    # Remove duplicates
    education_info = list(set(education_info))
    
    return education_info[:3] if education_info else ["Not specified"]

def calculate_text_similarity(text1, text2):
    """Calculate text similarity using TF-IDF and cosine similarity"""
    try:
        if not text1 or not text2:
            return 0.0
        
        # Create TF-IDF vectorizer
        vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2),
            lowercase=True
        )
        
        # Fit and transform texts
        tfidf_matrix = vectorizer.fit_transform([text1, text2])
        
        # Calculate cosine similarity
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(similarity)
        
    except Exception as e:
        logger.error(f"Error calculating text similarity: {e}")
        return 0.0

def calculate_skill_match(resume_skills, job_skills):
    """Calculate skill matching score"""
    if not resume_skills or not job_skills:
        return 0.0, [], []
    
    resume_skills_lower = [skill.lower().strip() for skill in resume_skills]
    job_skills_lower = [skill.lower().strip() for skill in job_skills]
    
    matched_skills = []
    missing_skills = []
    
    for job_skill in job_skills:
        job_skill_lower = job_skill.lower().strip()
        
        # Check for exact match or partial match
        is_matched = False
        for resume_skill in resume_skills_lower:
            if (job_skill_lower == resume_skill or 
                job_skill_lower in resume_skill or 
                resume_skill in job_skill_lower):
                matched_skills.append(job_skill)
                is_matched = True
                break
        
        if not is_matched:
            missing_skills.append(job_skill)
    
    # Calculate match percentage
    skill_match_percentage = (len(matched_skills) / len(job_skills)) * 100 if job_skills else 0
    
    return skill_match_percentage, matched_skills, missing_skills

def generate_suggestions(missing_skills, matched_skills, overall_score):
    """Generate improvement suggestions based on analysis"""
    suggestions = []
    
    if missing_skills:
        if len(missing_skills) <= 3:
            suggestions.append(f"Consider gaining experience in: {', '.join(missing_skills)}")
        else:
            suggestions.append(f"Focus on developing skills in: {', '.join(missing_skills[:3])} and {len(missing_skills)-3} others")
    
    if overall_score < 70:
        suggestions.append("Enhance your resume with more relevant keywords from the job description")
        suggestions.append("Add quantifiable achievements and specific project examples")
    
    if overall_score < 50:
        suggestions.append("Consider gaining more experience in the required domain")
        suggestions.append("Add relevant certifications to strengthen your profile")
    
    if len(matched_skills) < 3:
        suggestions.append("Highlight more technical skills that align with the job requirements")
    
    if not suggestions:
        suggestions.append("Great match! Consider emphasizing your relevant experience and achievements")
    
    return suggestions

def parse_resume_text(resume_text):
    """Parse resume text and extract structured information"""
    try:
        if not resume_text:
            return {"error": "Empty resume text"}
        
        # Clean the text
        cleaned_text = clean_text(resume_text)
        
        # Extract information
        skills = extract_skills(cleaned_text)
        experience = extract_experience(cleaned_text)
        education = extract_education(cleaned_text)
        
        return {
            "skills": skills,
            "experience": experience,
            "education": education,
            "text_length": len(cleaned_text)
        }
        
    except Exception as e:
        logger.error(f"Error parsing resume text: {e}")
        return {"error": f"Failed to parse resume: {str(e)}"}

def calculate_match_score(resume_text, job_description_text, job_skills, resume_skills=None):
    """Calculate comprehensive match score between resume and job description"""
    try:
        if not resume_text or not job_description_text:
            return {"error": "Missing resume or job description text"}
        
        # Extract skills from resume if not provided
        if not resume_skills:
            resume_analysis = parse_resume_text(resume_text)
            resume_skills = resume_analysis.get("skills", [])
        
        # Calculate text similarity
        text_similarity = calculate_text_similarity(resume_text, job_description_text)
        
        # Calculate skill matching
        skill_match_percentage, matched_skills, missing_skills = calculate_skill_match(
            resume_skills, job_skills
        )
        
        # Calculate overall score (weighted combination)
        text_weight = 0.4
        skill_weight = 0.6
        
        overall_score = (text_similarity * text_weight * 100) + (skill_match_percentage * skill_weight)
        overall_score = min(100, max(0, int(overall_score)))
        
        # Generate suggestions
        suggestions = generate_suggestions(missing_skills, matched_skills, overall_score)
        
        # Calculate ATS score (simplified version)
        ats_score = overall_score  # In reality, this would be more complex
        
        return {
            "match_score": overall_score,
            "ats_score": ats_score,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "suggestions": suggestions,
            "text_similarity": round(text_similarity * 100, 2),
            "skill_match_percentage": round(skill_match_percentage, 2)
        }
        
    except Exception as e:
        logger.error(f"Error calculating match score: {e}")
        return {"error": f"Failed to calculate match: {str(e)}"}

# Test function
if __name__ == "__main__":
    # Test the functions
    sample_resume = """
    John Doe
    Senior Software Engineer
    
    Experienced software engineer with 6 years of experience in Python, JavaScript, and React.
    Strong background in AWS cloud services, Docker, and CI/CD pipelines.
    Bachelor's degree in Computer Science from MIT.
    
    Skills: Python, JavaScript, React, Node.js, AWS, Docker, Git, SQL, MongoDB
    """
    
    sample_job = """
    Senior Full Stack Developer
    
    We are looking for a Senior Full Stack Developer with 5+ years of experience.
    Must have strong skills in Python, React, and AWS.
    Experience with Docker and database management required.
    """
    
    job_skills = ["Python", "React", "AWS", "Docker", "SQL", "Node.js"]
    
    print("=== Testing Resume Parsing ===")
    resume_analysis = parse_resume_text(sample_resume)
    print(f"Skills found: {resume_analysis.get('skills', [])}")
    print(f"Experience: {resume_analysis.get('experience', 'N/A')}")
    print(f"Education: {resume_analysis.get('education', [])}")
    
    print("\n=== Testing Match Calculation ===")
    match_result = calculate_match_score(sample_resume, sample_job, job_skills)
    print(f"Match Score: {match_result.get('match_score', 0)}%")
    print(f"Matched Skills: {match_result.get('matched_skills', [])}")
    print(f"Missing Skills: {match_result.get('missing_skills', [])}")
    print(f"Suggestions: {match_result.get('suggestions', [])}")
    print(f"Text Similarity: {match_result.get('text_similarity', 0)}%")
