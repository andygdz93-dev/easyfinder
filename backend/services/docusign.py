def send_for_signature(email: str, nda_id: str):
    return {
        "envelope_id": f"env_{nda_id}",
        "status": "sent"
    }
