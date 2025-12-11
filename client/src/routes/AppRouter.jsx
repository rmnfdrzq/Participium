import { Routes, Route, Navigate } from "react-router";
import { DefaultLayout } from "../components/common/layout/Layout";
import InsertReportPage from "../components/pages/report/InsertReportPage";
import { LoginPage } from "../components/pages/login/LoginPage";
import AdminPage from "../components/pages/admin/AdminPage";
import CreateUserPage from "../components/pages/admin/CreateUserPage";
import InspectReportPage from "../components/pages/inspectReport/inspectReportPage.jsx";
import ProfilePage from "../components/pages/profile/ProfilePage";
import VerifyEmailPage from "../components/pages/verify-email/VerifyEmailPage";
import CommentsPage from "../components/pages/report/CommentsPage";
import RelationOfficerPage from "../components/pages/relation-officer/RelatioOfficerPage";
import TechnicalOfficerPage from "../components/pages/technical-officer/TechnicalOfficerPage";
import { MapPage } from "../components/pages/map/MapPage";
import ProtectedRoute from "./ProtectedRoute";
import RoleBasedHomePage from "./RoleBasedHomePage";

function AppRouter({
  user,
  setUser,
  isAuthLoading,
  citizenProfile,
  setCitizenProfile,
  isUnverifiedSession,
  setIsUnverifiedSession,
  handleLogout,
}) {
  const renderVerifyEmailRoute = () => {
    if (isAuthLoading) return null;
    if (isUnverifiedSession) {
      return (
        <VerifyEmailPage
          user={user}
          setUser={setUser}
          setIsUnverifiedSession={setIsUnverifiedSession}
        />
      );
    }
    return <Navigate to="/" />;
  };

  const renderProfileRoute = () => {
    if (isAuthLoading) return null;
    if (user?.role === "user") {
      return (
        <ProfilePage
          user={user}
          citizenProfile={citizenProfile}
          setCitizenProfile={setCitizenProfile}
        />
      );
    }
    return <Navigate to="/" />;
  };

  return (
    <Routes>
      <Route
        element={
          <DefaultLayout
            user={user}
            handleLogout={handleLogout}
            citizenProfile={citizenProfile}
          />
        }
      >
        <Route path="/" element={<RoleBasedHomePage user={user} />} />

        <Route
          path="/login"
          element={
            <LoginPage
              user={user}
              setUser={setUser}
              setIsUnverifiedSession={setIsUnverifiedSession}
            />
          }
        />
        <Route
          path="/signup"
          element={
            <LoginPage
              user={user}
              setUser={setUser}
              setIsUnverifiedSession={setIsUnverifiedSession}
            />
          }
        />

        <Route path="/verify-email" element={renderVerifyEmailRoute()} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute isUnverifiedSession={isUnverifiedSession}>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/createuser"
          element={
            <ProtectedRoute isUnverifiedSession={isUnverifiedSession}>
              <CreateUserPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/relationOfficer"
          element={
            <ProtectedRoute isUnverifiedSession={isUnverifiedSession}>
              <RelationOfficerPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inspectReport"
          element={
            <ProtectedRoute isUnverifiedSession={isUnverifiedSession}>
              <InspectReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/technicalOfficer"
          element={
            <ProtectedRoute isUnverifiedSession={isUnverifiedSession}>
              <TechnicalOfficerPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/comments"
          element={
            <ProtectedRoute isUnverifiedSession={isUnverifiedSession}>
              <CommentsPage user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/map"
          element={
            <ProtectedRoute
              isUnverifiedSession={isUnverifiedSession}
              requireAuth
              user={user}
            >
              <MapPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute isUnverifiedSession={isUnverifiedSession}>
              {renderProfileRoute()}
            </ProtectedRoute>
          }
        />

        <Route
          path="/create_report"
          element={
            <ProtectedRoute
              isUnverifiedSession={isUnverifiedSession}
              requireAuth
              user={user}
            >
              <InsertReportPage user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <ProtectedRoute isUnverifiedSession={isUnverifiedSession}>
              <Navigate to="/" />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default AppRouter;

