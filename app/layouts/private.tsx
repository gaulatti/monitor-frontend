import { Flex } from '@radix-ui/themes';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router';
import { useAuthStatus } from '~/hooks/useAuth';
import { getKickoffReady } from '~/state/selectors/lifecycle';

const PrivateLayout = () => {
  const { isAuthenticated, isLoaded } = useAuthStatus();
  const isKickoffReady = useSelector(getKickoffReady);

  if (isAuthenticated && isLoaded && isKickoffReady) {
    return (
      <Flex direction='column' justify='between' style={{ minHeight: '100vh' }}>
        <main>
          <pre>header</pre>
          <Outlet />
        </main>
        <pre>footer</pre>
      </Flex>
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
  return <pre>spinner</pre>;
};

export default PrivateLayout;