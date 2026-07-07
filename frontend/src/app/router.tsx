import { Routes, Route, Navigate } from 'react-router-dom';
import { RoleGuard } from './components/RoleGuard';
import { useSession } from './context/SessionContext';

import PoolDashboardPage from './pages/vendor/PoolDashboardPage';
import PoolsBrowsePage from './pages/vendor/PoolsBrowsePage';
import ContributePage from './pages/vendor/ContributePage';
import RequestEmergencyDrawPage from './pages/vendor/RequestEmergencyDrawPage';
import MyReputationPage from './pages/vendor/MyReputationPage';
import VouchForVendorPage from './pages/vendor/VouchForVendorPage';

import CashCollectionLogPage from './pages/kolektor/CashCollectionLogPage';

import MarketDashboardPage from './pages/admin/MarketDashboardPage';
import CreatePoolPage from './pages/admin/CreatePoolPage';
import DisputeResolutionPage from './pages/admin/DisputeResolutionPage';

import ProfilePage from './pages/ProfilePage';

const ROLE_HOME: Record<'vendor' | 'kolektor' | 'admin', string> = {
  vendor: '/pool',
  kolektor: '/kolektor/log',
  admin: '/admin',
};

export function AppRoutes() {
  const { activeRole } = useSession();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={activeRole ? ROLE_HOME[activeRole] : '/pool'} replace />} />

      <Route
        path="/pool"
        element={
          <RoleGuard allow={['vendor']}>
            <PoolDashboardPage />
          </RoleGuard>
        }
      />
      <Route
        path="/pools"
        element={
          <RoleGuard allow={['vendor']}>
            <PoolsBrowsePage />
          </RoleGuard>
        }
      />
      <Route
        path="/pool/contribute"
        element={
          <RoleGuard allow={['vendor']}>
            <ContributePage />
          </RoleGuard>
        }
      />
      <Route
        path="/pool/emergency-draw"
        element={
          <RoleGuard allow={['vendor']}>
            <RequestEmergencyDrawPage />
          </RoleGuard>
        }
      />
      <Route
        path="/reputation"
        element={
          <RoleGuard allow={['vendor']}>
            <MyReputationPage />
          </RoleGuard>
        }
      />
      <Route
        path="/vouch"
        element={
          <RoleGuard allow={['vendor']}>
            <VouchForVendorPage />
          </RoleGuard>
        }
      />

      <Route
        path="/kolektor/log"
        element={
          <RoleGuard allow={['kolektor']}>
            <CashCollectionLogPage />
          </RoleGuard>
        }
      />

      <Route
        path="/admin"
        element={
          <RoleGuard allow={['admin']}>
            <MarketDashboardPage />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/pools/new"
        element={
          <RoleGuard allow={['admin']}>
            <CreatePoolPage />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/disputes"
        element={
          <RoleGuard allow={['admin']}>
            <DisputeResolutionPage />
          </RoleGuard>
        }
      />

      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}
