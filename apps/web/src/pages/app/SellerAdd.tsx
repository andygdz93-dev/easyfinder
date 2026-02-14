import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../lib/api";

type ListingFormState = {
  title: string;
  category: string;
  year: string;
  make: string;
  model: string;
  hours: string;
  price: string;
  state: string;
  operable: boolean;
  description: string;
};

type ImagePreview = {
  file: File;
  previewUrl: string;
};

const CATEGORIES = ["Excavator", "Loader", "Dozer", "Grader", "Lift", "Truck", "Other"];
const US_STATES = ["CA", "TX", "FL", "NY", "WA", "IL", "GA", "NC", "Other"];

const INITIAL_FORM: ListingFormState = {
  title: "",
  category: "",
  year: "",
  make: "",
  model: "",
  hours: "",
  price: "",
  state: "",
  operable: true,
  description: "",
};

export const SellerAdd = () => {
  const { token, user } = useAuth();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(),
    enabled: Boolean(token && user),
  });

  const [form, setForm] = useState<ListingFormState>(INITIAL_FORM);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plan = meQuery.data?.billing?.plan ?? "free";
  const listingLimitLabel =
    typeof meQuery.data?.billing?.entitlements?.maxActiveListings === "number"
      ? String(meQuery.data.billing.entitlements.maxActiveListings)
      : plan === "enterprise"
        ? "Unlimited"
        : plan === "pro"
          ? "200"
          : "25";

  const canAddMoreImages = images.length < 5;

  useEffect(() => {
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [images]);

  const planNotice = useMemo(() => {
    if (plan === "enterprise") return "Your Enterprise plan supports Unlimited active listings.";
    if (plan === "pro") return "Your Pro plan supports 200 active listings.";
    return "Your Free plan supports 25 active listings.";
  }, [plan]);

  const updateField = <K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const incoming = Array.from(fileList);
    const remainingSlots = 5 - images.length;

    if (remainingSlots <= 0) {
      setError("You can upload a maximum of 5 images.");
      event.target.value = "";
      return;
    }

    const accepted = incoming.slice(0, remainingSlots).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    if (incoming.length > remainingSlots) {
      setError("Only 5 images are allowed. Extra files were ignored.");
    } else {
      setError(null);
    }

    setImages((prev) => [...prev, ...accepted]);
    event.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const target = prev[index];
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage("Listing creation coming soon");
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold">Add a listing</h2>
        <p className="mt-2 text-sm text-slate-400">Complete the form below to prepare your listing.</p>
        <p className="mt-2 text-xs text-slate-500">
          Plan listing limit: {listingLimitLabel}. {planNotice}
        </p>
      </Card>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Title</span>
              <Input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="2020 Caterpillar 320"
                required
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Category</span>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
                required
              >
                <option value="">Select category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Year</span>
              <Input
                type="number"
                min={1900}
                max={2100}
                value={form.year}
                onChange={(event) => updateField("year", event.target.value)}
                required
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Make</span>
              <Input
                value={form.make}
                onChange={(event) => updateField("make", event.target.value)}
                placeholder="Caterpillar"
                required
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Model</span>
              <Input
                value={form.model}
                onChange={(event) => updateField("model", event.target.value)}
                placeholder="320"
                required
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Hours</span>
              <Input
                type="number"
                min={0}
                value={form.hours}
                onChange={(event) => updateField("hours", event.target.value)}
                required
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Price</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
                required
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>State</span>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                value={form.state}
                onChange={(event) => updateField("state", event.target.value)}
                required
              >
                <option value="">Select state</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.operable}
              onChange={(event) => updateField("operable", event.target.checked)}
            />
            Operable
          </label>

          <label className="space-y-2 text-sm text-slate-200">
            <span>Description</span>
            <textarea
              className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Add condition, maintenance history, and sale details"
              required
            />
          </label>

          <div className="space-y-2">
            <label className="text-sm text-slate-200" htmlFor="listing-images">Images (max 5)</label>
            <input
              id="listing-images"
              type="file"
              accept="image/*"
              multiple
              disabled={!canAddMoreImages}
              onChange={handleImageChange}
              className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-sm file:text-slate-100"
            />
            <p className="text-xs text-slate-500">{images.length}/5 images selected.</p>
            {images.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {images.map((image, index) => (
                  <div key={`${image.file.name}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900 p-2">
                    <img
                      src={image.previewUrl}
                      alt={image.file.name}
                      className="h-24 w-full rounded object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="mt-2 w-full rounded-md border border-rose-500/60 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Submit listing
          </button>
        </form>
      </Card>
    </div>
  );
};
