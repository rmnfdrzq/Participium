import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import API from "../../../API/API.js";
import styles from "./verifyEmailPage.module.css";

export default function VerifyEmailPage({ user, setUser, setIsUnverifiedSession }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);


  // Check if we came from profile page (need to request code)
  useEffect(() => {

    const checkActiveToken = async () => {
      try {
        const activeToken = await API.checkValidateToken();
        if (activeToken) {
          setExpiresAt(activeToken.expires_at);
        } 
        const fromProfile = location.state?.fromProfile;
        if (fromProfile && !codeSent) {
          handleResendCode();
        }
      } catch (err) {
        console.error("Error checking active token:", err);
      }
    };

    checkActiveToken();
  }, [location.state]);

  const handleCodeChange = (e) => {
    // Allow only digits and max 6 characters
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await API.verifyEmail(code);
      setSuccess("Email verified successfully!");

      // Get user info and set user state (now verified)
      const userInfo = await API.getUserInfo();
      setUser(userInfo);
      setIsUnverifiedSession(false);

      // Redirect to home after short delay
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      setError(err.message || "Invalid or expired code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const newTokenExpiry = await API.requestVerificationCode();
      setCodeSent(true);
      setSuccess("A new code has been sent to your email");
      setTimeout(() => setSuccess(""), 3000);
      setExpiresAt(newTokenExpiry.expires_at);
    } catch (err) {
      setError(err.message || "Failed to send verification code");
      setExpiresAt(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatExpiry = (utcISOString) => {
  if (!utcISOString) return "";

  const date = new Date(utcISOString); // interpreted as UTC
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};



  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Verify Your Email</h1>
        <p className={styles.description}>
          We've sent a 6-digit verification code to your email address. Please
          enter it below to verify your account.
        </p>

        {expiresAt && (
  <p className={styles.expiryText}>
    Your active verification code expires on{" "}
    <strong>{formatExpiry(expiresAt)}</strong>
  </p>
)}


        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              className={styles.codeInput}
              maxLength={6}
              autoFocus
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? "Verifying..." : "Submit"}
          </button>
        </form>

        <div className={styles.resendSection}>
          <span className={styles.resendText}>Didn't receive the code?</span>
          <button
            type="button"
            className={styles.resendButton}
            onClick={handleResendCode}
            disabled={isLoading}
          >
            Resend Code
          </button>
        </div>
      </div>
    </div>
  );
}
