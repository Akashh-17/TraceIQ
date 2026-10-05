import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { refreshAccessToken } from '../../api/axios';

export const ProtectedRoute: React.FC = () => {
  const token   = useAuthStore(state => state.token);
  const user    = useAuthStore(state => state.user);
  const setAuth = useAuthStore(state => state.setAuth);
  const logout  = useAuthStore(state => state.logout);

  // The access token lives in memory only, so a page reload clears it.
  // If a user is still remembered, restore the token from the HttpOnly refresh cookie first.
  const [restoring, setRestoring] = useState(!token && !!user);

  useEffect(() => {
    if (token || !user) return;
    refreshAccessToken()
      .then(accessToken => setAuth(accessToken, user))
      .catch(() => logout())
      .finally(() => setRestoring(false));
    // Runs once on mount — only the initial page load needs restoring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (restoring) {
    return (
      <div className="flex items-center justify-center h-screen bg-base">
        <p className="kicker">Restoring session…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
