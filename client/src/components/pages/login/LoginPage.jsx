import { useState, useActionState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useDispatch } from "react-redux";
import { clearLocation } from "../../../store/locationSlice";
import API from "../../../API/API.js";
import styles from "./loginPage.module.css";

export function LoginPage(props) {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // Determine if we're on signup route
  const isLogin = location.pathname === "/login"; //it's true if we are in login and not in sign up

  /**
   * Handles user login by sending credentials to the API.
   * Sets success message and updates user state on success, or error message on failure.
   * @param {Object} credentials - User login credentials
   * @param {string} credentials.username - User email/username
   * @param {string} credentials.password - User password
   */
  const handleLogin = async (credentials) => {
    try {
      const user = await API.logIn(credentials);

      // Check if citizen user is verified
      if (user.role === "user" && !user.verified) {
        // Don't set user state - keep them "not logged in" on frontend
        // But session exists on server for verification API calls
        try {
          await API.requestVerificationCode();
        } catch (verifyErr) {
          console.error("Failed to send verification code:", verifyErr);
        }
        navigate("/verify-email");
        return;
      }

      // Only set user if verified (or not a citizen)
      props.setUser(user);
      dispatch(clearLocation());
      setMessage({ msg: `Welcome, ${user.username}!`, type: "success" });
      navigate("/");
    } catch (err) {
      // ensure we store a string message, not an Error object
      const text =
        err?.message || (typeof err === "string" ? err : JSON.stringify(err));
      setMessage({ msg: text, type: "error" });
    }
  };

  /**
   * Handles user registration by sending user data to the API.
   * Sets success message and updates user state on success, or error message on failure.
   * Automatically logs in the user after successful registration.
   * Handles different error formats from the server (validation errors, constraint errors, etc.).
   * @param {Object} userData - User registration data
   * @param {string} userData.name - User full name
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   */
  const handleSignUp = async (userData) => {
    try {
      await API.signUp(userData);

      // Automatically log in after successful registration (creates session on server)
      const credentials = {
        username: userData.email,
        password: userData.password,
      };

      await API.logIn(credentials);
      // Don't set user state - new users need to verify email first
      // Session exists on server for verification API calls

      // Request verification code and redirect to verification page
      try {
        await API.requestVerificationCode();
      } catch (verifyErr) {
        console.error("Failed to send verification code:", verifyErr);
      }

      navigate("/verify-email");
    } catch (err) {
      if (err && err.errors) {
        setMessage({
          msg: err.errors.map((e) => e.msg).join(", "),
          type: "error",
        });
      } else if (err && err.error) {
        setMessage({ msg: String(err.error), type: "error" });
      } else {
        const text =
          err?.message || (typeof err === "string" ? err : JSON.stringify(err));
        setMessage({ msg: text || "Registration failed", type: "error" });
      }
    }
  };

  return (
    <div className={styles.loginContainer}>
      {isLogin ? (
        <LoginForm
          handleLogin={handleLogin}
          message={message}
          onSwitchToSignUp={() => {
            navigate("/signup");
            setMessage("");
          }}
        />
      ) : (
        <SignUpForm
          handleSignUp={handleSignUp}
          message={message}
          onSwitchToLogin={() => {
            navigate("/login");
            setMessage("");
          }}
        />
      )}
    </div>
  );
}

/**
 * Login form component that handles user authentication.
 * @param {Object} props - Component props
 * @param {Function} props.handleLogin - Function to handle login submission
 * @param {Object} props.message - Message object with type and text
 * @param {Function} props.onSwitchToSignUp - Function to switch to signup form
 * @returns {JSX.Element} LoginForm component
 */
