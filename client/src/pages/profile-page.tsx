import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft, User, Phone, MapPin, Calendar, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();

  if (!user) return <></>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" asChild>
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Mi Perfil</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6">
        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">{user.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {user.isVerified === "true" ? "Cuenta verificada ✓" : "Cuenta no verificada"}
            </p>
          </CardHeader>
        </Card>

        {/* User Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Información personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {user.phone.startsWith('+') ? user.phone : '+' + user.phone}
                </p>
                <p className="text-xs text-muted-foreground">Teléfono</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground capitalize">{user.province}</p>
                <p className="text-xs text-muted-foreground">Provincia</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {new Date(user.createdAt!).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-muted-foreground">Miembro desde</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {user.isVerified === "false" && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Tu cuenta no está verificada. Verifica tu teléfono para acceder a todas las funciones.
                  </p>
                  <Link href="/auth" asChild>
                    <Button className="w-full" data-testid="button-verify-account">
                      Verificar cuenta
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center space-x-2"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            <span>{logoutMutation.isPending ? "Cerrando sesión..." : "Cerrar sesión"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}