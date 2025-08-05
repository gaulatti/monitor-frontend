import { Events } from '~/components/events';
import type { Route } from './+types/events';
import { SharedLayout } from '~/layouts/layout';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Events - Monitor' }, { name: 'description', content: 'Events dashboard - groups of similar posts' }];
}

export default function EventsPage() {
  return (
    <SharedLayout currentPage="events">
      <Events />
    </SharedLayout>
  );
}