function LoginForm(props) {
  const navigate = useNavigate();
  const [state, formAction, isPending] = useActionState(loginFunction, {
    username: "",
    password: "",
  });

  /**
   * Action function for login form submission.
   * Extracts email and password from form data and calls the login handler.
   * @param {Object} _prevState - Previous state (unused)
   * @param {FormData} formData - Form data containing email and password
   * @returns {Object} State object indicating success or failure
   */
  async function loginFunction(_prevState, formData) {
    const credentials = {
      username: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      await props.handleLogin(credentials);
      return { success: true };
    } catch (error) {
      return { email: "", password: "" };
    }
  }

  return (
    <form action={formAction} className={styles.loginForm}>
      <h2 className={styles.loginTitle}>Login into your account</h2>

      {props.message && (
        <div
          className={
            props.message.type === "success"
              ? styles.successMessage
              : styles.errorMessage
          }
        >
          {String(props.message.msg)}
        </div>
      )}

      <input
        type="text"
        name="email"
        placeholder="Email or username"
        className={styles.inputField}
        required
        disabled={isPending}
      />

      <input
        type="password"
        name="password"
        placeholder="Password"
        className={styles.inputField}
        required
        minLength={6}
        disabled={isPending}
      />

      <button
        type="submit"
        className={`${styles.loginButton} btn-primary`}
        disabled={isPending}
      >
        {isPending ? "Logging in..." : "Log In"}
      </button>

      <div className={styles.signupLink}>
        Don't have an account?{" "}
        <button
          type="button"
          onClick={props.onSwitchToSignUp}
          className={styles.linkButton}
        >
          SignUp
        </button>
      </div>
    </form>
  );
}

/**
 * Sign up form component that handles user registration.
 * @param {Object} props - Component props
 * @param {Function} props.handleSignUp - Function to handle registration submission
 * @param {Object} props.message - Message object with type and text
 * @param {Function} props.onSwitchToLogin - Function to switch to login form
 * @returns {JSX.Element} SignUpForm component
 */
function SignUpForm(props) {
  const [state, formAction, isPending] = useActionState(signUpFunction, {
    name: "",
    surname: "",
    email: "",
    password: "",
  });

  /**
   * Action function for signup form submission.
   * Extracts name, surname, email, and password from form data, combines name and surname,
   * and calls the signup handler.
   * @param {Object} _prevState - Previous state (unused)
   * @param {FormData} formData - Form data containing name, surname, email, and password
   * @returns {Object} State object indicating success or failure
   */
  async function signUpFunction(_prevState, formData) {
    const name = formData.get("name");
    const surname = formData.get("surname");
    const emailNotifications = formData.get("email_notifications") === "on";

    const userData = {
      username: formData.get("email").split("@")[0] || name,
      first_name: name,
      last_name: surname || "",
      email: formData.get("email"),
      email_notifications: emailNotifications,
      password: formData.get("password"),
    };

    try {
      await props.handleSignUp(userData);
      return { success: true };
    } catch (error) {
      return { name: "", surname: "", email: "", password: "" };
    }
  }

  return (
    <form action={formAction} className={styles.loginForm}>
      <h2 className={styles.loginTitle}>Create your account</h2>

      {props.message && (
        <div
          className={
            props.message.type === "success"
              ? styles.successMessage
              : styles.errorMessage
          }
        >
          {String(props.message.msg)}
        </div>
      )}

      <input
        type="text"
        name="name"
        placeholder="Name"
        className={styles.inputField}
        required
        disabled={isPending}
      />

      <input
        type="text"
        name="surname"
        placeholder="Surname"
        className={styles.inputField}
        disabled={isPending}
      />

      <input
        type="email"
        name="email"
        placeholder="Email"
        className={styles.inputField}
        required
        disabled={isPending}
      />

      <input
        type="password"
        name="password"
        placeholder="Password"
        className={styles.inputField}
        required
        minLength={6}
        disabled={isPending}
      />

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          name="email_notifications"
          className={styles.checkbox}
          defaultChecked={true}
          disabled={isPending}
        />
        <span>I want to receive email notifications</span>
      </label>

      <button
        type="submit"
        className={`${styles.loginButton} btn-primary`}
        disabled={isPending}
      >
        {isPending ? "Signing up..." : "Sign Up"}
      </button>

      <div className={styles.signupLink}>
        Already have an account?{" "}
        <button
          type="button"
          onClick={props.onSwitchToLogin}
          className={styles.linkButton}
        >
          Login
        </button>
      </div>
    </form>
  );
}
