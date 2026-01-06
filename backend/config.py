"""Configuration management for EasyFinder AI"""

import os 
from pathlib import Path 
from dotenv import load_dotenv

# Load environment variables 

ROOT_DIR = Path(__file__).parent.parent 

load_dotenv(ROOT_DIR / '.env') 

 

# Application settings 

APP_ENV = os.environ.get("APP_ENV", "local") 

MOCK_EMAIL_MODE = True  # Always mock emails for safety 

 

# Email configuration 

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "mock_key") 

FROM_EMAIL = os.environ.get("FROM_EMAIL", "demo@easyfinder.ai") 

 


# Database 

load_dotenv()

DB_NAME = os.environ.get("DB_NAME", "easyfinder") 

MONGO_URL = os.environ.get("MONGO_URL")

if not MONGO_URL:
 
    raise RuntimeError("MONGO_URL environment variable not set")
 

# Lead scoring thresholds 

HIGH_PRIORITY_THRESHOLD = 70 

MEDIUM_PRIORITY_THRESHOLD = 40 

 

# Data paths 

DATA_DIR = ROOT_DIR / 'data' 

TEMPLATES_DIR = ROOT_DIR / 'templates' 

 

# Ensure directories exist 

DATA_DIR.mkdir(exist_ok=True) 

TEMPLATES_DIR.mkdir(exist_ok=True) 

 

# Scoring weights 

SCORING_CONFIG = { 

    'company_size': { 

        'enterprise': 40, 

        'medium': 25, 

        'small': 10 

    }, 

    'budget_thresholds': { 

        'high': {'min': 50000, 'points': 30}, 

        'medium': {'min': 25000, 'points': 15} 

    }, 

    'target_industries': ['construction', 'logistics', 'equipment', 'manufacturing', 'technology'], 

    'industry_points': { 

        'target': 20, 

        'other': 10 

    }, 

    'email_valid_points': 10 

} 