import jwtDecode from "jwt-decode"
import { getToken } from "./token"

export function useUser() {
  const token = getToken()
  if (!token) return null

  try {
    return jwtDecode(token) as {
      sub: string
      role: "demo" | "paid" | "admin"
      nda: boolean
      exp: number
    }
  } catch {
    return null
  }
}
