import { createContext, useContext, useMemo, useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { demoListings } from "@easyfinderai/shared";
import DemoListings from "./Listings";
import DemoListingDetail from "./ListingDetail";
import { DemoWatchlist } from "./Watchlist";
import { useDemoWatchlist } from "../../lib/demoWatchlist";

type TourRole = "buyer" | "seller";

type SellerListing = {
  id: string;
  title: string;
  category: string;
  price: string;
  hours: string;
  state: string;
  images: string[];
  source: "manual" | "csv";
};

type DemoTourState = {
  ndaAccepted: boolean;
  contactEmailDraft: { subject: string; body: string };
  lastActionMessage: string;
  sellerListings: SellerListing[];
  setNdaAccepted: (value: boolean) => void;
  setContactEmailDraft: (value: { subject: string; body: string }) => void;
  setLastActionMessage: (value: string) => void;
  addSellerListing: (listing: SellerListing) => void;
  addSellerListings: (listings: SellerListing[]) => void;
};

const DemoTourContext = createContext<DemoTourState | null>(null);

const useDemoTour = () => {
  const context = useContext(DemoTourContext);
  if (!context) {
    throw new Error("useDemoTour must be used within DemoTourContext");
  }
  return context;
};

const DemoTourProvider = ({ children }: { children: React.ReactNode }) => {
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [contactEmailDraft, setContactEmailDraft] = useState({
    subject: "Follow-up on Equipment Listing",
    body:
      "Hello EasyFinder team,\n\nWe reviewed the listing and would like to discuss pricing, inspection details, and availability windows. Please share the next steps and a recommended contact time.\n\nThank you,\nBuyer Operations",
  });
  const [lastActionMessage, setLastActionMessage] = useState("");
  const [sellerListings, setSellerListings] = useState<SellerListing[]>([]);

  const addSellerListing = (listing: SellerListing) => {
    setSellerListings((prev) => [...prev, listing]);
  };

  const addSellerListings = (listings: SellerListing[]) => {
    if (!listings.length) return;
    setSellerListings((prev) => [...prev, ...listings]);
  };

  const value = useMemo(
    () => ({
      ndaAccepted,
      contactEmailDraft,
      lastActionMessage,
      sellerListings,
      setNdaAccepted,
      setContactEmailDraft,
      setLastActionMessage,
      addSellerListing,
      addSellerListings,
    }),
    [
      addSellerListings,
      contactEmailDraft,
      lastActionMessage,
      ndaAccepted,
      sellerListings,
    ]
  );

  return <DemoTourContext.Provider value={value}>{children}</DemoTourContext.Provider>;
};

const buyerSteps = [
  {
    id: 1,
    title: "Ranked Listings",
    description:
      "EasyFinder scores every listing using operational fit, hours, location, and price signals. Buyers see the top-ranked inventory first so they can prioritize capital-efficient options. The ranking also highlights data completeness and confidence for each item.",
  },
  {
    id: 2,
    title: "View Details",
    description:
      "Each listing opens a focused detail view with a rich image gallery. Buyers can review specs, condition notes, and scoring rationale in one place. This reduces time-to-decision and keeps teams aligned on why a listing ranks highly.",
  },
  {
    id: 3,
    title: "NDA Requirement",
    description:
      "Sensitive seller data is gated behind an NDA acceptance step. Buyers must agree before they can proceed to outreach or access proprietary documents. This keeps seller relationships protected while still enabling fast buyer workflows.",
  },
  {
    id: 4,
    title: "Contact Seller (via EasyFinder)",
    description:
      "Outreach is routed through EasyFinder for visibility and auditability. Buyers draft a message in-platform so the team can track engagement status, timing, and follow-ups. Everything stays centralized for compliance.",
  },
  {
    id: 5,
    title: "Watchlist + Limits Preview",
    description:
      "Watchlists help buyers organize opportunities and enforce plan-based limits. Live enforcement happens server-side; this demo illustrates the experience without any backend calls. Teams can quickly see what is saved and how plan limits apply.",
  },
  {
    id: 6,
    title: "Upgrade / Enterprise CTA",
    description:
      "When buyers need enterprise controls, plan upgrades unlock advanced sourcing and governance tools. The upgrade path is clear so teams can move from demo to production quickly. Enterprise plans unlock broader access and controls.",
  },
];

const sellerSteps = [
  {
    id: 1,
    title: "Seller Dashboard Overview",
    description:
      "Seller tools are separate from Buyer workflows. This dashboard highlights your owned listings and activity at a glance so you can track active inventory and status updates.",
  },
  {
    id: 2,
    title: "Manual Listing Entry",
    description:
      "Sellers can create listings manually when they have a small number of assets. Key fields and image previews help ensure listings are ready for buyer discovery.",
  },
  {
    id: 3,
    title: "CSV Upload",
    description:
      "Bulk uploads make it easy to onboard inventory. A lightweight CSV parser previews what will be added before import to keep listings consistent.",
  },
  {
    id: 4,
    title: "Seller Listings View",
    description:
      "All listings created in this demo stay local and appear here immediately. This mirrors how sellers would manage their inventory in production.",
  },
  {
    id: 5,
    title: "Offers Preview",
    description:
      "Seller inquiries appear in a unified queue so teams can respond quickly. This demo shows a static preview of incoming offers.",
  },
  {
    id: 6,
    title: "Enterprise Upgrade CTA",
    description:
      "Enterprise sellers unlock advanced controls, analytics, and support. Upgrading ensures larger inventories and compliance needs are covered.",
  },
];

const createListingId = () => Math.random().toString(36).slice(2, 9);

const parseCsvRows = (text: string) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((value) => value.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((value) => value.trim());
    const row: Record<string, string> = {};
    header.forEach((key, index) => {
      row[key] = cells[index] ?? "";
    });
    return row;
  });
};

