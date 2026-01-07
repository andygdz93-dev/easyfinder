"""
Email Outreach Module for EasyFinder (Mock Mode)
"""

import logging
from typing import Dict, Any, List
from datetime import datetime, timezone

from .config import MOCK_EMAIL_MODE, FROM_EMAIL, SENDGRID_API_KEY

logger = logging.getLogger(__name__)


# -------------------------------------------------
# EMAIL TEMPLATE
# -------------------------------------------------

def get_email_template(lead: Dict[str, Any]) -> Dict[str, str]:
    """Generate email content for a lead"""

    subject = f"Partnership Opportunity - {lead.get('company', 'Your Company')}"

    body = f"""
Dear {lead.get('name', 'Valued Partner')},

I hope this email finds you well. We've identified {lead.get('company', 'your company')}
as a potential partner for our enterprise solutions.

Based on your company profile:

Industry: {lead.get('industry', 'N/A')}
Company Size: {lead.get('company_size', 'N/A')}

We believe there's a strong fit for collaboration. Our team would love to schedule
a brief call to discuss how we can help {lead.get('company', 'your company')} achieve its goals.

Key benefits we offer:
• Streamlined lead management and scoring
• Automated outreach campaigns
• Enterprise-grade security and compliance
• Detailed analytics and reporting

Would you be available for a 15-minute call this week?

Best regards,
EasyFinder AI Team
demo@easyfinder.ai

This is an automated message from EasyFinder AI.
If you wish to unsubscribe, please reply with "UNSUBSCRIBE".
"""

    html_body = f"""
<html>
  <body>
    <h2>EasyFinder AI</h2>

    <p>Dear {lead.get('name', 'Valued Partner')},</p>

    <p>
      We've identified <strong>{lead.get('company', 'your company')}</strong>
      as a potential partner for our enterprise solutions.
    </p>

    <div style="padding:10px;border:1px solid #ddd;margin:15px 0;">
      <strong>Your Company Profile</strong><br>
      Industry: {lead.get('industry', 'N/A')}<br>
      Company Size: {lead.get('company_size', 'N/A')}
    </div>

    <p>Key benefits we offer:</p>
    <ul>
      <li>Streamlined lead management and scoring</li>
      <li>Automated outreach campaigns</li>
      <li>Enterprise-grade security and compliance</li>
      <li>Detailed analytics and reporting</li>
    </ul>

    <p>Would you be available for a 15-minute call this week?</p>

    <p>
      Best regards,<br>
      <strong>EasyFinder AI Team</strong>
    </p>

    <hr>
    <small>
      This is an automated message from EasyFinder AI.<br>
      Reply with "UNSUBSCRIBE" to opt out.
    </small>
  </body>
</html>
"""

    return {
        "subject": subject,
        "body": body,
        "html_body": html_body,
    }


# -------------------------------------------------
# SEND EMAIL (MOCK MODE)
# -------------------------------------------------

def send_email(to_email: str, lead: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send email to lead (MOCK MODE ONLY)

    Returns a simulated response.
    """

    template = get_email_template(lead)

    # Always mock for safety
    if MOCK_EMAIL_MODE or SENDGRID_API_KEY == "mock_key":
        logger.info(f"[MOCK EMAIL] To: {to_email}")
        logger.info(f"[MOCK EMAIL] Subject: {template['subject']}")

        return {
            "success": True,
            "mode": "mock",
            "to": to_email,
            "from": FROM_EMAIL,
            "subject": template["subject"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Email simulated (mock mode enabled)",
        }

    # Production disabled intentionally
    return {
        "success": False,
        "mode": "production",
        "error": "Production email sending is disabled",
    }


# -------------------------------------------------
# BATCH SEND
# -------------------------------------------------

def batch_send_emails(leads: List[Dict[str, Any]], score_threshold: int = 70) -> Dict[str, Any]:
    """Send emails to qualified leads"""

    results = {
        "total_leads": len(leads),
        "qualified": 0,
        "sent": 0,
        "failed": 0,
        "details": [],
    }

    for lead in leads:
        score = lead.get("score", 0)

        if score < score_threshold:
            continue

        results["qualified"] += 1

        email_result = send_email(lead.get("email"), lead)

        if email_result.get("success"):
            results["sent"] += 1
        else:
            results["failed"] += 1

        results["details"].append({
            "lead_name": lead.get("name"),
            "email": lead.get("email"),
            "score": score,
            "result": email_result,
        })

    return results
