import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional


class ActivityLogger:
    """
    Lightweight in-memory activity logger.
    Safe for MVP / demo / dev.
    Replace with DB / queue later if needed.
    """

    def __init__(self):
        self._logs: List[Dict[str, Any]] = []

    # -------------------------
    # Internal helper
    # -------------------------
    def _log(
        self,
        event_type: str,
        status: str,
        data: Dict[str, Any]
    ) -> None:
        self._logs.append({
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "status": status,
            "data": data
        })

    # -------------------------
    # Public log methods
    # -------------------------
    def log_lead_scored(
        self,
        name: str,
        score: int,
        priority: str
    ) -> None:
        self._log(
            event_type="lead_scored",
            status="success",
            data={
                "name": name,
                "score": score,
                "priority": priority
            }
        )

    def log_csv_upload(
        self,
        filename: str,
        total_rows: int
    ) -> None:
        self._log(
            event_type="csv_upload",
            status="success",
            data={
                "filename": filename,
                "rows_processed": total_rows
            }
        )

    def log_email_sent(
        self,
        name: str,
        email: str,
        provider: str = "mock"
    ) -> None:
        self._log(
            event_type="email_sent",
            status="success",
            data={
                "name": name,
                "email": email,
                "provider": provider
            }
        )

    def log_leads_processed(
        self,
        total: int,
        qualified: int,
        emails_sent: int
    ) -> None:
        self._log(
            event_type="leads_processed",
            status="success",
            data={
                "total": total,
                "qualified": qualified,
                "emails_sent": emails_sent
            }
        )

    def log_error(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        self._log(
            event_type="error",
            status="failure",
            data={
                "message": message,
                "context": context or {}
            }
        )

    # -------------------------
    # Retrieval / maintenance
    # -------------------------
    def get_logs(
        self,
        limit: int = 100,
        event_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        logs = self._logs

        if event_type:
            logs = [l for l in logs if l["event_type"] == event_type]

        return logs[-limit:]

    def clear_logs(self) -> None:
        self._logs.clear()


# -------------------------------------------------
# Singleton instance
# -------------------------------------------------

activity_logger = ActivityLogger()
