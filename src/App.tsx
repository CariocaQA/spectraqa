import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import BddGenerator from "@/pages/BddGenerator";
import K6Generator from "@/pages/K6Generator";
import JiraConnections from "@/pages/JiraConnections";
import JiraSuggestions from "@/pages/JiraSuggestions";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import ConsultorQA from "@/pages/ConsultorQA";
import KnowledgeBase from "@/pages/KnowledgeBase";
import ProjectInfo from "@/pages/ProjectInfo";
import CommunityFeedback from "@/pages/CommunityFeedback";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/consultor" element={<ProtectedRoute><AppLayout><ConsultorQA /></AppLayout></ProtectedRoute>} />
            <Route path="/jira-suggestions" element={<ProtectedRoute><AppLayout><JiraSuggestions /></AppLayout></ProtectedRoute>} />
            <Route path="/bdd" element={<ProtectedRoute><AppLayout><BddGenerator /></AppLayout></ProtectedRoute>} />
            <Route path="/k6" element={<ProtectedRoute><AppLayout><K6Generator /></AppLayout></ProtectedRoute>} />
            <Route path="/connections" element={<ProtectedRoute><AppLayout><JiraConnections /></AppLayout></ProtectedRoute>} />
            <Route path="/project-info" element={<ProtectedRoute><AppLayout><ProjectInfo /></AppLayout></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><AppLayout><History /></AppLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AppLayout><Admin /></AppLayout></ProtectedRoute>} />
            <Route path="/knowledge" element={<ProtectedRoute><AppLayout><KnowledgeBase /></AppLayout></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute><AppLayout><CommunityFeedback /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
