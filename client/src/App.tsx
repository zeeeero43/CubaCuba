import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile-page";
import UserProfilePage from "@/pages/user-profile-page";
import CreateListingPage from "@/pages/create-listing-page";
import CategoriesPage from "@/pages/categories-page";
import CategoryPage from "@/pages/category-page";
import ListingDetailPage from "@/pages/listing-detail-page";
import ListingsPage from "@/pages/listings-page";
import ManageListingsPage from "@/pages/manage-listings-page";
import MyListingsPage from "@/pages/my-listings-page";
import EditListingPage from "@/pages/edit-listing-page";
import FavoritesPage from "@/pages/favorites-page";
import SearchResultsPage from "@/pages/search-results-page";
import AdminDashboardPage from "@/pages/admin-dashboard-page";
import AdminQueuePage from "@/pages/admin-queue-page";
import AdminReportsPage from "@/pages/admin-reports-page";
import AdminBlacklistPage from "@/pages/admin-blacklist-page";
import AdminSettingsPage from "@/pages/admin-settings-page";
import AdminUsersPage from "@/pages/admin-users-page";
import NotFound from "@/pages/not-found";
import BottomNavigation from "@/components/BottomNavigation";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/search" component={SearchResultsPage} />
        <Route path="/categories" component={CategoriesPage} />
        <Route path="/category/:categoryId" component={CategoryPage} />
        <Route path="/profile/:userId" component={UserProfilePage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <ProtectedRoute path="/create-listing" component={CreateListingPage} />
        <Route path="/listing/:id" component={ListingDetailPage} />
        <Route path="/listings" component={ListingsPage} />
        <ProtectedRoute path="/manage-listings" component={ManageListingsPage} />
        <ProtectedRoute path="/my-listings" component={MyListingsPage} />
        <ProtectedRoute path="/edit-listing/:id" component={EditListingPage} />
        <ProtectedRoute path="/favorites" component={FavoritesPage} />
        <ProtectedRoute path="/admin" component={AdminDashboardPage} />
        <ProtectedRoute path="/admin/queue" component={AdminQueuePage} />
        <ProtectedRoute path="/admin/reports" component={AdminReportsPage} />
        <ProtectedRoute path="/admin/blacklist" component={AdminBlacklistPage} />
        <ProtectedRoute path="/admin/settings" component={AdminSettingsPage} />
        <ProtectedRoute path="/admin/users" component={AdminUsersPage} />
        <Route component={NotFound} />
      </Switch>
    </>
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
