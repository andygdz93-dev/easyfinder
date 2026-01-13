import axios from "axios"
import { setToken } from "../auth/token"

export default function Login() {
  const login = async () => {
    const res = await axios.post("/api/auth/login", {
      email: "demo@easyfinder.ai"
    })

    setToken(res.data.access_token)
    window.location.href = "/dashboard"
  }

  return (
    <div>
      <h1>Login</h1>
      <button onClick={login}>Login as Demo</button>
    </div>
  )
}
