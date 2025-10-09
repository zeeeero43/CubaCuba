import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, invalidateCSRFTokenCache } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PhoneNumberModal } from "@/components/PhoneNumberModal";

type AuthContextType = {
  user: (SelectUser & { hasPhone?: boolean }) | null;
  isLoading: boolean;
  error: Error | null;
  hasPhone: boolean;
  showPhoneModal: boolean;
  setShowPhoneModal: (show: boolean) => void;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<any, Error, InsertUser>;
};

type LoginData = {
  email: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<(SelectUser & { hasPhone?: boolean }) | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Check if user needs to provide phone number
  const hasPhone = user?.hasPhone ?? !!user?.phone;

  // Show phone modal if user is logged in but has no phone
  useEffect(() => {
    if (user && !hasPhone && !showPhoneModal) {
      setShowPhoneModal(true);
    }
  }, [user, hasPhone, showPhoneModal]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      invalidateCSRFTokenCache();
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error de inicio de sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (response: any) => {
      invalidateCSRFTokenCache();
      queryClient.setQueryData(["/api/user"], response);
      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error de registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cerrar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        hasPhone,
        showPhoneModal,
        setShowPhoneModal,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
      {/* Show phone modal if user needs to add phone */}
      <PhoneNumberModal 
        open={showPhoneModal} 
        onClose={() => setShowPhoneModal(false)}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
