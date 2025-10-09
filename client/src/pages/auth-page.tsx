import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail } from "lucide-react";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import { Redirect } from "wouter";
import { z } from "zod";

type Screen = "welcome" | "register" | "login" | "success";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export default function AuthPage() {
  const { user, registerMutation, loginMutation } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome");

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  // Registration form
  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
  });

  // Login form
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Submit registration
  const onRegisterSubmit = async (data: any) => {
    try {
      await registerMutation.mutateAsync(data);
      setCurrentScreen("success");
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Submit login
  const onLoginSubmit = async (data: any) => {
    try {
      await loginMutation.mutateAsync(data);
      setCurrentScreen("success");
    } catch (error) {
      // Error handled by mutation
    }
  };

  // OAuth login handlers
  const handleGoogleLogin = () => {
    window.location.href = "/auth/google";
  };

  const handleFacebookLogin = () => {
    window.location.href = "/auth/facebook";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md lg:max-w-4xl xl:max-w-6xl mx-auto relative overflow-hidden">
        {/* Welcome Screen */}
        {currentScreen === "welcome" && (
          <div className="h-screen flex flex-col justify-center px-6 animate-in fade-in duration-500">
            <div className="text-center mb-12">
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-primary mb-2" data-testid="brand-title">Rico-Cuba</h1>
                <p className="text-muted-foreground text-lg">Tu mercado, tu comunidad</p>
              </div>
              
              <div className="mb-8 mx-auto w-48 h-48 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                <div className="text-6xl">🛒</div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Bienvenido a Rico-Cuba</h2>
              <p className="text-muted-foreground text-base leading-relaxed mb-8">
                Compra y vende de forma segura en el marketplace más moderno de Cuba
              </p>
            </div>
            
            <div className="space-y-4 md:space-y-3">
              {/* Google Login */}
              <Button 
                onClick={handleGoogleLogin}
                variant="outline"
                className="w-full py-4 md:py-3 text-lg md:text-base font-semibold flex items-center justify-center gap-3"
                size="lg"
                data-testid="button-google-login"
              >
                <FaGoogle className="w-5 h-5" />
                Continuar con Google
              </Button>

              {/* Facebook Login */}
              <Button 
                onClick={handleFacebookLogin}
                variant="outline"
                className="w-full py-4 md:py-3 text-lg md:text-base font-semibold flex items-center justify-center gap-3 bg-[#1877F2] text-white hover:bg-[#1877F2]/90"
                size="lg"
                data-testid="button-facebook-login"
              >
                <FaFacebook className="w-5 h-5" />
                Continuar con Facebook
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-sm text-muted-foreground">o</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              {/* Email Registration */}
              <Button 
                onClick={() => setCurrentScreen("register")}
                variant="outline"
                className="w-full py-4 md:py-3 text-lg md:text-base font-semibold flex items-center justify-center gap-3"
                size="lg"
                data-testid="button-email-register"
              >
                <Mail className="w-5 h-5" />
                Registrarse con Email
              </Button>

              {/* Login Link */}
              <div className="text-center pt-4">
                <Button
                  variant="link"
                  onClick={() => setCurrentScreen("login")}
                  data-testid="link-to-login"
                  className="text-base"
                >
                  ¿Ya tienes cuenta? Iniciar sesión
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Register Screen */}
        {currentScreen === "register" && (
          <div className="h-screen flex flex-col px-6 md:px-8 pt-16 md:pt-12 animate-in slide-in-from-right duration-300 md:justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentScreen("welcome")}
              className="absolute top-6 left-6 rounded-full"
              data-testid="button-back"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex-1 md:flex-none flex flex-col justify-center md:max-w-md md:mx-auto">
              <div className="mb-8 md:mb-6">
                <h2 className="text-3xl md:text-2xl font-bold mb-3 text-foreground">Crear cuenta</h2>
                <p className="text-muted-foreground text-base">Ingresa tu información para comenzar</p>
              </div>
              
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6 md:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    className="py-4 md:py-3 text-lg md:text-base"
                    placeholder="tu@email.com"
                    {...registerForm.register("email")}
                    data-testid="input-register-email"
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nombre completo</Label>
                  <Input
                    id="register-name"
                    type="text"
                    className="py-4 md:py-3 text-lg md:text-base"
                    placeholder="Tu nombre completo"
                    {...registerForm.register("name")}
                    data-testid="input-register-name"
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-password">Contraseña</Label>
                  <Input
                    id="register-password"
                    type="password"
                    className="py-4 md:py-3 text-lg md:text-base"
                    placeholder="Mínimo 8 caracteres"
                    {...registerForm.register("password")}
                    data-testid="input-register-password"
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full py-4 md:py-3 text-lg md:text-base font-semibold"
                  size="lg"
                  disabled={registerMutation.isPending}
                  data-testid="button-submit-register"
                >
                  {registerMutation.isPending ? "Creando cuenta..." : "Crear cuenta"}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <Button
                  variant="link"
                  onClick={() => setCurrentScreen("login")}
                  data-testid="link-to-login"
                >
                  ¿Ya tienes cuenta? Iniciar sesión
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Login Screen */}
        {currentScreen === "login" && (
          <div className="h-screen flex flex-col px-6 md:px-8 pt-16 md:pt-12 animate-in slide-in-from-right duration-300 md:justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentScreen("welcome")}
              className="absolute top-6 left-6 rounded-full"
              data-testid="button-back"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex-1 md:flex-none flex flex-col justify-center md:max-w-md md:mx-auto">
              <div className="mb-8 md:mb-6">
                <h2 className="text-3xl md:text-2xl font-bold mb-3 text-foreground">Iniciar sesión</h2>
                <p className="text-muted-foreground text-base">Ingresa tus datos para acceder</p>
              </div>
              
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6 md:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    className="py-4 md:py-3 text-lg md:text-base"
                    placeholder="tu@email.com"
                    {...loginForm.register("email")}
                    data-testid="input-login-email"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    className="py-4 md:py-3 text-lg md:text-base"
                    placeholder="Tu contraseña"
                    {...loginForm.register("password")}
                    data-testid="input-login-password"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  className="w-full py-4 md:py-3 text-lg md:text-base font-semibold"
                  size="lg"
                  disabled={loginMutation.isPending}
                  data-testid="button-submit-login"
                >
                  {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <Button
                  variant="link"
                  onClick={() => setCurrentScreen("register")}
                  data-testid="link-to-register"
                >
                  ¿No tienes cuenta? Crear cuenta
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Success Screen */}
        {currentScreen === "success" && (
          <Redirect to="/" />
        )}
      </div>
    </div>
  );
}
