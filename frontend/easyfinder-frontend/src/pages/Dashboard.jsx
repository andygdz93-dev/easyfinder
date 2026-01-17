const MOCK_LEADS = [
  {
    name: "Acme Construction",
    email: "buyer@acme.com",
    score: 92,
    priority: "HIGH",
  },
  {
    name: "Westfield Retail",
    email: "ops@westfield.com",
    score: 76,
    priority: "MEDIUM",
  },
  {
    name: "Local Contractors LLC",
    email: "info@localco.com",
    score: 55,
    priority: "LOW",
  },
];

const priorityColors = {
  HIGH: "bg-red-600",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-gray-500",
};

export default function Dashboard() {
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Lead Dashboard</h2>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-700 rounded">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-3 text-left">Company</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Score</th>
              <th className="p-3 text-left">Priority</th>
            </tr>
          </thead>

          <tbody>
            {MOCK_LEADS.map((lead, idx) => (
              <tr key={idx} className="border-t border-gray-700">
                <td className="p-3">{lead.name}</td>
                <td className="p-3 text-gray-300">{lead.email}</td>
                <td className="p-3 font-semibold">{lead.score}</td>
                <td className="p-3">
                  <span
                    className={`px-3 py-1 rounded text-white text-sm ${priorityColors[lead.priority]}`}
                  >
                    {lead.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
