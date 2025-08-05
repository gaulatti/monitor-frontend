import { Dashboard } from '~/components/dashboard';
import type { Route } from './+types/home';
import { SharedLayout } from '~/layouts/layout';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Dashboard - Monitor' }, { name: 'description', content: 'Monitor dashboard - social media posts' }];
}

export default function Home() {
  return (
    <SharedLayout currentPage="posts">
      <Dashboard />
    </SharedLayout>
  );
}
