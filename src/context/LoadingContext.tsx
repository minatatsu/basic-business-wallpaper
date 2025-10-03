import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useFigmaImages as useFigmaImagesHook } from "../hooks/useFigmaImages";
import { setTemplateData } from "../utils/imageGenerator";

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  templateData: any;
  error: string | null;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shouldLoadData, setShouldLoadData] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const authStatus = sessionStorage.getItem("authenticated");
    const isAuth = authStatus === "true";
    setIsAuthenticated(isAuth);
    if (isAuth) {
      setShouldLoadData(true);
    }
  }, []);

  // Listen for authentication changes
  useEffect(() => {
    const interval = setInterval(() => {
      const authStatus = sessionStorage.getItem("authenticated");
      const isAuth = authStatus === "true";
      if (isAuth && !isAuthenticated) {
        setIsAuthenticated(true);
        setShouldLoadData(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const { templateData, loading, error } = useFigmaImagesHook(shouldLoadData);

  // Set template data when loaded
  useEffect(() => {
    if (Object.keys(templateData).length > 0) {
      setTemplateData(templateData);
      console.log(
        "[LoadingProvider] Template data set:",
        Object.keys(templateData).map((key) => ({
          id: key,
          hasImageUrl: !!templateData[key]?.imageUrl,
        })),
      );
    }
  }, [templateData]);

  // Update global loading state
  useEffect(() => {
    if (shouldLoadData) {
      setIsLoading(loading);
    }
  }, [loading, shouldLoadData]);

  return (
    <LoadingContext.Provider
      value={{ isLoading, setIsLoading, templateData, error }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return context;
}
