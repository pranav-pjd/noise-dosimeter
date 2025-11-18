/**
 * Privacy - Privacy information and assurance
 */

class Privacy {
  init() {
    const badge = document.getElementById('privacyBadge');
    const learnBtn = document.getElementById('learnPrivacyBtn');
    const modal = document.getElementById('privacyModal');
    const closeBtn = document.getElementById('closePrivacyModal');
    const content = document.getElementById('privacyContent');

    const privacyHTML = `
      <h3>How Your Data is Protected</h3>
      <p>Your privacy is our top priority. Here's how we protect it:</p>

      <h4>✓ Local Processing Only</h4>
      <p>All noise measurements and calculations happen entirely on your device. No data is sent to any server.</p>

      <h4>✓ No Internet Required</h4>
      <p>This app works completely offline. We never connect to the internet to transmit your data.</p>

      <h4>✓ No Tracking or Analytics</h4>
      <p>We don't track your usage, collect personal information, or use analytics services.</p>

      <h4>✓ You Own Your Data</h4>
      <p>All exposure records are stored in your browser's local database (IndexedDB). You can export or delete your data anytime.</p>

      <h4>✓ No Third Parties</h4>
      <p>We don't share data with advertisers, marketers, or any third parties. Your hearing health data stays with you.</p>

      <h4>✓ Open Source Code</h4>
      <p>Our code is transparent and can be audited. No hidden data collection.</p>

      <div style="margin-top: 20px; padding: 15px; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
        <strong>Your Data, Your Control</strong><br>
        Export your data anytime from Settings → Export Data<br>
        Clear all data from Settings → Clear All Data
      </div>
    `;

    if (content) content.innerHTML = privacyHTML;

    if (badge) {
      badge.addEventListener('click', () => {
        modal.classList.remove('hidden');
      });
    }

    if (learnBtn) {
      learnBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    }
  }
}

const privacy = new Privacy();
