import React, { createContext, useState } from 'react'
import axios from 'axios'
import jwt_decode from 'jwt-decode'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const login = async (username, password) => {
    const res = await axios.post('/api/token/', { username, password })
    const decoded = jwt_decode(res.data.access)
    setUser({ ...decoded, token: res.data.access })
  }
  return (
    <AuthContext.Provider value={{ user, login }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
