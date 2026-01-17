import RequireScope from "@/components/auth/RequireScope";
import InventoryTable from "./InventoryTable";

export default function Page() {
  return (
    <RequireScope scope="inventory">
      <InventoryTable />
    </RequireScope>
  );
}
