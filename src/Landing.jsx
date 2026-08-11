import { useNavigate } from 'react-router-dom';
import hero from './assets/hero.png';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-logo">
          <div className="landing-logo-mark">RN</div>
          <span className="landing-logo-name">RescueNet</span>
        </div>
      </header>

      <main className="landing-hero">
        <div className="landing-copy">
          <h1>Disaster relief coordination, in one place</h1>
          <p>
            RescueNet centralizes disaster events, shelters, emergency announcements,
            resources and volunteers for Malaysia's relief operations — helping
            responders, organizations and the public stay coordinated when it matters most.
          </p>
          <button className="landing-continue-btn" onClick={() => navigate('/login')}>
            Continue
          </button>
        </div>
        <img className="landing-hero-image" src={hero} alt="" />
      </main>
    </div>
  );
}
