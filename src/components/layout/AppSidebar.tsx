import { Home, FileText, Zap, Link2, History, Settings, Sparkles, Shield, MessageCircle, BookOpen, Lightbulb, FolderKanban, MessageSquarePlus } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: Home, tourClass: 'nav-dashboard' },
  { title: 'Consultor QA', url: '/consultor', icon: MessageCircle, tourClass: 'nav-consultor' },
  { title: 'Sugestões Jira', url: '/jira-suggestions', icon: Lightbulb, tourClass: 'nav-suggestions' },
  { title: 'Gerar BDD', url: '/bdd', icon: FileText, tourClass: 'nav-bdd' },
  { title: 'Gerar K6', url: '/k6', icon: Zap, tourClass: 'nav-k6' },
  { title: 'Informações Projeto', url: '/project-info', icon: FolderKanban, tourClass: 'nav-project-info' },
  { title: 'Conexões Jira', url: '/connections', icon: Link2, tourClass: 'nav-connections' },
  { title: 'Histórico', url: '/history', icon: History, tourClass: 'nav-history' },
  { title: 'Feedback', url: '/feedback', icon: MessageSquarePlus, tourClass: 'nav-feedback' },
  { title: 'Configurações', url: '/settings', icon: Settings, tourClass: 'nav-settings' },
];

const adminMenuItems = [
  { title: 'Base de Conhecimento', url: '/knowledge', icon: BookOpen, tourClass: 'nav-knowledge' },
  { title: 'Administração', url: '/admin', icon: Shield, tourClass: 'nav-admin' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';
  const { isAdmin } = useIsAdmin();

  const allMenuItems = isAdmin ? [...menuItems, ...adminMenuItems] : menuItems;

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-gradient">SpectraQA</span>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {allMenuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title} className={item.tourClass}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          isActive && 'bg-sidebar-accent text-primary font-medium'
                        )}
                      >
                        <item.icon className={cn(
                          'w-5 h-5 shrink-0',
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        {!collapsed && (
                          <span className="truncate">{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
