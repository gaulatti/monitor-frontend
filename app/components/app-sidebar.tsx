import { Activity, AudioWaveform, Command, GalleryVerticalEnd, LayoutList, Network, Newspaper, Radar, Tv, User } from 'lucide-react';
import * as React from 'react';

import { NavMain } from '~/components/nav-main';
import { NavProjects } from '~/components/nav-projects';
import { NavUser } from '~/components/nav-user';
import { TeamSwitcher } from '~/components/team-switcher';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, useSidebar } from '~/components/ui/sidebar';
import { Logo } from './ui/logo';


// This is sample data.
const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup',
    },
    {
      name: 'Evil Corp.',
      logo: Command,
      plan: 'Free',
    },
  ],
  navMain: [
    {
      title: 'Playlists',
      url: '/playlists',
      icon: LayoutList,
      isActive: true,
    },
    {
      title: 'Strategies',
      url: '/strategies',
      icon: Network,
      isActive: true,
    },
  ],
  projects: [
    {
      name: 'Autostrada',
      url: '//autostrada.gaulatti.com',
      icon: Activity,
    },
    {
      name: 'Ariston',
      url: '//ariston.gaulatti.com',
      icon: Newspaper,
    },
    {
      name: 'Alcántara',
      url: '//alcantara.gaulatti.com',
      icon: Tv,
    },
    {
      name: 'Monitor',
      url: '//monitor.gaulatti.com',
      icon: Radar,
    },
    {
      name: 'Wiphala',
      url: '//wiphala.gaulatti.com',
      icon: LayoutList,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar()

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        {state !== 'collapsed' && <Logo to='/'>monitor</Logo>}
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
