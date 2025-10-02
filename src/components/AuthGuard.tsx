import { useState, useEffect, ReactNode } from "react";
import { Login } from "./Login";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = sessionStorage.getItem("authenticated");
    setIsAuthenticated(authStatus === "true");
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return <>{children}</>;
}
