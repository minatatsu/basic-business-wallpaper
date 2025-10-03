import { useState, useEffect, ReactNode } from "react";
import { Login } from "./Login";
import { LoadingScreen } from "./LoadingScreen";
import { useLoading } from "../context/LoadingContext";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { isLoading } = useLoading();

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = sessionStorage.getItem("authenticated");
    setIsAuthenticated(authStatus === "true");
    setIsCheckingAuth(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (isCheckingAuth) {
    return null;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (isLoading) {
    return <LoadingScreen message="テンプレートを読み込んでいます..." />;
  }

  return <>{children}</>;
}