export const DemoTour = () => {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<TourRole>("buyer");

  const steps = role === "buyer" ? buyerSteps : sellerSteps;
  const currentStep = steps.find((item) => item.id === step) ?? steps[0];

  return (
    <DemoTourProvider>
      <div className="relative min-h-screen bg-slate-950 text-white">
        <div className="relative z-0">
          {!started ? (
            <TourIntro
              role={role}
              onRoleChange={setRole}
              onStart={() => setStarted(true)}
            />
          ) : (
            <TourStepContent step={step} role={role} />
          )}
        </div>

        {started ? (
          <TourOverlay
            step={step}
            title={currentStep.title}
            description={currentStep.description}
            onBack={() => setStep((prev) => Math.max(1, prev - 1))}
            onNext={() => setStep((prev) => Math.min(steps.length, prev + 1))}
            onExit={() => {
              setStarted(false);
              setStep(1);
            }}
            role={role}
          />
        ) : null}
      </div>
    </DemoTourProvider>
  );
};

const TourIntro = ({
  role,
  onRoleChange,
  onStart,
}: {
  role: TourRole;
  onRoleChange: (role: TourRole) => void;
  onStart: () => void;
}) => (
  <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 md:px-6">
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-200">
        Demo tour
      </p>
      <h1 className="mt-3 text-3xl font-semibold">Buyer Experience Walkthrough</h1>
      <p className="mt-3 max-w-2xl text-base text-slate-200">
        This guided tour walks through the buyer workflow using demo-only data. No logins,
        payments, or backend calls are required. Choose a role to begin.
      </p>
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200/30 bg-slate-900/60 p-4">
          <input
            id="role-buyer"
            type="radio"
            checked={role === "buyer"}
            onChange={() => onRoleChange("buyer")}
            className="h-4 w-4 accent-amber-300"
          />
          <label htmlFor="role-buyer" className="text-sm font-semibold">
            Buyer
          </label>
          <span className="text-xs text-slate-300">Ranked listings to outreach.</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <input
            id="role-seller"
            type="radio"
            checked={role === "seller"}
            onChange={() => onRoleChange("seller")}
            className="h-4 w-4 accent-amber-300"
          />
          <label htmlFor="role-seller" className="text-sm font-semibold">
            Seller
          </label>
          <span className="text-xs text-slate-300">List inventory and manage offers.</span>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 md:w-auto"
        >
          Start {role === "buyer" ? "Buyer" : "Seller"} Tour
        </button>
      </div>
    </div>
  </div>
);

