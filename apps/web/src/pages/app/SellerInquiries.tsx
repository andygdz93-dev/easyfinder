export default function SellerInquiries() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Seller Inquiries</h1>
      <p className="text-sm text-slate-400">
        This page will show buyer interest routed through EasyFinder (no direct seller contact).
      </p>
      <div className="rounded-xl bg-slate-800 p-4">
        <p className="text-sm text-slate-300">No inquiries yet.</p>
      </div>
    </div>
  );
}
