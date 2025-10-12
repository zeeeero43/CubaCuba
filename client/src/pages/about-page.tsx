import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Flag, Users, Mail } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader title="Sobre Nosotros" backTo="/" />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Main Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Flag className="w-8 h-8 text-primary" />
              <CardTitle className="text-2xl">De cubanos para cubanos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p className="text-lg leading-relaxed">
              Rico-Cuba es un <strong>marketplace de anuncios clasificados</strong> creado para ayudar al pueblo cubano a comprar, vender e intercambiar productos y servicios de forma fácil y segura.
            </p>
            <p className="leading-relaxed">
              Nuestra misión es <strong>fortalecer la economía cubana</strong> conectando a vendedores y compradores de toda Cuba, facilitando el comercio local y apoyando a las familias cubanas.
            </p>
            <p className="leading-relaxed">
              Operamos desde el exterior pero servimos exclusivamente a la comunidad cubana, respetando profundamente las leyes y regulaciones de Cuba.
            </p>
          </CardContent>
        </Card>

        {/* Values */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Nuestros Valores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                🇨🇺 Respeto a las leyes cubanas
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Cumplimos estrictamente con todas las regulaciones de contenido y comercio de Cuba.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                🛡️ Moderación ultra-estricta
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Utilizamos inteligencia artificial avanzada para revisar cada anuncio antes de publicarlo, bloqueando contenido prohibido automáticamente.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                ⚖️ Solo comercio legítimo
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Permitimos únicamente la venta de productos y servicios legales para uso cotidiano: hogar, tecnología, vehículos, empleos, etc.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                👥 Para la comunidad cubana
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Nuestro único objetivo es servir al pueblo cubano y facilitar el comercio entre cubanos.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What we block */}
        <Card>
          <CardHeader>
            <CardTitle>Contenido Bloqueado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Para garantizar el cumplimiento de las leyes cubanas, bloqueamos automáticamente:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✗</span>
                <span>Todo contenido político de cualquier tipo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✗</span>
                <span>Productos o servicios ilegales (armas, drogas, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✗</span>
                <span>Contenido inmoral o pornográfico</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✗</span>
                <span>Estafas, productos falsos o publicidad engañosa</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Legal Entity */}
        <Card>
          <CardHeader>
            <CardTitle>Información Legal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              <strong>Operador:</strong> Rico-Cuba S.A. (Panamá)
            </p>
            <p>
              <strong>Ubicación:</strong> Registrado en Panamá, operando internacionalmente
            </p>
            <p>
              <strong>Mercado:</strong> Servicio exclusivo para Cuba
            </p>
          </CardContent>
        </Card>

        {/* Contact for Authorities */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" />
              Contacto para Autoridades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-700 dark:text-gray-300">
              Para consultas legales, solicitudes de las autoridades cubanas o asuntos relacionados con el cumplimiento:
            </p>
            <div className="bg-primary/10 p-4 rounded-lg">
              <p className="font-semibold text-primary">
                📧 legal@rico-cuba.com
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Respondemos a todas las solicitudes oficiales en un plazo de 48 horas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              Contacto de Soporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Para usuarios con preguntas o problemas técnicos:
            </p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              📧 soporte@rico-cuba.com
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