const TourOverlay = ({
  step,
  title,
  description,
  onBack,
  onNext,
  onExit,
  role,
}: {
  step: number;
  title: string;
  description: string;
  onBack: () => void;
  onNext: () => void;
  onExit: () => void;
  role: TourRole;
}) => {
  const { ndaAccepted } = useDemoTour();
  const nextDisabled = role === "buyer" && step === 3 && !ndaAccepted;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex">
      <div className="flex-1 bg-black/60" />
      <aside className="pointer-events-auto w-full max-w-[400px] border-l border-white/10 bg-slate-950/95 p-6 backdrop-blur">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Step {step} of 6
          </p>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm leading-relaxed text-slate-200">{description}</p>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={step === 1}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={step === 6 || nextDisabled}
              className="rounded-full bg-amber-300 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-40"
            >
              Next
            </button>
          </div>
          {nextDisabled ? (
            <p className="text-xs text-amber-200">
              Accept the NDA to continue.
            </p>
          ) : null}
          <button
            type="button"
            onClick={onExit}
            className="text-left text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Exit tour
          </button>
        </div>
      </aside>
    </div>
  );
};

const TourStepContent = ({ step, role }: { step: number; role: TourRole }) => {
  if (role === "seller") {
    switch (step) {
      case 1:
        return <TourSellerDashboard />;
      case 2:
        return <TourSellerManualEntry />;
      case 3:
        return <TourSellerCsvUpload />;
      case 4:
        return <TourSellerListings />;
      case 5:
        return <TourSellerOffers />;
      case 6:
        return <TourSellerUpgradeCta />;
      default:
        return null;
    }
  }

  switch (step) {
    case 1:
      return <DemoListings />;
    case 2:
      return <TourListingDetail />;
    case 3:
      return <TourNdaPreview />;
    case 4:
      return <TourEmailComposer />;
    case 5:
      return <TourWatchlistPreview />;
    case 6:
      return <TourUpgradeCta />;
    default:
      return null;
  }
};

