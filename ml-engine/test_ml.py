import unittest
import json
from app import app
from nlp_processor import parse_resume_text, calculate_match_score, extract_skills

class TestMLEngine(unittest.TestCase):
    
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = self.app.get('/api/ml/health')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')
    
    def test_parse_resume_endpoint(self):
        """Test resume parsing endpoint"""
        test_data = {
            'resume_text': 'John Doe, Software Engineer with 5 years experience in Python and React'
        }
        
        response = self.app.post('/api/ml/parse-resume',
                               data=json.dumps(test_data),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIn('skills', data)
        self.assertIn('experience', data)
        self.assertIn('rawText', data)
    
    def test_calculate_match_endpoint(self):
        """Test match calculation endpoint"""
        test_data = {
            'resumeText': 'Software engineer with Python and React experience',
            'jobText': 'Looking for Python developer with React skills',
            'resumeSkills': ['Python', 'React'],
            'jobSkills': ['Python', 'React', 'JavaScript']
        }
        
        response = self.app.post('/api/ml/calculate-match',
                               data=json.dumps(test_data),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIn('score', data)
        self.assertIn('matchedSkills', data)
        self.assertIn('missingSkills', data)
        self.assertIn('suggestions', data)
    
    def test_skill_extraction(self):
        """Test skill extraction function"""
        text = "I have experience with Python, JavaScript, React, and AWS"
        skills = extract_skills(text)
        
        self.assertIn('python', skills)
        self.assertIn('javascript', skills)
        self.assertIn('react', skills)
        self.assertIn('aws', skills)
    
    def test_match_calculation(self):
        """Test match score calculation"""
        resume_text = "Python developer with React experience"
        job_text = "Looking for Python and React developer"
        job_skills = ["Python", "React"]
        
        result = calculate_match_score(resume_text, job_text, job_skills)
        
        self.assertIn('match_score', result)
        self.assertGreater(result['match_score'], 0)
        self.assertIn('matched_skills', result)
        self.assertIn('suggestions', result)

if __name__ == '__main__':
    unittest.main()
