import "bootstrap/dist/css/bootstrap.min.css";
import { Routes, Route, Navigate } from "react-router";
import { DefaultLayout } from "./components/common/layout/Layout";
import InsertReportPage from "./components/pages/report/InsertReportPage";
import { LoginPage } from "./components/pages/login/LoginPage";
import HomePage from "./components/pages/home/HomePage";
import AdminPage from "./components/pages/admin/AdminPage";
import RelationOfficerPage from "./components/pages/relation-officer/RelatioOfficerPage";
import TechnicalOfficerPage from "./components/pages/technical-officer/TechnicalOfficerPage";
import CreateUserPage from "./components/pages/admin/CreateUserPage";
import InspectReportPage from "./components/pages/inspectReport/inspectReportPage.jsx";
import { MapPage } from "./components/pages/map/MapPage";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { clearLocation } from "./store/locationSlice";
import API from "./API/API.js";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await API.getUserInfo();
        setUser(user);
      } catch (err) {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await API.logOut();
    setUser(null);
    dispatch(clearLocation());
    navigate("/");
  };

  return (
    <Routes>
      <Route
        element={<DefaultLayout user={user} handleLogout={handleLogout} />}
      >
        <Route
          path="/"
          element={
            user ? (
              user.role === "Admin" ? (
                <Navigate replace to={`/admin`} />
              ) : user.role === "Municipal public relations officer" ? (
                <RelationOfficerPage />
              ) : user.role == "Technical office staff member" ? (
                <TechnicalOfficerPage />
              ) : (
                <MapPage />
              )
            ) : (
              <HomePage user={user} />
            )
          }
        />

        <Route
          path="/login"
          element={<LoginPage user={user} setUser={setUser} />}
        />
        <Route
          path="/signup"
          element={<LoginPage user={user} setUser={setUser} />}
        />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/createuser" element={<CreateUserPage />} />

        <Route path="/relationOfficer" element={<RelationOfficerPage />} />

        <Route path="/inspectReport" element={<InspectReportPage />} />

        <Route path="/technicalOfficer" element={<TechnicalOfficerPage />} />

        <Route path="/map" element={user ? <MapPage /> : <Navigate to="/" />} />

        <Route
          path="/create_report"
          element={
            user ? <InsertReportPage user={user} /> : <Navigate to="/" />
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

export default App;
