import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../lib/auth";
import { getMe, importSellerListings, ApiError } from "../../lib/api";
import { canUseSellerCsvUpload } from "../../lib/billing";

const REQUIRED_HEADERS = [
  "title",
  "make",
  "model",
  "year",
  "hours",
  "price",
  "condition",
  "state",
  "description",
  "image1",
  "image2",
  "image3",
  "image4",
  "image5",
] as const;

const REQUIRED_FIELDS = [
  "title",
  "make",
  "model",
  "year",
  "state",
  "condition",
  "description",
] as const;
const REQUIRED_HEADERS_DISPLAY = REQUIRED_HEADERS.join(",");

type UploadValidationResult = {
  rowsDetected: number;
  validRows: number;
  invalidRows: number;
  errors: string[];
};

type UploadResult = {
  created: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
};

const isValidUrlLike = (value: string) => value.startsWith("http");

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
};

const parseCsv = (csvText: string) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { header: [] as string[], rows: [] as Record<string, string>[] };
  }

  const header = parseCsvLine(lines[0]);
  if (header.length > 0) {
    header[0] = header[0].replace(/^\uFEFF/, "");
  }
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return header.reduce<Record<string, string>>((row, key, index) => {
      row[key] = values[index] ?? "";
      return row;
    }, {});
  });

  return { header, rows };
};

const quoteCsvValue = (value: string) => `"${String(value).replace(/"/g, '""')}"`;

