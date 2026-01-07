export default function Header() {
  return (
    <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
      <h2 className="text-xl font-bold">Dashboard</h2>
      <div className="flex items-center gap-4">
        <span className="text-gray-600">Demo User</span>
      </div>
    </header>
  );
}
