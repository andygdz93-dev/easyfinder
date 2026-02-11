export function audit(event: string, meta: Record<string, any>) {
  console.log(
    JSON.stringify({
      type: "AUDIT",
      event,
      timestamp: new Date().toISOString(),
      ...meta,
    })
  );
}
