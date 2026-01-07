import { Link, useNavigate } from 'react-router';
import './HomePage.css';
import { MapPage } from "../map/MapPage";

const HomePage = ({ user }) => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to Participium</h1>
          <p className="hero-subtitle">
            The platform for citizen participation in urban environment management in Turin
          </p>
          <p className="hero-description">
            Report issues and malfunctions in the area: potholes in the asphalt, 
            architectural barriers, waste, non-functioning public lighting and much more.
          </p>
          
          {user ? (
            <div className="hero-actions">
              <button onClick={() => navigate('/create-report')} className="btn btn-primary-large">
                Create a Report
              </button>
              <button onClick={() => navigate('/my-reports')} className="btn btn-secondary-large">
                My Reports
              </button>
            </div>
          ) : (
            <div className="hero-actions">
              <button onClick={() => navigate('/signup')} className="btn btn-primary-large">
                Register Now
              </button>
              <button onClick={() => navigate('/login')} className="btn btn-secondary-large">
                Login
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="map-showcase-section">
        <div className="container">
          <h2 className="section-title">Explore Reports on the Map</h2>
          <p className="section-subtitle">
            View all reported issues in Turin and select a location to create your own report
          </p>
          
          <div className="map-container-wrapper">
            <MapPage />
          </div>

        </div>
      </section>
      
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">👤</div>
              <h3>Register</h3>
              <p>Create an account with email, username and personal data to access the system.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">📍</div>
              <h3>Identify the Problem</h3>
              <p>Select the exact location on the Turin map where the issue is located.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">📝</div>
              <h3>Provide Details</h3>
              <p>Add title, description, category and up to 3 photos of the problem encountered.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-icon">✅</div>
              <h3>Monitor Status</h3>
              <p>Follow the progress of your report as the Municipality handles it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Join Us</h2>
          <p className="hero-subtitle">Help improve the city of Turin by reporting the problems you encounter daily</p>
          {!user && (
            <button onClick={() => navigate('/signup')} className="btn btn-cta">
              Get Started - Register for Free
            </button>
          )}
        </div>
      </section>

    </div>
  );
};

export default HomePage;