const TourListingDetail = () => {
  const listing = demoListings[0];

  if (!listing?.id) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-6 text-sm text-rose-100">
          Demo listing not available.
        </div>
      </div>
    );
  }

  return (
    <MemoryRouter initialEntries={[`/demo/listings/${listing.id}`]}>
      <Routes>
        <Route path="/demo/listings/:id" element={<DemoListingDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

const TourSellerDashboard = () => {
  const { sellerListings } = useDemoTour();
  const manualCount = sellerListings.filter((listing) => listing.source === "manual").length;
  const csvCount = sellerListings.filter((listing) => listing.source === "csv").length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Seller Dashboard</h2>
        <p className="mt-2 text-sm text-slate-200">
          Sellers manage their inventory separately from buyers. This dashboard keeps the focus
          on your listings and activity.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total listings</p>
            <p className="mt-2 text-2xl font-semibold">{sellerListings.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Manual entries</p>
            <p className="mt-2 text-2xl font-semibold">{manualCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">CSV imports</p>
            <p className="mt-2 text-2xl font-semibold">{csvCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const TourSellerManualEntry = () => {
  const { addSellerListing } = useDemoTour();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const handleImages = (files: FileList | null) => {
    if (!files) return;
    const nextImages = Array.from(files)
      .slice(0, 5)
      .map((file) => URL.createObjectURL(file));
    setImages(nextImages);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    addSellerListing({
      id: createListingId(),
      title: title.trim() || "Untitled listing",
      category: category.trim() || "Uncategorized",
      price: price.trim(),
      hours: hours.trim(),
      state: stateValue.trim() || "—",
      images,
      source: "manual",
    });
    setTitle("");
    setCategory("");
    setPrice("");
    setHours("");
    setStateValue("");
    setImages([]);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Manual Listing Entry</h2>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block text-sm">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Category
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Price
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Hours
            <input
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            State
            <input
              value={stateValue}
              onChange={(event) => setStateValue(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Upload images (1–5)
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => handleImages(event.target.files)}
              className="mt-2 w-full text-xs text-slate-300"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-full bg-amber-300 px-5 py-2 text-xs font-semibold text-slate-950"
            >
              Add listing
            </button>
          </div>
        </form>
        {images.length ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {images.map((src) => (
              <img key={src} src={src} alt="Preview" className="h-16 w-24 rounded-lg object-cover" />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const TourSellerCsvUpload = () => {
  const { addSellerListings } = useDemoTour();
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState("");

  const handleCsv = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const rows = parseCsvRows(text);
      if (!rows.length) {
        setError("No rows found. Use a header row and at least one data row.");
        setPreviewRows([]);
        return;
      }
      setError("");
      setPreviewRows(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const listings = previewRows.map((row) => ({
      id: createListingId(),
      title: row.title || "Untitled listing",
      category: row.category || "Uncategorized",
      price: row.price || "",
      hours: row.hours || "",
      state: row.state || "—",
      images: [],
      source: "csv" as const,
    }));
    addSellerListings(listings);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">CSV Upload</h2>
        <p className="mt-2 text-sm text-slate-200">
          Supported columns: title, category, price, hours, state. Simple parsing only (quoted
          commas are not supported).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => handleCsv(event.target.files?.[0] ?? null)}
            className="text-xs text-slate-300"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={!previewRows.length}
            className="rounded-full bg-amber-300 px-5 py-2 text-xs font-semibold text-slate-950 disabled:opacity-40"
          >
            Import previewed rows
          </button>
        </div>
        {error ? <p className="mt-3 text-xs text-rose-200">{error}</p> : null}
        {previewRows.length ? (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-900/70 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Hours</th>
                  <th className="px-3 py-2">State</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={`${row.title}-${index}`} className="border-t border-white/10">
                    <td className="px-3 py-2">{row.title || "—"}</td>
                    <td className="px-3 py-2">{row.category || "—"}</td>
                    <td className="px-3 py-2">{row.price || "—"}</td>
                    <td className="px-3 py-2">{row.hours || "—"}</td>
                    <td className="px-3 py-2">{row.state || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const TourSellerListings = () => {
  const { sellerListings } = useDemoTour();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 md:px-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Seller Listings</h2>
        <p className="mt-2 text-sm text-slate-200">
          Listings created in this demo are shown below. No backend calls are made.
        </p>
      </div>
      {sellerListings.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {sellerListings.map((listing) => (
            <div
              key={listing.id}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {listing.source === "manual" ? "Manual entry" : "CSV import"}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{listing.title}</h3>
              <p className="text-sm text-slate-300">{listing.category}</p>
              <div className="mt-3 text-xs text-slate-300">
                <span>Price: {listing.price || "—"}</span>
                <span className="mx-2">•</span>
                <span>Hours: {listing.hours || "—"}</span>
                <span className="mx-2">•</span>
                <span>State: {listing.state || "—"}</span>
              </div>
              {listing.images.length ? (
                <div className="mt-3 flex gap-2">
                  {listing.images.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt="Listing preview"
                      className="h-12 w-16 rounded-md object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-200">
          No demo listings yet. Add a manual listing or import CSV rows to populate this view.
        </div>
      )}
    </div>
  );
};

const TourSellerOffers = () => (
  <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 md:px-6">
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold">Offers Preview</h2>
      <p className="mt-2 text-sm text-slate-200">
        Incoming buyer inquiries appear here. This is a demo-only preview with static data.
      </p>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {[
        {
          buyer: "Northwind Materials",
          listing: "2020 CAT 320 Excavator",
          message: "Interested in inspection and availability window.",
        },
        {
          buyer: "Summit Mining Co.",
          listing: "2019 Komatsu D65",
          message: "Can you share maintenance records and pricing guidance?",
        },
      ].map((offer) => (
        <div
          key={offer.buyer}
          className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
        >
          <p className="text-xs uppercase tracking-wide text-slate-400">New inquiry</p>
          <h3 className="mt-2 text-lg font-semibold">{offer.buyer}</h3>
          <p className="text-sm text-slate-300">{offer.listing}</p>
          <p className="mt-3 text-sm text-slate-200">{offer.message}</p>
        </div>
      ))}
    </div>
  </div>
);

const TourSellerUpgradeCta = () => (
  <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Enterprise</p>
      <h2 className="mt-3 text-2xl font-semibold">Upgrade your seller account</h2>
      <p className="mt-3 text-sm text-slate-200">
        Enterprise sellers get advanced inventory controls, SLA-backed support, and analytics to
        grow distribution. Upgrade to unlock larger catalog limits and governance.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-full bg-amber-300 px-5 py-2 text-xs font-semibold text-slate-950"
        >
          Request enterprise upgrade
        </button>
        <button
          type="button"
          className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold text-white"
        >
          Compare seller plans
        </button>
      </div>
    </div>
  </div>
);

const TourNdaPreview = () => {
  const { ndaAccepted, setNdaAccepted } = useDemoTour();
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Mutual NDA Preview</h2>
        <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-200">
          <p className="font-semibold text-slate-100">Section 1: Confidentiality</p>
          <p>
            Buyer agrees to keep seller information confidential and to use it only for
            evaluation purposes. Unauthorized disclosure is prohibited.
          </p>
          <p className="font-semibold text-slate-100">Section 2: Term</p>
          <p>
            The confidentiality term remains in effect for 24 months from the acceptance
            date.
          </p>
          <p className="font-semibold text-slate-100">Section 3: Exclusions</p>
          <p>
            Information already public, independently developed, or obtained lawfully is
            excluded from this NDA.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <input
            id="nda-accept"
            type="checkbox"
            checked={ndaAccepted}
            onChange={(event) => setNdaAccepted(event.target.checked)}
            className="h-4 w-4 accent-amber-300"
          />
          <label htmlFor="nda-accept" className="text-sm">
            I Accept
          </label>
        </div>
      </div>
    </div>
  );
};

const TourEmailComposer = () => {
  const { contactEmailDraft, setContactEmailDraft, lastActionMessage, setLastActionMessage } =
    useDemoTour();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Message Seller</h2>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-slate-300">Subject</span>
            <input
              type="text"
              value={contactEmailDraft.subject}
              onChange={(event) =>
                setContactEmailDraft({
                  ...contactEmailDraft,
                  subject: event.target.value,
                })
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-slate-300">Body</span>
            <textarea
              value={contactEmailDraft.body}
              onChange={(event) =>
                setContactEmailDraft({
                  ...contactEmailDraft,
                  body: event.target.value,
                })
              }
              rows={6}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <button
            type="button"
            onClick={() => setLastActionMessage("Demo: message queued via EasyFinder.")}
            className="rounded-full bg-amber-300 px-5 py-2 text-xs font-semibold text-slate-950"
          >
            Send
          </button>
          {lastActionMessage ? (
            <p className="text-xs text-emerald-200">{lastActionMessage}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const TourWatchlistPreview = () => {
  const watchlist = useDemoWatchlist();
  const listing = demoListings[0];

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 md:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Watchlist Preview</h2>
          <p className="mt-2 text-sm text-slate-200">
            Save listings to revisit later and share with procurement teams.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (listing?.id) {
                  watchlist.add(listing.id);
                }
              }}
              className="rounded-full border border-amber-200/60 px-4 py-2 text-xs font-semibold text-amber-100"
            >
              Add a listing to watchlist
            </button>
            <span className="text-xs text-slate-300">
              Plan limit: 50 saved listings (demo preview).
            </span>
          </div>
        </div>
      </div>
      <DemoWatchlist />
    </div>
  );
};

const TourUpgradeCta = () => (
  <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Upgrade</p>
      <h2 className="mt-3 text-2xl font-semibold">Unlock enterprise controls</h2>
      <p className="mt-3 text-sm text-slate-200">
        Move from demo to production with enterprise-grade sourcing, approvals, and
        governance. Upgrade plans unlock deeper integrations, higher limits, and dedicated
        support.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-full bg-amber-300 px-5 py-2 text-xs font-semibold text-slate-950"
        >
          Request upgrade
        </button>
        <button
          type="button"
          className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold text-white"
        >
          Compare plans
        </button>
      </div>
    </div>
  </div>
);
