import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { useLocation } from "wouter";

interface MobileHeaderProps {
  showBack?: boolean;
  showSearch?: boolean;
  onBack?: () => void;
  title?: string;
}

export default function MobileHeader({ 
  showBack = true, 
  showSearch = true,
  onBack,
  title
}: MobileHeaderProps) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const handleSearch = () => {
    navigate('/search');
  };

  return (
    <div className="md:hidden sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Back Button or Spacer */}
        <div className="w-10">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              data-testid="button-back-mobile"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </Button>
          )}
        </div>

        {/* Center: Logo or Title */}
        <div className="flex-1 flex justify-center">
          {title ? (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h1>
          ) : (
            <h1 
              className="text-2xl font-bold text-primary cursor-pointer"
              onClick={() => navigate('/')}
              data-testid="brand-logo-mobile"
            >
              Rico-Cuba
            </h1>
          )}
        </div>

        {/* Right: Search Button or Spacer */}
        <div className="w-10">
          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSearch}
              className="rounded-full bg-primary hover:bg-primary/90 text-white"
              data-testid="button-search-mobile"
            >
              <Search className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
