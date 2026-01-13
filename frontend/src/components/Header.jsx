export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-brand-blue border-b border-gray-700">
      <div>
        <h1 className="text-xl font-bold text-white">EasyFinder AI</h1>
        <p className="text-sm text-gray-300">
          Automatically find, score, and contact your best buyers before your first call.
        </p>
      </div>

      <select className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-600">
        <option>Heavy</option>
        <option>General</option>
        <option>Mall</option>
      </select>
    </header>
  );
}
