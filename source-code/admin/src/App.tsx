import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState } from 'react';
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { AdminApp} from './pages/admin/AdminApp'
import { ManagerApp} from './pages/manager/ManagerApp'
import { OfficerApp } from './pages/officer/OfficerApp';
import { type Role } from './types'


export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const navigate = useNavigate();

  const handleLogin = (r: Role) => {
    setRole(r);
    navigate("/app");
  };

  const handleLogout = () => {
    setRole(null);
    navigate("/");
  };

  return (
    <Routes>
      <Route path="/"       element={<LandingPage onNavigate={navigate} />} />
      <Route path="/login"  element={<LoginPage onNavigate={navigate} onLogin={handleLogin} />} />
      <Route path="/signup" element={<SignupPage onNavigate={navigate} />} />
      <Route
        path="/app"
        element={
          role === null ? (
            <Navigate to="/login" replace />
          ) : role === "admin" ? (
            <AdminApp onLogout={handleLogout} />
          ) : role === "manager" ? (
            <ManagerApp onLogout={handleLogout} />
          ) : (
            <OfficerApp onLogout={handleLogout} />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

}
