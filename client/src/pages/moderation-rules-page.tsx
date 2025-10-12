import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, XCircle, Shield } from "lucide-react";

export default function ModerationRulesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader title="Normas de Moderación" backTo="/" />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Intro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Sistema de Moderación Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p className="leading-relaxed">
              Rico-Cuba utiliza <strong>inteligencia artificial avanzada</strong> para revisar automáticamente cada anuncio antes de publicarlo. Nuestro sistema está diseñado para garantizar el cumplimiento estricto de las regulaciones cubanas de contenido.
            </p>
            <p className="leading-relaxed">
              Todos los anuncios pasan por un análisis exhaustivo que evalúa el título, la descripción, las imágenes y la información de contacto. El proceso es automático e instantáneo.
            </p>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle>¿Cómo funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Envías tu anuncio</h3>
                <p className="text-gray-600 dark:text-gray-400">Completas el formulario con toda la información del producto o servicio</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Revisión automática por IA</h3>
                <p className="text-gray-600 dark:text-gray-400">Nuestro sistema analiza el contenido en segundos buscando cualquier violación</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Decisión instantánea</h3>
                <p className="text-gray-600 dark:text-gray-400">Aprobado y publicado inmediatamente, o rechazado con explicación del motivo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Allowed Content */}
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-6 h-6" />
              Contenido Permitido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span><strong>Hogar y decoración:</strong> Muebles, electrodomésticos, artículos para el hogar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span><strong>Tecnología:</strong> Computadoras, teléfonos, tablets, accesorios electrónicos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span><strong>Vehículos:</strong> Autos, motos, bicicletas, piezas y repuestos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span><strong>Moda y ropa:</strong> Ropa, zapatos, accesorios, joyería</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span><strong>Empleos y servicios:</strong> Ofertas de trabajo legítimas, servicios profesionales</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span><strong>Inmuebles:</strong> Venta o alquiler de viviendas, locales comerciales</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span><strong>Productos cotidianos:</strong> Alimentos, bebidas, productos de higiene, etc.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Prohibited Content */}
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="w-6 h-6" />
              Contenido Estrictamente Prohibido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">
                🚫 Contenido Político (CERO TOLERANCIA)
              </h3>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300 ml-6">
                <li>• Cualquier crítica al gobierno cubano o sus líderes</li>
                <li>• Contenido pro-democracia, pro-oposición o disidente</li>
                <li>• Palabras como "libertad", "democracia", "oposición", "dictadura"</li>
                <li>• Contenido anti-revolucionario o contra el orden constitucional</li>
                <li>• Propaganda política de cualquier tipo</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">
                ⚔️ Actividades Ilegales
              </h3>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300 ml-6">
                <li>• Armas, municiones o explosivos</li>
                <li>• Drogas o sustancias ilegales</li>
                <li>• Tráfico de personas, prostitución o servicios sexuales</li>
                <li>• Productos robados o falsificados</li>
                <li>• Cambio ilegal de divisas o lavado de dinero</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">
                🔞 Contenido Inmoral
              </h3>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300 ml-6">
                <li>• Pornografía o contenido sexual explícito</li>
                <li>• Sectas satánicas o brujería comercial</li>
                <li>• Discursos de odio, racismo o discriminación</li>
                <li>• Violencia, amenazas o intimidación</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">
                💰 Estafas y Fraudes
              </h3>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300 ml-6">
                <li>• Esquemas piramidales o MLM</li>
                <li>• Productos falsos o publicidad engañosa</li>
                <li>• Contenido duplicado o spam</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Consequences */}
        <Card className="border-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              Consecuencias de Violaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700 dark:text-gray-300">
            <p><strong>Primera violación:</strong> Anuncio rechazado automáticamente con explicación</p>
            <p><strong>Violaciones repetidas:</strong> Suspensión temporal de la cuenta</p>
            <p><strong>Violaciones graves:</strong> Bloqueo permanente del usuario, teléfono y email</p>
            <p className="text-red-600 dark:text-red-400 font-semibold">
              ⚠️ Las violaciones políticas resultan en bloqueo inmediato y permanente
            </p>
          </CardContent>
        </Card>

        {/* Appeals */}
        <Card>
          <CardHeader>
            <CardTitle>Sistema de Apelaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Si crees que tu anuncio fue rechazado por error, puedes apelar la decisión desde tu perfil.
            </p>
            <ul className="space-y-2">
              <li>• Máximo 2 apelaciones por anuncio</li>
              <li>• Un moderador humano revisará tu caso</li>
              <li>• Respuesta en 24-48 horas</li>
            </ul>
            <p className="text-amber-600 dark:text-amber-400">
              <strong>Nota:</strong> Las apelaciones por contenido político no serán aceptadas bajo ninguna circunstancia.
            </p>
          </CardContent>
        </Card>

        {/* Report */}
        <Card>
          <CardHeader>
            <CardTitle>Reportar Contenido Inapropiado</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700 dark:text-gray-300">
            <p className="mb-3">
              Si encuentras un anuncio que viola nuestras normas, repórtalo inmediatamente usando el botón "Reportar" en la página del anuncio.
            </p>
            <p className="font-semibold">
              Ayúdanos a mantener Rico-Cuba seguro y conforme a las leyes cubanas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
