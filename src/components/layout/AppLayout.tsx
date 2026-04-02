import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { UserMenu } from './UserMenu';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <OnboardingProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              </div>
              <UserMenu />
            </header>
            <main className="flex-1 p-6 animate-fade-in">
              {children}
            </main>
          </div>
        </div>
      </OnboardingProvider>
    </SidebarProvider>
  );
}
