import axios from "../api/axios"
import { useUser } from "../components/auth/useUser"
import { useEffect, useState } from "react"

export default function Inventory() {
  const user = useUser()
  const [items, setItems] = useState([])

  useEffect(() => {
    axios.get("/api/inventory").then(res => setItems(res.data))
  }, [])

  return (
    <div>
      <h1>Inventory</h1>

      {items.map((i: any) => (
        <div key={i.item}>
          {i.item} — {i.price}
        </div>
      ))}

      {user?.role === "demo" && (
        <div className="upgrade">
          🔒 Full inventory locked.
          <button onClick={() => window.location.href="/upgrade"}>
            Upgrade to Pro
          </button>
        </div>
      )}
    </div>
  )
}
