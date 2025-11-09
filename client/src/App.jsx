import "bootstrap/dist/css/bootstrap.min.css";
import { Routes, Route, Navigate } from "react-router";
import { DefaultLayout } from "./components/common/layout/Layout";
import InsertReportPage from "./components/pages/report/InsertReportPage";
import { LoginPage } from "./components/pages/login/LoginPage";
import HomePage from "./components/pages/home/HomePage";
import AdminPage from "./components/pages/admin/AdminPage";
import CreateUserPage from "./components/pages/admin/CreateUserPage";
import { MapPage } from "./components/pages/map/MapPage";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import API from "./API/API.mjs";
import "./App.css";

function App() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await API.getUserInfo(); // we have the user info here
        setUser(user);
      } catch (err) {
        // do nothing
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await API.logOut();
    setUser(null);
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
              user.username === "admin" ? (
                <Navigate replace to={`/admin`} />
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
        <Route path="/admin" element={<AdminPage user={user} />} />
        <Route
          path="/admin/createuser"
          element={<CreateUserPage user={user} />}
        />

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
