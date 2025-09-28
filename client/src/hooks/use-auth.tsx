import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<any, Error, InsertUser>;
  verifySMSMutation: UseMutationResult<any, Error, { code: string }>;
  resendVerificationMutation: UseMutationResult<any, Error, void>;
  resetPasswordMutation: UseMutationResult<any, Error, { phone: string }>;
  confirmResetMutation: UseMutationResult<any, Error, { phone: string; code: string; newPassword: string }>;
};

type LoginData = {
  phone: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
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
      queryClient.setQueryData(["/api/user"], response);
      if (response.needsVerification) {
        toast({
          title: "Registro exitoso",
          description: "Revisa tu teléfono para el código de verificación",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error de registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifySMSMutation = useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      const res = await apiRequest("POST", "/api/verify-sms", { code });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "¡Verificación exitosa!",
        description: "Tu teléfono ha sido verificado",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error de verificación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/resend-verification");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Código reenviado",
        description: "Revisa tu teléfono para el nuevo código",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ phone }: { phone: string }) => {
      const res = await apiRequest("POST", "/api/reset-password", { phone });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Código enviado",
        description: "Revisa tu teléfono para el código de restablecimiento",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmResetMutation = useMutation({
    mutationFn: async ({ phone, code, newPassword }: { phone: string; code: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/confirm-reset", { phone, code, newPassword });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Contraseña restablecida!",
        description: "Ya puedes iniciar sesión con tu nueva contraseña",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
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
        loginMutation,
        logoutMutation,
        registerMutation,
        verifySMSMutation,
        resendVerificationMutation,
        resetPasswordMutation,
        confirmResetMutation,
      }}
    >
      {children}
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
