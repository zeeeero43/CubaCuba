import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, MapPin, Phone, User, AlertCircle } from "lucide-react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getProvinceName = (value: string) => {
    const provinces: Record<string, string> = {
      "havana": "La Habana",
      "santiago": "Santiago de Cuba",
      "villa-clara": "Villa Clara",
      "matanzas": "Matanzas",
      "camagüey": "Camagüey",
      "holguín": "Holguín",
      "granma": "Granma",
      "las-tunas": "Las Tunas",
      "cienfuegos": "Cienfuegos",
      "sancti-spiritus": "Sancti Spíritus",
      "ciego-de-avila": "Ciego de Ávila",
      "pinar-del-rio": "Pinar del Río",
      "artemisa": "Artemisa",
      "mayabeque": "Mayabeque",
      "isla-de-la-juventud": "Isla de la Juventud",
      "guantanamo": "Guantánamo",
    };
    return provinces[value] || value;
  };

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold" data-testid="text-welcome">¡Hola, {user?.name}!</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center text-primary-foreground/90">
            <Phone className="w-4 h-4 mr-2" />
            <span data-testid="text-user-phone">+53 {user?.phone}</span>
            {user?.isVerified === "false" && (
              <Badge variant="destructive" className="ml-2 text-xs">
                No verificado
              </Badge>
            )}
          </div>
          <div className="flex items-center text-primary-foreground/90">
            <MapPin className="w-4 h-4 mr-2" />
            <span data-testid="text-user-province">{getProvinceName(user?.province || "")}</span>
          </div>
        </div>
      </div>

      {/* Verification Alert */}
      {user?.isVerified === "false" && (
        <div className="mx-6 mt-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-orange-800">Verificación pendiente</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    Para acceder a todas las funciones del marketplace, necesitas verificar tu número de teléfono.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 border-orange-200 text-orange-700 hover:bg-orange-100"
                    data-testid="button-verify-phone"
                  >
                    Verificar ahora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="text-4xl">🛍️</div>
          </div>
          
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Bienvenido a Rico-Cuba
          </h2>
          
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            El marketplace estará disponible pronto. Mientras tanto, puedes explorar tu perfil y configurar tu cuenta.
          </p>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Mi Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-medium" data-testid="profile-name">{user?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teléfono:</span>
                    <span className="font-medium" data-testid="profile-phone">+53 {user?.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provincia:</span>
                    <span className="font-medium" data-testid="profile-province">
                      {getProvinceName(user?.province || "")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado:</span>
                    {user?.isVerified === "true" ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Verificado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        No verificado
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