export const SellerUpload = () => {
  const { token, user, isUserLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [validation, setValidation] = useState<UploadValidationResult | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const rows = Array.isArray(parsedRows) ? parsedRows : [];
  const validationErrors = validation?.errors ?? [];
  const uploadErrors = uploadResult?.errors ?? [];

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(),
    enabled: Boolean(token && user && user.role === "seller"),
  });

  if (!token) return null;

  if (isUserLoading || !user || meQuery.isLoading) {
    return (
      <Card>
        <p className="text-sm text-slate-300">Loading…</p>
      </Card>
    );
  }

  const plan = meQuery.data?.billing?.plan ?? "free";
  const role = user?.role ?? null;
  const canUseCsvUpload = canUseSellerCsvUpload(
    role,
    plan,
    meQuery.data?.billing?.entitlements?.csvUpload
  );

  if (!canUseCsvUpload) {
    return <Navigate to="/app/upgrade" replace />;
  }

  const downloadTemplate = () => {
    const BOM = "\uFEFF";
    const header = [
      "title",
      "make",
      "model",
      "year",
      "hours",
      "price",
      "condition",
      "state",
      "description",
      "image1",
      "image2",
      "image3",
      "image4",
      "image5",
    ]
      .map(quoteCsvValue)
      .join(",");

    const sample = [
      "Example title",
      "Caterpillar",
      "D6T",
      "2020",
      "1800",
      "178000",
      "good",
      "CA",
      "Example description",
      "https://example.com/img1.jpg",
      "",
      "",
      "",
      "",
    ]
      .map(quoteCsvValue)
      .join(",");

    const csv = BOM + header + "\r\n" + sample + "\r\n";
    const blob = new Blob([csv], { type: "text/csv; charset=utf-8" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "easyfinder_template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const validateCsv = async () => {
    setUploadResult(null);
    setUploadError(null);

    if (!file) {
      setParsedRows([]);
      setValidation({
        rowsDetected: 0,
        validRows: 0,
        invalidRows: 0,
        errors: ["Please choose a CSV file before validation."],
      });
      return;
    }

    const raw = await file.text();
    const parsed = parseCsv(raw);
    const errors: string[] = [];

    const headerMatches =
      parsed.header.length === REQUIRED_HEADERS.length &&
      REQUIRED_HEADERS.every(
        (header, index) => parsed.header[index] === header,
      );

    if (!headerMatches) {
      errors.push(`Header mismatch. Expected: ${REQUIRED_HEADERS.join(",")}`);
    }

    let validRows = 0;
    let invalidRows = 0;

    parsed.rows.forEach((row, rowIndex) => {
      const rowErrors: string[] = [];

      REQUIRED_FIELDS.forEach((field) => {
        if (!String(row[field] ?? "").trim()) {
          rowErrors.push(`Row ${rowIndex + 2}: ${field} is required.`);
        }
      });

      if (row.year && !/^\d+$/.test(String(row.year).trim())) {
        rowErrors.push(`Row ${rowIndex + 2}: year must be an integer.`);
      }

      if (row.hours && Number.isNaN(Number(row.hours))) {
        rowErrors.push(
          `Row ${rowIndex + 2}: hours must be numeric when provided.`,
        );
      }

      if (row.price && Number.isNaN(Number(row.price))) {
        rowErrors.push(
          `Row ${rowIndex + 2}: price must be numeric when provided.`,
        );
      }

      if (
        row.condition &&
        !["excellent", "good", "fair", "needs_repair"].includes(
          String(row.condition).trim(),
        )
      ) {
        rowErrors.push(
          `Row ${rowIndex + 2}: condition must be one of excellent|good|fair|needs_repair.`,
        );
      }

      ["image1", "image2", "image3", "image4", "image5"].forEach(
        (imageField) => {
          const value = String(row[imageField] ?? "").trim();
          if (value && !isValidUrlLike(value)) {
            rowErrors.push(
              `Row ${rowIndex + 2}: ${imageField} must start with http when provided.`,
            );
          }
        },
      );

      if (rowErrors.length > 0 || !headerMatches) {
        invalidRows += 1;
        errors.push(...rowErrors);
      } else {
        validRows += 1;
      }
    });

    setParsedRows(headerMatches ? parsed.rows : []);
    setValidation({
      rowsDetected: parsed.rows.length,
      validRows,
      invalidRows,
      errors,
    });
  };

  const canUpload = Boolean(
    validation &&
    validation.validRows > 0 &&
    validation.invalidRows === 0 &&
    rows.length > 0,
  );

  const onUpload = async () => {
    if (!canUpload) return;

    setUploading(true);
    setUploadResult(null);
    setUploadError(null);

    try {
      const result = await importSellerListings(rows);
      setUploadResult(result);
      await queryClient.invalidateQueries({ queryKey: ["seller-listings"] });
      if (result.created > 0 && result.failed === 0) {
        navigate("/app/seller/listings");
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold">Upload inventory</h2>
        <p className="mt-2 text-sm text-slate-400">
          Bulk upload listings using a CSV template.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Instructions</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>Download the template.</li>
          <li>Each row is one listing.</li>
          <li>Images are optional via columns image1..image5 (URLs).</li>
          <li>
            Manual image upload will be supported later if not implemented
            today.
          </li>
        </ul>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Required columns</h3>
        <p className="mt-2 break-all text-sm text-slate-300">
          {REQUIRED_HEADERS_DISPLAY}
        </p>
        <p className="mt-2 text-sm text-slate-300">
          condition: excellent | good | fair | needs_repair
        </p>
        <Button className="mt-4" onClick={downloadTemplate}>
          Download CSV template
        </Button>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Validate CSV</h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="file"
            accept=".csv"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setFile(nextFile);
              setValidation(null);
              setParsedRows([]);
              setUploadResult(null);
              setUploadError(null);
            }}
          />
          <Button onClick={validateCsv}>Validate CSV</Button>
        </div>

        {validation ? (
          <div className="mt-4 rounded-md border border-slate-700 p-4 text-sm text-slate-200">
            <p>rows detected: {validation.rowsDetected}</p>
            <p>valid rows: {validation.validRows}</p>
            <p>invalid rows: {validation.invalidRows}</p>
            <div className="mt-2">
              <p className="font-medium">first 10 validation errors</p>
              {validationErrors.length === 0 ? (
                <p className="mt-1 text-emerald-300">No validation errors.</p>
              ) : (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-rose-300">
                  {validationErrors.slice(0, 10).map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        {validation ? (
          <Button
            className="mt-4"
            onClick={onUpload}
            disabled={!canUpload || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        ) : null}

        {uploadResult ? (
          <div className="mt-4 rounded-md border border-emerald-700/40 bg-emerald-950/30 p-4 text-sm text-emerald-200">
            <p>created: {uploadResult.created}</p>
            <p>failed: {uploadResult.failed}</p>
            {uploadErrors.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-rose-300">
                {uploadErrors.slice(0, 10).map((error, index) => (
                  <li key={`${error.row}-${index}`}>
                    Row {error.row}: {error.message ?? String(error)}
                  </li>
                ))}
              </ul>
            ) : null}
            {uploadResult.created > 0 ? (
              <Button className="mt-3" onClick={() => navigate("/app/seller/listings")}>
                View listings
              </Button>
            ) : null}
          </div>
        ) : null}

        {uploadError ? (
          <div className="mt-4 rounded-md border border-rose-700/50 bg-rose-950/30 p-4 text-sm text-rose-200">
            {uploadError}
          </div>
        ) : null}
      </Card>
    </div>
  );
};
