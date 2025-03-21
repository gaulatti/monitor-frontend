import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { put, select } from 'redux-saga/effects';
import { login as loginDispatcher, setAuthLoaded } from '../../state/dispatchers/auth';
import { setKickoff } from '../../state/dispatchers/lifecycle';
import { currentUser as currentUserSelector } from '../../state/selectors/auth';
import { getKickoffReady } from '../../state/selectors/lifecycle';

/**
 * Checks the user's session and dispatches the appropriate actions based on the session status.
 * @returns An unknown value.
 */
function* checkSession(): unknown {
  const session = yield fetchAuthSession();
  const isKickoffReady = yield select(getKickoffReady);

  const { userSub, tokens } = session;

  /**
   * If the user is authenticated, fetch the user attributes and dispatch the login action.
   */
  if (userSub && !isKickoffReady) {
    const { accessToken } = tokens;
    /**
     * Initialize the SSE Shared Worker with the access token.
     */
    const sseWorker = new SharedWorker(new URL('../../engines/sse.shared.ts', import.meta.url), { type: 'module' });
    sseWorker.port.start();

    /**
     * Post the access token to the shared worker.
     */
    sseWorker.port.postMessage({ token: accessToken.toString() });

    /**
     * Fetch the user attributes.
     */
    const user = yield fetchUserAttributes();
    const { name, given_name, family_name, email } = user;

    /**
     * If all required attributes are available, dispatch the login action.
     */
    yield put(loginDispatcher({ sub: userSub, name, given_name, family_name, email }));
  } else {
    /**
     * If the user is not authenticated, dispatch the setAuthLoaded action.
     */
    yield put(setAuthLoaded());
  }
}

/**
 * Performs the login process.
 *
 * @returns An unknown value.
 */
function* login(): unknown {
  try {
    /**
     * Verify if there's a user before running kickoff
     */
    const currentUser = yield select(currentUserSelector);
    const isKickoffReady = yield select(getKickoffReady);

    if (currentUser && !isKickoffReady) {
      yield put(setKickoff());
    }
  } catch (e) {
    console.error('Error when setting login', e);
  }
}

export { checkSession, login };
