import { FaTachometerAlt, FaList } from "react-icons/fa";

export default function Sidebar() {
  return (
    <div className="w-64 bg-blue-600 text-white min-h-screen p-6 flex flex-col">
      <h1 className="text-2xl font-bold mb-8">EasyFinder</h1>
      <nav className="flex flex-col gap-4">
        <a href="#" className="flex items-center gap-2 hover:bg-blue-500 p-2 rounded">
          <FaTachometerAlt /> Dashboard
        </a>
        <a href="#scores" className="flex items-center gap-2 hover:bg-blue-500 p-2 rounded">
          <FaList /> Scores
        </a>
      </nav>
    </div>
  );
}
