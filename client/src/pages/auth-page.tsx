import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import { Redirect, useLocation } from "wouter";
import { z } from "zod";

type Screen = "login" | "register";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email o teléfono es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export default function AuthPage() {
  const { user, registerMutation, loginMutation } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const [location] = useLocation();
  
  // Get redirect parameter from URL
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const redirectTo = urlParams.get('redirect') || '/';

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
      identifier: "",
      password: "",
    },
  });

  // Redirect if already logged in (after hooks)
  if (user) {
    return <Redirect to={redirectTo} />;
  }

  // Submit registration
  const onRegisterSubmit = async (data: any) => {
    try {
      await registerMutation.mutateAsync(data);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Submit login
  const onLoginSubmit = async (data: any) => {
    try {
      await loginMutation.mutateAsync(data);
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
        {/* Login Screen */}
        {currentScreen === "login" && (
          <div className="h-screen flex flex-col justify-center px-6 animate-in fade-in duration-500 pt-16 md:pt-0">
            <div className="text-center mb-8 md:mb-12">
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-primary mb-2" data-testid="brand-title">Rico-Cuba</h1>
                <p className="text-muted-foreground text-lg">Tu mercado, tu comunidad</p>
              </div>
              
              <h2 className="text-2xl font-semibold mb-2 text-foreground">Iniciar sesión</h2>
              <p className="text-muted-foreground text-base">
                Accede a tu cuenta para continuar
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

              {/* Email/Phone + Password Login Form */}
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-identifier">Email o Teléfono</Label>
                  <Input
                    id="login-identifier"
                    type="text"
                    className="py-4 md:py-3 text-lg md:text-base"
                    placeholder="tu@email.com o +53XXXXXXXX"
                    {...loginForm.register("identifier")}
                    data-testid="input-login-identifier"
                  />
                  {loginForm.formState.errors.identifier && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.identifier.message}</p>
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
                  className="w-full py-4 md:py-3 text-lg md:text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                  disabled={loginMutation.isPending}
                  data-testid="button-submit-login"
                >
                  {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-sm text-muted-foreground">¿No tienes cuenta?</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              {/* Register Button (Green CTA) */}
              <Button
                onClick={() => setCurrentScreen("register")}
                className="w-full py-4 md:py-3 text-lg md:text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
                size="lg"
                data-testid="button-to-register"
              >
                Crear cuenta nueva
              </Button>
            </div>
          </div>
        )}

        {/* Register Screen */}
        {currentScreen === "register" && (
          <div className="h-screen flex flex-col px-6 md:px-8 pt-16 md:pt-0 animate-in slide-in-from-right duration-300 md:justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentScreen("login")}
              className="absolute top-6 left-6 rounded-full z-10"
              data-testid="button-back"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>

            <div className="flex-1 md:flex-none flex flex-col justify-center md:max-w-md md:mx-auto w-full">
              <div className="mb-8 md:mb-10">
                <h2 className="text-3xl md:text-3xl lg:text-4xl font-bold mb-3 text-foreground">Crear cuenta</h2>
                <p className="text-muted-foreground text-base md:text-lg">Regístrate con tu método preferido</p>
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-3 mb-6">
                {/* Google Register */}
                <Button 
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="w-full py-4 md:py-3 text-lg md:text-base font-semibold flex items-center justify-center gap-3"
                  size="lg"
                  data-testid="button-google-register"
                >
                  <FaGoogle className="w-5 h-5" />
                  Continuar con Google
                </Button>

                {/* Facebook Register */}
                <Button 
                  onClick={handleFacebookLogin}
                  variant="outline"
                  className="w-full py-4 md:py-3 text-lg md:text-base font-semibold flex items-center justify-center gap-3 bg-[#1877F2] text-white hover:bg-[#1877F2]/90"
                  size="lg"
                  data-testid="button-facebook-register"
                >
                  <FaFacebook className="w-5 h-5" />
                  Continuar con Facebook
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-border"></div>
                  <span className="text-sm text-muted-foreground">o con email</span>
                  <div className="flex-1 h-px bg-border"></div>
                </div>
              </div>
              
              {/* Email Registration Form */}
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
                  className="w-full py-4 md:py-3 text-lg md:text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
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
      </div>
    </div>
  );
}
