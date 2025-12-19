import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RegionProvider } from "@/contexts/RegionContext";
import { I18nProvider } from "@/contexts/I18nContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ScanDetails from "./pages/ScanDetails";
import Pricing from "./pages/Pricing";
import RedeemCode from "./pages/RedeemCode";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RegionProvider>
        <I18nProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/scan/:id" element={<ScanDetails />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/redeem" element={<RedeemCode />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </I18nProvider>
      </RegionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
