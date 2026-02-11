export function audit(event: string, meta: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      type: "AUDIT_EVENT",
      event,
      timestamp: new Date().toISOString(),
      ...meta,
    })
  );
}
