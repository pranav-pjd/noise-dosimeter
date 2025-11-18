/**
 * Learn More - Educational content about hearing health
 */

class LearnMore {
  init() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        const isOpen = !content.classList.contains('hidden');

        // Close all
        document.querySelectorAll('.accordion-content').forEach(c => c.classList.add('hidden'));
        document.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('expanded'));

        // Open clicked
        if (!isOpen) {
          content.classList.remove('hidden');
          header.classList.add('expanded');

          // Load content if empty
          if (!content.innerHTML.trim()) {
            this.loadContent(content.id);
          }
        }
      });
    });
  }

  loadContent(id) {
    const content = document.getElementById(id);
    if (!content) return;

    const contents = {
      learnHearing: `
        <h4>Understanding Noise-Induced Hearing Loss (NIHL)</h4>
        <p>Noise-induced hearing loss occurs when delicate hair cells in your inner ear (cochlea) are damaged by loud sounds. These cells convert sound vibrations into electrical signals for your brain.</p>

        <h4>How Damage Occurs</h4>
        <ul>
          <li><strong>Acute damage:</strong> Single very loud noise (explosion, gunshot) can instantly destroy hair cells</li>
          <li><strong>Chronic damage:</strong> Prolonged exposure to moderate noise gradually wears down hair cells</li>
          <li><strong>Cumulative effect:</strong> Daily exposure adds up - 8 hours at 85 dB = 15 minutes at 100 dB</li>
        </ul>

        <h4>Why It's Permanent</h4>
        <p>Unlike other cells in your body, cochlear hair cells do not regenerate. Once damaged, hearing loss is permanent and irreversible.</p>

        <p><strong>Over 1.5 billion people worldwide are at risk of NIHL (WHO).</strong></p>
      `,
      learnNiosh: `
        <h4>NIOSH Dosimetry Explained</h4>
        <p>The National Institute for Occupational Safety and Health (NIOSH) provides scientifically-based guidelines for safe noise exposure.</p>

        <h4>The Formula</h4>
        <p><strong>Safe Time = 8 × 2^((85-L)/3)</strong></p>
        <p>Where L is noise level in dB</p>

        <h4>3 dB Exchange Rate</h4>
        <p>For every 3 dB increase in noise, safe exposure time is halved:</p>
        <ul>
          <li>85 dB → 8 hours</li>
          <li>88 dB → 4 hours</li>
          <li>91 dB → 2 hours</li>
          <li>94 dB → 1 hour</li>
        </ul>

        <h4>Why NIOSH vs OSHA?</h4>
        <p>NIOSH uses a 3 dB exchange rate (more protective) while OSHA uses 5 dB. At NIOSH's 85 dB limit, the risk of NIHL is 8%. At OSHA's 90 dB limit, it's 25%.</p>
      `,
      learnDose: `
        <h4>Understanding Your Daily Dose</h4>
        <p>Your "dose" is the percentage of your safe daily noise exposure you've consumed.</p>

        <h4>How It's Calculated</h4>
        <p>Dose = (Actual Time / Allowable Time) × 100%</p>

        <h4>What the Percentages Mean</h4>
        <ul>
          <li><strong>0-50%:</strong> Safe zone - minimal risk</li>
          <li><strong>50-100%:</strong> Approaching limit - monitor exposure</li>
          <li><strong>100%:</strong> Daily safe limit reached</li>
          <li><strong>>100%:</strong> Exceeding safe exposure - immediate action needed</li>
        </ul>

        <h4>Why Percentage?</h4>
        <p>Hours are misleading because loud noise for short time = quiet noise for long time. Percentage accounts for both level AND duration.</p>
      `,
      learnSafe: `
        <h4>Safe Listening Practices</h4>

        <h4>The 60/60 Rule</h4>
        <p>Listen at no more than 60% volume for no more than 60 minutes at a time.</p>

        <h4>Use Hearing Protection</h4>
        <ul>
          <li>Foam earplugs: 15-30 dB reduction</li>
          <li>Noise-cancelling headphones: Reduce need for high volume</li>
          <li>Custom earplugs: Best protection for musicians</li>
        </ul>

        <h4>Take Breaks</h4>
        <p>After loud exposure, give your ears 12-16 hours of quiet to recover.</p>

        <h4>Lower Volume</h4>
        <p>If you need to shout to be heard over music/noise, it's too loud.</p>

        <h4>Regular Hearing Tests</h4>
        <p>Get baseline hearing test and monitor changes annually.</p>
      `,
      learnReferences: `
        <h4>Scientific References</h4>

        <h4>Primary Sources</h4>
        <ul>
          <li><strong>NIOSH Criteria Document (1998)</strong><br>
          "Criteria for a Recommended Standard: Occupational Noise Exposure"<br>
          Establishes 85 dB REL with 3 dB exchange rate</li>

          <li><strong>WHO Guidelines (2021)</strong><br>
          "Environmental Noise Guidelines for the European Region"<br>
          Recommends limiting exposure to 70 dB over 24 hours</li>

          <li><strong>CDC/NIOSH</strong><br>
          "Noise and Hearing Loss Prevention"<br>
          Educational resources on NIHL prevention</li>
        </ul>

        <h4>Key Research</h4>
        <ul>
          <li>Noise-Induced Hearing Loss (NIDCD)</li>
          <li>Occupational Safety and Health Act (OSHA 1910.95)</li>
          <li>American Speech-Language-Hearing Association (ASHA)</li>
        </ul>

        <p><strong>Note:</strong> This app implements NIOSH standards for maximum protection.</p>
      `
    };

    if (contents[id]) {
      content.innerHTML = contents[id];
    }
  }
}

const learnMore = new LearnMore();
