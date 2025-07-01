import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  index('pages/home.tsx'),
  // layout('./layouts/private.tsx', [route('/logout', './pages/auth/logout.tsx')]),
  // route('/login', './pages/auth/login.tsx'),
] satisfies RouteConfig;
