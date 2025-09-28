import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, Key, CheckCircle, RefreshCw } from "lucide-react";
import { Redirect } from "wouter";
import { z } from "zod";

type Screen = "welcome" | "register" | "login" | "sms-verification" | "password-reset" | "success";

const provinces = [
  { value: "havana", label: "La Habana" },
  { value: "santiago", label: "Santiago de Cuba" },
  { value: "villa-clara", label: "Villa Clara" },
  { value: "matanzas", label: "Matanzas" },
  { value: "camagüey", label: "Camagüey" },
  { value: "holguín", label: "Holguín" },
  { value: "granma", label: "Granma" },
  { value: "las-tunas", label: "Las Tunas" },
  { value: "cienfuegos", label: "Cienfuegos" },
  { value: "sancti-spiritus", label: "Sancti Spíritus" },
  { value: "ciego-de-avila", label: "Ciego de Ávila" },
  { value: "pinar-del-rio", label: "Pinar del Río" },
  { value: "artemisa", label: "Artemisa" },
  { value: "mayabeque", label: "Mayabeque" },
  { value: "isla-de-la-juventud", label: "Isla de la Juventud" },
  { value: "guantanamo", label: "Guantánamo" },
];

const loginSchema = z.object({
  phone: z.string().regex(/^[567]\d{7}$/, "Formato de teléfono cubano inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

const resetSchema = z.object({
  phone: z.string().regex(/^[567]\d{7}$/, "Formato de teléfono cubano inválido"),
});

const confirmResetSchema = z.object({
  newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export default function AuthPage() {
  const { user, registerMutation, loginMutation, verifySMSMutation, resendVerificationMutation, resetPasswordMutation, confirmResetMutation } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [resetPhone, setResetPhone] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  // Redirect if already logged in and verified
  if (user && user.isVerified === "true" && currentScreen !== "sms-verification") {
    return <Redirect to="/" />;
  }

  // Registration form
  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      phone: "",
      name: "",
      province: "",
      password: "",
    },
  });

  // Login form
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  // Reset password form
  const resetForm = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      phone: "",
    },
  });

  // Confirm reset form
  const confirmResetForm = useForm({
    resolver: zodResolver(confirmResetSchema),
    defaultValues: {
      newPassword: "",
    },
  });

  // Format Cuban phone number
  const formatCubanPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 8) {
      if (digits.length >= 1) {
        return digits.substring(0, 1) + 
               (digits.length > 1 ? " " + digits.substring(1, 4) : "") + 
               (digits.length > 4 ? " " + digits.substring(4) : "");
      }
    }
    return digits.substring(0, 8);
  };

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newOtp = [...otpCode];
      newOtp[index] = value;
      setOtpCode(newOtp);
      
      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.querySelector(`[data-otp-index="${index + 1}"]`) as HTMLInputElement;
        nextInput?.focus();
      }
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      const prevInput = document.querySelector(`[data-otp-index="${index - 1}"]`) as HTMLInputElement;
      prevInput?.focus();
    }
  };

  // Submit registration
  const onRegisterSubmit = async (data: any) => {
    try {
      await registerMutation.mutateAsync(data);
      setCurrentScreen("sms-verification");
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

  // Submit SMS verification
  const onSMSSubmit = async () => {
    const code = otpCode.join("");
    if (code.length === 6) {
      try {
        await verifySMSMutation.mutateAsync({ code });
        setCurrentScreen("success");
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  // Submit password reset
  const onResetSubmit = async (data: any) => {
    try {
      await resetPasswordMutation.mutateAsync(data);
      setResetPhone(data.phone);
      setCurrentScreen("sms-verification");
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Submit confirm reset
  const onConfirmResetSubmit = async (data: any) => {
    const code = otpCode.join("");
    if (code.length === 6) {
      try {
        await confirmResetMutation.mutateAsync({
          phone: resetPhone,
          code,
          newPassword: data.newPassword,
        });
        setCurrentScreen("login");
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  // Resend verification countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Resend verification code
  const handleResend = async () => {
    try {
      await resendVerificationMutation.mutateAsync();
      setResendCountdown(30);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen relative overflow-hidden">
      {/* Welcome Screen */}
      {currentScreen === "welcome" && (
        <div className="h-screen flex flex-col justify-center px-6 animate-in fade-in duration-500">
          <div className="text-center mb-12">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-primary mb-2" data-testid="brand-title">Rico-Cuba</h1>
              <p className="text-muted-foreground text-lg">Tu mercado, tu comunidad</p>
            </div>
            
            <div className="mb-8 mx-auto w-48 h-48 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <div className="text-6xl">🇨🇺</div>
            </div>
            
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Bienvenido a Rico-Cuba</h2>
            <p className="text-muted-foreground text-base leading-relaxed mb-8">
              Compra y vende de forma segura en el marketplace más moderno de Cuba
            </p>
          </div>
          
          <div className="space-y-4">
            <Button 
              onClick={() => setCurrentScreen("register")}
              className="w-full py-4 text-lg font-semibold"
              size="lg"
              data-testid="button-create-account"
            >
              Crear cuenta
            </Button>
            <Button 
              onClick={() => setCurrentScreen("login")}
              variant="outline"
              className="w-full py-4 text-lg font-semibold"
              size="lg"
              data-testid="button-login"
            >
              Iniciar sesión
            </Button>
          </div>
        </div>
      )}

      {/* Register Screen */}
      {currentScreen === "register" && (
        <div className="h-screen flex flex-col px-6 pt-16 animate-in slide-in-from-right duration-300">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentScreen("welcome")}
            className="absolute top-6 left-6 rounded-full"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-3 text-foreground">Crear cuenta</h2>
              <p className="text-muted-foreground text-base">Ingresa tu información para comenzar</p>
            </div>
            
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="register-phone">Número de teléfono</Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center">
                    <span className="text-2xl mr-2">🇨🇺</span>
                    <span className="text-muted-foreground">+53</span>
                  </div>
                  <Input
                    id="register-phone"
                    type="tel"
                    className="pl-20 py-4 text-lg"
                    placeholder="5 123 4567"
                    maxLength={10}
                    {...registerForm.register("phone", {
                      onChange: (e) => {
                        e.target.value = formatCubanPhone(e.target.value);
                      }
                    })}
                    data-testid="input-register-phone"
                  />
                </div>
                {registerForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.phone.message}</p>
                )}
                <p className="text-sm text-muted-foreground">Formato: 5XXXXXXX, 6XXXXXXX o 7XXXXXXX</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-name">Nombre completo</Label>
                <Input
                  id="register-name"
                  type="text"
                  className="py-4 text-lg"
                  placeholder="Tu nombre completo"
                  {...registerForm.register("name")}
                  data-testid="input-register-name"
                />
                {registerForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-province">Provincia</Label>
                <Select onValueChange={(value) => registerForm.setValue("province", value)}>
                  <SelectTrigger className="py-4 text-lg" data-testid="select-register-province">
                    <SelectValue placeholder="Selecciona tu provincia" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((province) => (
                      <SelectItem key={province.value} value={province.value}>
                        {province.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {registerForm.formState.errors.province && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.province.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-password">Contraseña</Label>
                <Input
                  id="register-password"
                  type="password"
                  className="py-4 text-lg"
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
                className="w-full py-4 text-lg font-semibold"
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

      {/* SMS Verification Screen */}
      {currentScreen === "sms-verification" && (
        <div className="h-screen flex flex-col px-6 pt-16 animate-in slide-in-from-right duration-300">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentScreen(resetPhone ? "password-reset" : "register")}
            className="absolute top-6 left-6 rounded-full"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-3 text-foreground">Verificar teléfono</h2>
              <p className="text-muted-foreground text-base mb-2">Hemos enviado un código de verificación al número:</p>
              <p className="text-foreground font-semibold text-lg" data-testid="text-phone-number">
                +53 {user?.phone || resetPhone}
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="block text-center">Código de verificación</Label>
                <div className="flex justify-center space-x-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Input
                      key={index}
                      type="text"
                      maxLength={1}
                      className="w-12 h-14 text-center text-xl font-bold"
                      value={otpCode[index]}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      data-otp-index={index}
                      data-testid={`input-otp-${index}`}
                    />
                  ))}
                </div>
              </div>
              
              {resetPhone ? (
                <form onSubmit={confirmResetForm.handleSubmit(onConfirmResetSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nueva contraseña</Label>
                    <Input
                      id="new-password"
                      type="password"
                      className="py-4 text-lg"
                      placeholder="Mínimo 8 caracteres"
                      {...confirmResetForm.register("newPassword")}
                      data-testid="input-new-password"
                    />
                    {confirmResetForm.formState.errors.newPassword && (
                      <p className="text-sm text-destructive">{confirmResetForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full py-4 text-lg font-semibold"
                    size="lg"
                    disabled={confirmResetMutation.isPending || otpCode.join("").length !== 6}
                    data-testid="button-confirm-reset"
                  >
                    {confirmResetMutation.isPending ? "Restableciendo..." : "Restablecer contraseña"}
                  </Button>
                </form>
              ) : (
                <Button
                  onClick={onSMSSubmit}
                  className="w-full py-4 text-lg font-semibold"
                  size="lg"
                  disabled={verifySMSMutation.isPending || otpCode.join("").length !== 6}
                  data-testid="button-verify-sms"
                >
                  {verifySMSMutation.isPending ? "Verificando..." : "Verificar código"}
                </Button>
              )}
            </div>
            
            <div className="mt-6 text-center space-y-4">
              <p className="text-muted-foreground text-sm">¿No recibiste el código?</p>
              <Button
                variant="link"
                onClick={handleResend}
                disabled={resendCountdown > 0 || resendVerificationMutation.isPending}
                data-testid="button-resend-code"
              >
                {resendCountdown > 0 
                  ? `Reenviar código (${resendCountdown}s)`
                  : resendVerificationMutation.isPending 
                    ? "Reenviando..."
                    : "Reenviar código"
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Login Screen */}
      {currentScreen === "login" && (
        <div className="h-screen flex flex-col px-6 pt-16 animate-in slide-in-from-right duration-300">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentScreen("welcome")}
            className="absolute top-6 left-6 rounded-full"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-3 text-foreground">Iniciar sesión</h2>
              <p className="text-muted-foreground text-base">Ingresa tus datos para acceder</p>
            </div>
            
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="login-phone">Número de teléfono</Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center">
                    <span className="text-2xl mr-2">🇨🇺</span>
                    <span className="text-muted-foreground">+53</span>
                  </div>
                  <Input
                    id="login-phone"
                    type="tel"
                    className="pl-20 py-4 text-lg"
                    placeholder="5 123 4567"
                    maxLength={10}
                    {...loginForm.register("phone", {
                      onChange: (e) => {
                        e.target.value = formatCubanPhone(e.target.value);
                      }
                    })}
                    data-testid="input-login-phone"
                  />
                </div>
                {loginForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.phone.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                  id="login-password"
                  type="password"
                  className="py-4 text-lg"
                  placeholder="Tu contraseña"
                  {...loginForm.register("password")}
                  data-testid="input-login-password"
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              
              <div className="text-right">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setCurrentScreen("password-reset")}
                  className="text-sm"
                  data-testid="link-forgot-password"
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>
              
              <Button
                type="submit"
                className="w-full py-4 text-lg font-semibold"
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

      {/* Password Reset Screen */}
      {currentScreen === "password-reset" && (
        <div className="h-screen flex flex-col px-6 pt-16 animate-in slide-in-from-right duration-300">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentScreen("login")}
            className="absolute top-6 left-6 rounded-full"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Key className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-3 text-foreground">Recuperar contraseña</h2>
              <p className="text-muted-foreground text-base">Te enviaremos un código para restablecer tu contraseña</p>
            </div>
            
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="reset-phone">Número de teléfono</Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center">
                    <span className="text-2xl mr-2">🇨🇺</span>
                    <span className="text-muted-foreground">+53</span>
                  </div>
                  <Input
                    id="reset-phone"
                    type="tel"
                    className="pl-20 py-4 text-lg"
                    placeholder="5 123 4567"
                    maxLength={10}
                    {...resetForm.register("phone", {
                      onChange: (e) => {
                        e.target.value = formatCubanPhone(e.target.value);
                      }
                    })}
                    data-testid="input-reset-phone"
                  />
                </div>
                {resetForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{resetForm.formState.errors.phone.message}</p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full py-4 text-lg font-semibold"
                size="lg"
                disabled={resetPasswordMutation.isPending}
                data-testid="button-submit-reset"
              >
                {resetPasswordMutation.isPending ? "Enviando código..." : "Enviar código"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={() => setCurrentScreen("login")}
                data-testid="link-back-to-login"
              >
                Volver al inicio de sesión
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Screen */}
      {currentScreen === "success" && (
        <div className="h-screen flex flex-col justify-center items-center px-6 animate-in fade-in duration-500">
          <div className="text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-foreground">¡Bienvenido a Rico-Cuba!</h2>
            <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto">
              {user?.isVerified === "false" 
                ? "Tu cuenta ha sido creada. Verifica tu teléfono para acceder a todas las funciones."
                : "Has iniciado sesión exitosamente. Ya puedes comenzar a comprar y vender."
              }
            </p>
            <Button
              onClick={() => window.location.href = "/"}
              className="px-8 py-4 text-lg font-semibold"
              size="lg"
              data-testid="button-go-marketplace"
            >
              Explorar marketplace
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
