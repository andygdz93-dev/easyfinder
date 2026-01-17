import { Navigate } from "react-router-dom"
import { useUser } from "./useUser"

export function RequireAuth({ children }: { children: JSX.Element }) {
  const user = useUser()

  if (!user) return <Navigate to="/login" />
  if (!user.nda) return <Navigate to="/nda" />

  return children
}
