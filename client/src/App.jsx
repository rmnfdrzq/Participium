import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { clearLocation } from "./store/locationSlice";
import API from "./API/API.js";
import AppRouter from "./routes/AppRouter";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [citizenProfile, setCitizenProfile] = useState(null);
  const [isUnverifiedSession, setIsUnverifiedSession] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await API.getUserInfo();
        if (currentUser.role === "user" && !currentUser.verified) {
          setUser(null);
          setIsUnverifiedSession(true);
        } else {
          setUser(currentUser);
          setIsUnverifiedSession(false);
        }
      } catch {
        setUser(null);
        setIsUnverifiedSession(false);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchCitizenProfile = async () => {
      if (user?.role === "user") {
        try {
          const profile = await API.getCitizenProfile();
          setCitizenProfile(profile);
        } catch {
          setCitizenProfile(null);
        }
      } else {
        setCitizenProfile(null);
      }
    };
    fetchCitizenProfile();
  }, [user]);

  const handleLogout = async () => {
    await API.logOut();
    setUser(null);
    dispatch(clearLocation());
    navigate("/");
  };

  return (
    <AppRouter
      user={user}
      setUser={setUser}
      isAuthLoading={isAuthLoading}
      citizenProfile={citizenProfile}
      setCitizenProfile={setCitizenProfile}
      isUnverifiedSession={isUnverifiedSession}
      setIsUnverifiedSession={setIsUnverifiedSession}
      handleLogout={handleLogout}
    />
  );
}

export default App;
