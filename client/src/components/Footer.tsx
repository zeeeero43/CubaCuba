import { Link } from "wouter";
import { Flag, Shield, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* About */}
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Flag className="w-5 h-5 text-primary" />
              Rico-Cuba
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              🇨🇺 De cubanos para cubanos
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Marketplace de anuncios clasificados para el pueblo cubano.
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">
              Información Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  Sobre Nosotros
                </Link>
              </li>
              <li>
                <Link href="/moderation-rules" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  Normas de Moderación
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contacto
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Soporte:</p>
                <a href="mailto:soporte@rico-cuba.com" className="text-primary hover:underline">
                  soporte@rico-cuba.com
                </a>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400">Autoridades:</p>
                <a href="mailto:legal@rico-cuba.com" className="text-primary hover:underline font-semibold">
                  legal@rico-cuba.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center md:text-left">
              Rico-Cuba S.A. (Panamá) • Operando internacionalmente para Cuba
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Shield className="w-4 h-4 text-primary" />
              <span>Moderación ultra-estricta con IA</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
