import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile-page";
import CreateListingPage from "@/pages/create-listing-page";
import ListingDetailPage from "@/pages/listing-detail-page";
import ListingsPage from "@/pages/listings-page";
import ManageListingsPage from "@/pages/manage-listings-page";
import NotFound from "@/pages/not-found";
import BottomNavigation from "@/components/BottomNavigation";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/create-listing" component={CreateListingPage} />
      <Route path="/listing/:id" component={ListingDetailPage} />
      <Route path="/listings" component={ListingsPage} />
      <ProtectedRoute path="/manage-listings" component={ManageListingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <div className="pb-20">
            <Router />
          </div>
          <BottomNavigation />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
