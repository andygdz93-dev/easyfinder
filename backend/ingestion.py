"""CSV Lead Ingestion for EasyFinder"""

import csv
import io
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

REQUIRED_COLUMNS = ['name', 'email', 'company', 'company_size', 'industry', 'budget']
OPTIONAL_COLUMNS = ['phone', 'website']


def validate_csv_columns(headers: List[str]) -> tuple[bool, List[str]]:
    """ Validate that required columns are present """
    headers_lower = [h.lower().strip() for h in headers]
    missing = [col for col in REQUIRED_COLUMNS if col not in headers_lower]
    return len(missing) == 0, missing


def parse_csv_content(content: str) -> tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Parse CSV content and return list of lead dictionaries

    Args:
        content: CSV file content as string

    Returns:
        Tuple of (leads list, error message or None)
    """
    try:
        # Handle BOM and normalize line endings
        content = content.lstrip('\ufeff').replace('\r\n', '\n').replace('\r', '\n')

        reader = csv.DictReader(io.StringIO(content))

        if not reader.fieldnames:
            return [], "Empty CSV file or no headers found"

        # Normalize headers
        reader.fieldnames = [h.lower().strip() for h in reader.fieldnames]

        # Validate columns
        is_valid, missing = validate_csv_columns(reader.fieldnames)
        if not is_valid:
            return [], f"Missing required columns: {', '.join(missing)}"

        leads = []
        for row_num, row in enumerate(reader, start=2):
            # Clean up row data
            lead = {
                'name': row.get('name', '').strip(),
                'email': row.get('email', '').strip().lower(),
                'company': row.get('company', '').strip(),
                'company_size': row.get('company_size', '').strip().lower(),
                'industry': row.get('industry', '').strip(),
                'budget': row.get('budget', '0'),
                'phone': row.get('phone', '').strip(),
                'website': row.get('website', '').strip(),
                'source': 'csv_upload',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'row_number': row_num
            }

            # Skip empty rows
            if not lead['name'] or not lead['email']:
                continue

            leads.append(lead)

        return leads, None

    except csv.Error as e:
        return [], f"CSV parsing error: {str(e)}"
    except Exception as e:
        return [], f"Unexpected error: {str(e)}"


def generate_sample_csv() -> str:
    """ Generate sample CSV content for testing """
    return """name,email,company,company_size,industry,budget,phone,website
John Smith,john@techcorp.com,TechCorp,enterprise,construction,75000,+1-555-0101,techcorp.com
Sarah Johnson,sarah@logisticspro.com,LogisticsPro,medium,logistics,55000,+1-555-0102,logisticspro.com
Michael Chen,michael@smallbiz.com,SmallBiz Inc,small,retail,15000,+1-555-0103,smallbiz.com
Emily Davis,emily@heavyequip.com,Heavy Equipment Co,enterprise,equipment,120000,+1-555-0104,heavyequip.com
David Wilson,david@startuphub.io,StartupHub,medium,technology,35000,+1-555-0105,startuphub.io
Lisa Anderson,lisa@constructall.com,ConstructAll LLC,enterprise,construction,95000,+1-555-0106,constructall.com
Robert Taylor,robert@localshop.com,LocalShop,small,retail,8000,+1-555-0107,localshop.com
Jennifer Martinez,jennifer@fastfreight.com,FastFreight,medium,logistics,48000,+1-555-0108,fastfreight.com
"""