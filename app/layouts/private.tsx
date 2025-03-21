import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router';
import { AppSidebar } from '~/components/app-sidebar';
import { OverlaySpinner } from '~/components/spinners';
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar';
import { useAuthStatus } from '~/hooks/useAuth';
import { getKickoffReady } from '~/state/selectors/lifecycle';

const PrivateLayout = () => {
  const { isAuthenticated, isLoaded } = useAuthStatus();
  const isKickoffReady = useSelector(getKickoffReady);

  if (isAuthenticated && isLoaded && isKickoffReady) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    );
  }

  /**
   * Redirects to the login page if the user is not authenticated
   * and the current page is not a public page.
   */
  if (isLoaded && !isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  /**
   * Renders a loading spinner if the user is not authenticated
   * or the kickoff is not ready.
   */
  return <OverlaySpinner />;
};

export default PrivateLayout;
