import { Link, useNavigate } from 'react-router';
import './HomePage.css';

const HomePage = ({ user }) => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Benvenuto su Participium</h1>
          <p className="hero-subtitle">
            La piattaforma per la partecipazione cittadina alla gestione dell'ambiente urbano di Torino
          </p>
          <p className="hero-description">
            Segnala disagi e malfunzionamenti presenti sul territorio: buche nell'asfalto, 
            barriere architettoniche, rifiuti, illuminazione pubblica non funzionante e molto altro.
          </p>
          
          {user ? (
            <div className="hero-actions">
              <button onClick={() => navigate('/create-report')} className="btn btn-primary-large">
                Crea una Segnalazione
              </button>
              <button onClick={() => navigate('/my-reports')} className="btn btn-secondary-large">
                Le Mie Segnalazioni
              </button>
            </div>
          ) : (
            <div className="hero-actions">
              <button onClick={() => navigate('/register')} className="btn btn-primary-large">
                Registrati Ora
              </button>
              <button onClick={() => navigate('/login')} className="btn btn-secondary-large">
                Accedi
              </button>
            </div>
          )}
        </div>
      </section>

      {/* How it Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">Come Funziona</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">👤</div>
              <h3>Registrati</h3>
              <p>Crea un account con email, nome utente e dati personali per accedere al sistema.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">📍</div>
              <h3>Individua il Problema</h3>
              <p>Seleziona la posizione esatta sulla mappa di Torino dove si trova il disservizio.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">📝</div>
              <h3>Fornisci i Dettagli</h3>
              <p>Aggiungi titolo, descrizione, categoria e fino a 3 foto del problema riscontrato.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-icon">✅</div>
              <h3>Monitora lo Stato</h3>
              <p>Segui l'evoluzione della tua segnalazione mentre il Comune la gestisce.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="container">
          <h2 className="section-title">Categorie di Segnalazione</h2>
          <p className="section-subtitle">Segnala problemi in diverse aree del territorio urbano</p>
          
          <div className="categories-grid">
            <div className="category-item">
              <div className="category-icon">💧</div>
              <h4>Acquedotto</h4>
              <p>Acqua potabile</p>
            </div>
            
            <div className="category-item">
              <div className="category-icon">♿</div>
              <h4>Barriere Architettoniche</h4>
              <p>Accessibilità</p>
            </div>
            
            <div className="category-item">
              <div className="category-icon">🚰</div>
              <h4>Fognatura</h4>
              <p>Sistema fognario</p>
            </div>
            
            <div className="category-item">
              <div className="category-icon">💡</div>
              <h4>Illuminazione Pubblica</h4>
              <p>Lampioni e luci stradali</p>
            </div>
            
            <div className="category-item">
              <div className="category-icon">🗑️</div>
              <h4>Rifiuti</h4>
              <p>Raccolta e pulizia</p>
            </div>
            
            <div className="category-item">
              <div className="category-icon">🚦</div>
              <h4>Segnaletica e Semafori</h4>
              <p>Cartelli e semafori</p>
            </div>
            
            <div className="category-item">
              <div className="category-icon">🛣️</div>
              <h4>Strade e Arredo Urbano</h4>
              <p>Manto stradale e elementi urbani</p>
            </div>
            
            <div className="category-item">
              <div className="category-icon">🌳</div>
              <h4>Verde Pubblico</h4>
              <p>Parchi e aree gioco</p>
            </div>
            
            <div className="category-item">
              <div className="category-icon">📋</div>
              <h4>Altro</h4>
              <p>Altre problematiche</p>
            </div>
          </div>
        </div>
      </section>

      {/* Report Lifecycle Section */}
      <section className="lifecycle-section">
        <div className="container">
          <h2 className="section-title">Ciclo di Vita di una Segnalazione</h2>
          <div className="lifecycle-timeline">
            <div className="timeline-item">
              <div className="timeline-badge badge-pending">In Attesa</div>
              <div className="timeline-content">
                <h4>In Attesa di Approvazione</h4>
                <p>La tua segnalazione è stata ricevuta ed è in fase di verifica preliminare.</p>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-badge badge-assigned">Assegnata</div>
              <div className="timeline-content">
                <h4>Assegnata</h4>
                <p>Dopo l'approvazione, la segnalazione viene inviata all'ufficio tecnico competente.</p>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-badge badge-progress">In Corso</div>
              <div className="timeline-content">
                <h4>In Lavorazione</h4>
                <p>L'intervento è stato pianificato e la risoluzione è iniziata.</p>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-badge badge-resolved">Risolta</div>
              <div className="timeline-content">
                <h4>Risolta</h4>
                <p>Il problema è stato risolto e la segnalazione viene chiusa.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Partecipa Anche Tu</h2>
          <p>Aiuta a migliorare la città di Torino segnalando i problemi che incontri quotidianamente</p>
          {!user && (
            <button onClick={() => navigate('/register')} className="btn btn-cta">
              Inizia Ora - Registrati Gratuitamente
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Participium</h4>
              <p>Piattaforma di partecipazione cittadina del Comune di Torino</p>
            </div>
            <div className="footer-section">
              <h4>Contatti</h4>
              <p>Email: info@participium.torino.it</p>
              <p>Tel: +39 011 XXX XXXX</p>
            </div>
            <div className="footer-section">
              <h4>Link Utili</h4>
              <p><Link to="/login">Accedi</Link></p>
              <p><Link to="/register">Registrati</Link></p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Comune di Torino - Participium. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;