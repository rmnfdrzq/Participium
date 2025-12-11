import { Navigate } from "react-router";
import HomePage from "../components/pages/home/HomePage";
import RelationOfficerPage from "../components/pages/relation-officer/RelatioOfficerPage";
import TechnicalOfficerPage from "../components/pages/technical-officer/TechnicalOfficerPage";
import MaintainerPage from "../components/pages/maintainer/MaintainerPage";
import { MapPage } from "../components/pages/map/MapPage";

/**
 * RoleBasedHomePage - routes users to their appropriate home page based on role
 * Reduces cognitive complexity by using switch/case instead of nested ternaries
 */
function RoleBasedHomePage({ user }) {
  if (!user) {
    return <HomePage user={user} />;
  }

  switch (user.role) {
    case "Admin":
      return <Navigate replace to="/admin" />;
    case "Municipal public relations officer":
      return <RelationOfficerPage />;
    case "Technical office staff member":
      return <TechnicalOfficerPage />;
    case "External maintainer":
      return <MaintainerPage />;
    default:
      return <MapPage />;
  }
}

export default RoleBasedHomePage;

