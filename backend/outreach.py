""""Email Outreach Module for EasyFinder (Mock Mode)""" import logging from typing import Dict, Any, Optional from datetime import datetime, timezone from .config import MOCK_EMAIL_MODE, FROM_EMAIL, SENDGRID_API_KEY 

logger = logging.getLogger(name) 

def get_email_template(lead: Dict[str, Any]) -> Dict[str, str]: """Generate email content for a lead""" subject = f"Partnership Opportunity - {lead.get('company', 'Your Company')}" 

body = f""" 
 

Dear {lead.get('name', 'Valued Partner')}, 

I hope this email finds you well. We've identified {lead.get('company', 'your company')} as a potential partner for our enterprise solutions. 

Based on your company profile: 

Industry: {lead.get('industry', 'N/A')} 

Company Size: {lead.get('company_size', 'N/A')} 

We believe there's a strong fit for collaboration. Our team would love to schedule a brief call to discuss how we can help {lead.get('company', 'your company')} achieve its goals. 

Key benefits we offer: • Streamlined lead management and scoring • Automated outreach campaigns • Enterprise-grade security and compliance • Detailed analytics and reporting 

Would you be available for a 15-minute call this week? 

Best regards, EasyFinder AI Team demo@easyfinder.ai 

 

This is an automated message from EasyFinder AI. If you wish to unsubscribe, please reply with "UNSUBSCRIBE". """ 

html_body = f""" 
 

EasyFinder AI 

Dear {lead.get('name', 'Valued Partner')}, 

I hope this email finds you well. We've identified {lead.get('company', 'your company')} as a potential partner for our enterprise solutions. 

      <div class=\"highlight\"> 
           <strong>Your Company Profile:</strong><br> 
           Industry: {lead.get('industry', 'N/A')}<br> 
           Company Size: {lead.get('company_size', 'N/A')} 
       </div> 
        
       <p>We believe there's a strong fit for collaboration. Our team would love to schedule a brief call to discuss how we can help your company achieve its goals.</p> 
        
       <p><strong>Key benefits we offer:</strong></p> 
       <ul> 
           <li>Streamlined lead management and scoring</li> 
           <li>Automated outreach campaigns</li> 
           <li>Enterprise-grade security and compliance</li> 
           <li>Detailed analytics and reporting</li> 
       </ul> 
        
       <p>Would you be available for a 15-minute call this week?</p> 
        
       <p>Best regards,<br><strong>EasyFinder AI Team</strong></p> 
   </div> 
   <div class=\"footer\"> 
       This is an automated message from EasyFinder AI.<br> 
       If you wish to unsubscribe, please reply with \"UNSUBSCRIBE\". 
   </div> 
</div> 
""" return { 
   'subject': subject, 
   'body': body, 
   'html_body': html_body 
} 
 

def send_email(to_email: str, lead: Dict[str, Any]) -> Dict[str, Any]: """ Send email to lead (MOCK MODE - no actual emails sent) 

Args: 
   to_email: Recipient email address 
   lead: Lead data dictionary 
    
Returns: 
   Result dictionary with status and details 
""" 
template = get_email_template(lead) 
 
# Always use mock mode for safety 
if MOCK_EMAIL_MODE or SENDGRID_API_KEY == 'mock_key': 
   logger.info(f\"[MOCK] Email would be sent to: {to_email}\") 
   logger.info(f\"[MOCK] Subject: {template['subject']}\") 
    
   return { 
       'success': True, 
       'mode': 'mock', 
       'to': to_email, 
       'from': FROM_EMAIL, 
       'subject': template['subject'], 
       'timestamp': datetime.now(timezone.utc).isoformat(), 
       'message': 'Email simulated (mock mode enabled)' 
   } 
 
# Production mode with SendGrid (disabled for safety) 
# This code path is intentionally not active 
return { 
   'success': False, 
   'mode': 'production', 
   'error': 'Production email sending is disabled. Enable by setting MOCK_EMAIL_MODE=False' 
} 
 

def batch_send_emails(leads: list, score_threshold: int = 70) -> Dict[str, Any]: """ Send emails to qualified leads 

Args: 
   leads: List of scored leads 
   score_threshold: Minimum score for outreach 
    
Returns: 
   Summary of email sending results 
""" 
results = { 
   'total_leads': len(leads), 
   'qualified': 0, 
   'sent': 0, 
   'failed': 0, 
   'details': [] 
} 
 
for lead in leads: 
   score = lead.get('score', 0) 
   if score >= score_threshold: 
       results['qualified'] += 1 
        
       email_result = send_email(lead.get('email'), lead) 
        
       if email_result.get('success'): 
           results['sent'] += 1 
       else: 
           results['failed'] += 1 
        
       results['details'].append({ 
           'lead_name': lead.get('name'), 
           'email': lead.get('email'), 
           'score': score, 
           'result': email_result 
       }) 
 
return results 
