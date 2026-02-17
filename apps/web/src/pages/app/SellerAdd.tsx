import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { ApiError, createSellerListing, getMe } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";

type ListingFormState = {
  title: string;
  description: string;
  location: string;
  condition: string;
  price: string;
  hours: string;
  year: string;
  make: string;
  model: string;
  category: string;
  images: string[];
};

const INITIAL_FORM: ListingFormState = {
  title: "",
  description: "",
  location: "",
  condition: "",
  price: "",
  hours: "",
  year: "",
  make: "",
  model: "",
  category: "",
  images: [""],
};

export const SellerAdd = () => {
  const { token, user } = useAuth();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(),
    enabled: Boolean(token && user),
  });

  const [form, setForm] = useState<ListingFormState>(INITIAL_FORM);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; meta?: string; details: string[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const plan = meQuery.data?.billing?.plan ?? "free";
  const listingLimitLabel =
    typeof meQuery.data?.billing?.entitlements?.maxActiveListings === "number"
      ? String(meQuery.data.billing.entitlements.maxActiveListings)
      : plan === "enterprise"
        ? "Unlimited"
        : plan === "pro"
          ? "200"
          : "25";

  const planNotice = useMemo(() => {
    if (plan === "enterprise") return "Your Enterprise plan supports Unlimited active listings.";
    if (plan === "pro") return "Your Pro plan supports 200 active listings.";
    return "Your Free plan supports 25 active listings.";
  }, [plan]);

  const updateField = <K extends keyof Omit<ListingFormState, "images">>(key: K, value: ListingFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateImage = (index: number, value: string) => {
    setForm((prev) => {
      const images = [...prev.images];
      images[index] = value;
      return { ...prev, images };
    });
  };

  const addImageInput = () => {
    setForm((prev) => {
      if (prev.images.length >= 5) return prev;
      return { ...prev, images: [...prev.images, ""] };
    });
  };

  const removeImageInput = (index: number) => {
    setForm((prev) => {
      const next = prev.images.filter((_, i) => i !== index);
      return { ...prev, images: next.length > 0 ? next : [""] };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      setError({ message: "Please complete all required fields.", details: [] });
      return;
    }

    const sanitizedImages = form.images.map((image) => image.trim()).filter(Boolean).slice(0, 5);
    const invalidImage = sanitizedImages.find((url) => !/^https?:\/\//i.test(url));
    if (invalidImage) {
      setError({ message: "Image URLs must start with http:// or https://.", details: [] });
      return;
    }

    setSubmitting(true);
    try {
      const parsedPrice = form.price ? Number(form.price.replace(/[$,]/g, "").trim()) : null;
      const parsedHours = form.hours ? Number(form.hours.replace(/[$,]/g, "").trim()) : null;
      const parsedYear = form.year ? Number(form.year.trim()) : undefined;

      if (parsedPrice !== null && !Number.isFinite(parsedPrice)) {
        setError({ message: "Price must be a valid number.", details: [] });
        setSubmitting(false);
        return;
      }

      if (parsedHours !== null && !Number.isFinite(parsedHours)) {
        setError({ message: "Hours must be a valid number.", details: [] });
        setSubmitting(false);
        return;
      }

      if (parsedYear !== undefined && !Number.isInteger(parsedYear)) {
        setError({ message: "Year must be a whole number.", details: [] });
        setSubmitting(false);
        return;
      }

      const payload = {
        title: form.title,
        description: form.description,
        location: form.location,
        condition: form.condition || undefined,
        price: parsedPrice as number | null,
        hours: parsedHours as number | null,
        year: parsedYear,
        make: form.make || undefined,
        model: form.model || undefined,
        category: form.category || undefined,
        images: sanitizedImages as string[],
      };

      const result = await createSellerListing(payload);
      setSuccessMessage(`Listing created successfully (ID: ${result.id}).`);
      setForm(INITIAL_FORM);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        const details: string[] = [];
        if (Array.isArray(submitError.details)) {
          details.push(
            ...(submitError.details as { path?: string; message?: string }[]).map(
              (detail) => `${detail.path || "field"}: ${detail.message || "invalid"}`
            )
          );
        } else if (
          submitError.details &&
          typeof submitError.details === "object" &&
          Array.isArray((submitError.details as { missingColumns?: string[] }).missingColumns)
        ) {
          details.push(`missingColumns: ${(submitError.details as { missingColumns: string[] }).missingColumns.join(", ")}`);
        } else if (submitError.details && typeof submitError.details === "object") {
          for (const [key, value] of Object.entries(submitError.details as Record<string, unknown>)) {
            details.push(`${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
          }
        }

        const method = submitError.method ?? "UNKNOWN";
        const url = submitError.url ?? "unknown-url";
        const status = submitError.status ?? "unknown";
        const serverMessage = submitError.message.trim();
        const requestIdMeta = submitError.requestId ? `requestId=${submitError.requestId}` : undefined;

        setError({
          message: `Request failed (${status}) ${method} ${url}${serverMessage ? ` — ${serverMessage}` : ""}${requestIdMeta ? ` — ${requestIdMeta}` : ""}`,
          meta: submitError.code ? `code=${submitError.code}` : undefined,
          details,
        });
      } else {
        setError({
          message: submitError instanceof Error ? submitError.message : "Failed to create listing.",
          details: [],
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold">Add a listing</h2>
        <p className="mt-2 text-sm text-slate-400">Create a listing manually using the form below.</p>
        <p className="mt-2 text-xs text-slate-500">
          Plan listing limit: {listingLimitLabel}. {planNotice}
        </p>
      </Card>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Title *</span>
              <Input value={form.title} onChange={(event) => updateField("title", event.target.value)} required />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span>Location *</span>
              <Input value={form.location} onChange={(event) => updateField("location", event.target.value)} required />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span>Condition</span>
              <Input value={form.condition} onChange={(event) => updateField("condition", event.target.value)} />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span>Category</span>
              <Input value={form.category} onChange={(event) => updateField("category", event.target.value)} />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span>Price</span>
              <Input value={form.price} onChange={(event) => updateField("price", event.target.value)} placeholder="$125,000" />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span>Hours</span>
              <Input value={form.hours} onChange={(event) => updateField("hours", event.target.value)} />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span>Year</span>
              <Input value={form.year} onChange={(event) => updateField("year", event.target.value)} />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span>Make</span>
              <Input value={form.make} onChange={(event) => updateField("make", event.target.value)} />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span>Model</span>
              <Input value={form.model} onChange={(event) => updateField("model", event.target.value)} />
            </label>
          </div>

          <label className="space-y-2 text-sm text-slate-200">
            <span>Description *</span>
            <textarea
              className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              required
            />
          </label>

          <div className="space-y-2">
            <p className="text-sm text-slate-200">Image URLs (up to 5)</p>
            {form.images.map((image, index) => (
              <div key={`image-url-${index}`} className="flex gap-2">
                <Input
                  value={image}
                  onChange={(event) => updateImage(index, event.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <Button type="button" variant="outline" onClick={() => removeImageInput(index)}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addImageInput} disabled={form.images.length >= 5}>
              Add image URL
            </Button>
          </div>

          {error ? (
            <div className="rounded-md border border-rose-700/40 bg-rose-950/30 p-3 text-sm text-rose-200">
              <p className="font-medium">{error.message}</p>
              {error.meta ? <p className="mt-1 text-xs text-rose-300">{error.meta}</p> : null}
              {error.details.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-200">
                  {error.details.map((detail, idx) => (
                    <li key={`${detail}-${idx}`}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {successMessage ? (
            <div className="rounded-md border border-emerald-700/40 bg-emerald-950/30 p-3 text-sm text-emerald-200">
              <p>{successMessage}</p>
              <Link className="mt-2 inline-block underline" to="/app/seller/listings">
                Go to seller listings
              </Link>
            </div>
          ) : null}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create listing"}
          </Button>
        </form>
      </Card>
    </div>
  );
};
