const fs = require('fs');

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function dsEnvelopeGuid(id) {
  return '4C2B9A17-3E5F-4D8A-9B21-77E3A1D0F5C6';
}

const DS_UPLOAD_BLANK_PAGES = 3;

// Implement dsBlankDocHTML
function dsBlankDocHTML(name, pages) {
  const n = Math.max(1, pages || DS_UPLOAD_BLANK_PAGES);
  const cleanName = (name || 'Practice Document')
    .replace(/\.(pdf|docx?|txt|png|jpe?g)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim() || 'Practice Agreement';

  const isNDA = /nda|non[\s_-]*disclosure|confidential/i.test(cleanName);
  const isContractor = /contractor|consulting|freelance|onboarding|services agreement|service agreement/i.test(cleanName);
  const isRealEstate = /purchase|property|disclosure|lease|rental|listing|mortgage|earnest/i.test(cleanName);

  const sheets = [];
  for (let i = 1; i <= n; i++) {
    const isFirst = i === 1;
    const isLast = i === n;

    let bodyContent = '';
    if (isNDA) {
      if (isFirst && isLast) {
        bodyContent = `
          <h2 class="sec">1. Parties &amp; Transaction Purpose</h2>
          <div class="row">
            <div class="f"><label>Disclosing Party</label><div class="v big">Lone Star Realty LLC</div></div>
            <div class="f"><label>Receiving Party</label><div class="v big">Recipient Signer</div></div>
          </div>
          <p class="clause">The parties wish to explore a confidential business collaboration and transaction. In connection therewith, each party may disclose to the other certain proprietary and confidential information (&ldquo;Permitted Purpose&rdquo;).</p>
          <h2 class="sec">2. Definition of Confidential Information</h2>
          <p class="clause">&ldquo;Confidential Information&rdquo; means all non-public information, technical data, trade secrets, customer lists, financial models, pricing schedules, transaction terms, and Non-Public Personal Information (NPI) disclosed by either party.</p>
          <h2 class="sec">3. Non-Disclosure Obligations &amp; Standard of Care</h2>
          <p class="clause">The Receiving Party covenants: (a) to hold all Confidential Information in strict confidence; (b) to protect it with the same standard of care used to protect its own confidential assets, but not less than reasonable care; and (c) not to use or disclose such information except solely for evaluating the prospective transaction.</p>
          <h2 class="sec">4. Term &amp; Survival</h2>
          <p class="clause">The confidentiality obligations under this Agreement shall survive and remain binding for a period of two (2) years from the Effective Date. This Agreement is governed by the laws of the State of Texas, Travis County venue.</p>
          <h2 class="sec">5. Execution &amp; Authorized Signatures</h2>
          <div class="sigrow">
            <div class="sig">
              <div class="line"></div>
              <label>Authorized Signature &mdash; Recipient</label>
            </div>
            <div class="sig">
              <div class="line"></div>
              <label>Date Signed</label>
            </div>
          </div>
          <div class="sigrow" style="margin-top:12px;">
            <div class="sig">
              <div class="line">/s/ Lone Star Legal Operations</div>
              <label>Disclosing Party &mdash; Lone Star Realty LLC</label>
            </div>
            <div class="sig">
              <div class="line">2026-09-10</div>
              <label>Date Signed</label>
            </div>
          </div>`;
      } else if (isFirst) {
        bodyContent = `
          <h2 class="sec">1. Parties &amp; Purpose</h2>
          <div class="row">
            <div class="f"><label>Disclosing Party</label><div class="v big">Lone Star Realty LLC</div></div>
            <div class="f"><label>Receiving Party</label><div class="v big">Recipient Signer</div></div>
          </div>
          <p class="clause">The parties wish to evaluate a potential business relationship or transaction (&ldquo;Permitted Purpose&rdquo;). In connection therewith, Disclosing Party may share proprietary and confidential business assets with Receiving Party.</p>
          <h2 class="sec">2. Definition of Confidential Information</h2>
          <p class="clause">&ldquo;Confidential Information&rdquo; means all non-public operational data, customer lists, marketing materials, financial data, and Non-Public Personal Information (NPI) disclosed directly or indirectly by Disclosing Party.</p>
          <h2 class="sec">3. Non-Disclosure &amp; Non-Use Covenants</h2>
          <p class="clause">Receiving Party shall: (a) maintain all Confidential Information in strict confidence; (b) not disclose it to any third party without prior written consent; and (c) use it solely for the Permitted Purpose.</p>
          <div class="initials">
            <div class="ibox"><div class="slot"></div><label>Disclosing Party Initials</label></div>
            <div class="ibox"><div class="slot"></div><label>Receiving Party Initials</label></div>
          </div>`;
      } else if (isLast) {
        bodyContent = `
          <h2 class="sec">4. Exclusions &amp; Compelled Disclosure</h2>
          <p class="clause">Confidential Information excludes information that is publicly known, previously known without breach, or independently developed without reliance on Disclosing Party assets.</p>
          <h2 class="sec">5. Term, Governing Law &amp; Injunction</h2>
          <p class="clause">This Agreement shall remain in force for two (2) years from the Effective Date. Governed by the laws of the State of Texas with venue in Travis County. Breach may cause irreparable harm entitling Disclosing Party to seek injunctive relief.</p>
          <h2 class="sec">6. Execution &amp; Signatures</h2>
          <div class="sigrow">
            <div class="sig">
              <div class="line"></div>
              <label>Authorized Signature &mdash; Recipient</label>
            </div>
            <div class="sig">
              <div class="line"></div>
              <label>Date Signed</label>
            </div>
          </div>
          <div class="sigrow" style="margin-top:12px;">
            <div class="sig">
              <div class="line">/s/ Lone Star Legal Operations</div>
              <label>Authorized Representative &mdash; Disclosing Party</label>
            </div>
            <div class="sig">
              <div class="line">2026-09-10</div>
              <label>Date Signed</label>
            </div>
          </div>`;
      } else {
        bodyContent = `
          <h2 class="sec">3. Standard of Care &amp; Security Controls</h2>
          <p class="clause">Receiving Party shall protect Disclosing Party&rsquo;s Confidential Information with the same degree of care it accords its own sensitive materials, but in no event less than reasonable care. Access is restricted strictly to authorized personnel.</p>
          <h2 class="sec">4. Return or Destruction of Materials</h2>
          <p class="clause">Upon written demand, Receiving Party shall immediately return or destroy all physical, electronic, and derivative copies of Confidential Information and furnish written certification of destruction.</p>
          <div class="initials">
            <div class="ibox"><div class="slot"></div><label>Disclosing Party Initials</label></div>
            <div class="ibox"><div class="slot"></div><label>Receiving Party Initials</label></div>
          </div>`;
      }
    } else if (isContractor) {
      if (isFirst && isLast) {
        bodyContent = `
          <h2 class="sec">1. Parties &amp; Engagement Scope</h2>
          <div class="row">
            <div class="f"><label>Client / Brokerage</label><div class="v big">Lone Star Realty LLC</div></div>
            <div class="f"><label>Contractor</label><div class="v big">Independent Contractor</div></div>
          </div>
          <p class="clause">Client hereby engages Contractor, and Contractor agrees to perform virtual transaction coordination, document compliance review, and transaction management services as directed by Client.</p>
          <h2 class="sec">2. Compensation &amp; Term</h2>
          <div class="row">
            <div class="f"><label>Hourly Rate</label><div class="v big">$32.00 / hr</div></div>
            <div class="f"><label>Payment Cycle</label><div class="v">Semi-monthly (1st &amp; 16th)</div></div>
            <div class="f"><label>Notice Period</label><div class="v">14 days written notice</div></div>
          </div>
          <p class="clause">Client shall remit payment within ten (10) days of verified invoice receipt. Contractor is solely responsible for all federal, state, and local self-employment taxes (Form 1099-NEC).</p>
          <h2 class="sec">3. Confidentiality &amp; Non-Public Information (NPI)</h2>
          <p class="clause">Contractor will receive access to client records containing Non-Public Personal Information (NPI). Contractor covenants to safeguard all records, access systems only through issued credentials, and maintain strict confidentiality.</p>
          <h2 class="sec">4. Independent Contractor Status &amp; Execution</h2>
          <p class="clause">Nothing in this Agreement creates an employment, agency, or partnership relationship. Contractor supplies own equipment and determines means of performance.</p>
          <div class="sigrow">
            <div class="sig">
              <div class="line"></div>
              <label>Contractor Signature</label>
            </div>
            <div class="sig">
              <div class="line"></div>
              <label>Date Signed</label>
            </div>
          </div>
          <div class="sigrow" style="margin-top:12px;">
            <div class="sig">
              <div class="line">/s/ Alex Rivera</div>
              <label>Client Representative &mdash; Lone Star Realty</label>
            </div>
            <div class="sig">
              <div class="line">2026-09-10</div>
              <label>Date Signed</label>
            </div>
          </div>`;
      } else if (isFirst) {
        bodyContent = `
          <h2 class="sec">1. Parties &amp; Engagement Scope</h2>
          <div class="row">
            <div class="f"><label>Client / Brokerage</label><div class="v big">Lone Star Realty LLC</div></div>
            <div class="f"><label>Contractor</label><div class="v big">Independent Contractor</div></div>
          </div>
          <p class="clause">Client engages Contractor to provide specialized transaction coordination, document compliance review, and administrative support services.</p>
          <h2 class="sec">2. Term &amp; Compensation</h2>
          <div class="row">
            <div class="f"><label>Hourly Rate</label><div class="v big">$32.00 / hr</div></div>
            <div class="f"><label>Estimated Hours</label><div class="v">20 &ndash; 30 hrs / week</div></div>
            <div class="f"><label>Invoicing</label><div class="v">Semi-monthly</div></div>
          </div>
          <p class="clause">Client shall remit compensation within ten (10) days of verified invoice delivery. Contractor is responsible for all self-employment tax liabilities.</p>
          <div class="initials">
            <div class="ibox"><div class="slot"></div><label>Client Initials</label></div>
            <div class="ibox"><div class="slot"></div><label>Contractor Initials</label></div>
          </div>`;
      } else if (isLast) {
        bodyContent = `
          <h2 class="sec">6. Independent Contractor Status</h2>
          <p class="clause">Contractor operates strictly as an independent contractor. Neither party has authority to bind the other in any contract or representation beyond the express terms herein.</p>
          <h2 class="sec">7. Governing Law &amp; Entire Agreement</h2>
          <p class="clause">This Agreement constitutes the entire agreement between the parties and is governed by the laws of the State of Texas, Travis County venue.</p>
          <h2 class="sec">8. Execution &amp; Signatures</h2>
          <div class="sigrow">
            <div class="sig">
              <div class="line"></div>
              <label>Contractor Signature</label>
            </div>
            <div class="sig">
              <div class="line"></div>
              <label>Date Signed</label>
            </div>
          </div>
          <div class="sigrow" style="margin-top:12px;">
            <div class="sig">
              <div class="line">/s/ Alex Rivera</div>
              <label>Client Representative &mdash; Lone Star Realty</label>
            </div>
            <div class="sig">
              <div class="line">2026-09-10</div>
              <label>Date Signed</label>
            </div>
          </div>`;
      } else {
        bodyContent = `
          <h2 class="sec">3. Scope of Services &amp; Standards</h2>
          <p class="clause">Contractor shall prepare and transmit DocuSign envelopes, track signing progress, send timely reminders, and maintain file compliance in accordance with industry best practices.</p>
          <h2 class="sec">4. Confidentiality &amp; NPI Safeguards</h2>
          <p class="clause">Contractor agrees to hold all client records, financial figures, and non-public personal information in strict confidence and prevent any unauthorized third-party disclosure.</p>
          <div class="initials">
            <div class="ibox"><div class="slot"></div><label>Client Initials</label></div>
            <div class="ibox"><div class="slot"></div><label>Contractor Initials</label></div>
          </div>`;
      }
    } else if (isRealEstate) {
      if (isFirst && isLast) {
        bodyContent = `
          <h2 class="sec">1. Parties &amp; Property Identification</h2>
          <div class="row">
            <div class="f"><label>Buyer</label><div class="v big">Buyer Signer</div></div>
            <div class="f"><label>Seller</label><div class="v big">Seller Signer</div></div>
          </div>
          <p class="clause">Buyer agrees to purchase and Seller agrees to convey the real property referenced in this transaction, together with all improvements, fixtures, and appurtenances.</p>
          <h2 class="sec">2. Financial Consideration &amp; Escrow Deposit</h2>
          <p class="clause">Earnest money deposit shall be deposited with the designated Title and Escrow Agent within three (3) business days of mutual execution. Closing shall occur on or before the specified closing date.</p>
          <h2 class="sec">3. Title, Survey &amp; Property Condition</h2>
          <p class="clause">Seller shall furnish to Buyer an owner policy of title insurance. Buyer reserves standard inspection and feasibility review rights as specified in contractual addenda.</p>
          <h2 class="sec">4. Execution &amp; Signatures</h2>
          <div class="sigrow">
            <div class="sig">
              <div class="line"></div>
              <label>Buyer Signature</label>
            </div>
            <div class="sig">
              <div class="line"></div>
              <label>Date Signed</label>
            </div>
          </div>
          <div class="sigrow" style="margin-top:12px;">
            <div class="sig">
              <div class="line"></div>
              <label>Seller Signature</label>
            </div>
            <div class="sig">
              <div class="line"></div>
              <label>Date Signed</label>
            </div>
          </div>`;
      } else if (isFirst) {
        bodyContent = `
          <h2 class="sec">1. Parties &amp; Property Identification</h2>
          <div class="row">
            <div class="f"><label>Buyer</label><div class="v big">Buyer Signer</div></div>
            <div class="f"><label>Seller</label><div class="v big">Seller Signer</div></div>
          </div>
          <p class="clause">Buyer agrees to purchase and Seller agrees to convey the real property described herein, together with all rights, privileges, and appurtenances belonging thereto.</p>
          <h2 class="sec">2. Purchase Price &amp; Earnest Money</h2>
          <p class="clause">The agreed purchase consideration shall be paid at closing through escrow. Earnest money deposit shall be tendered to the Title Company within three (3) business days.</p>
          <div class="initials">
            <div class="ibox"><div class="slot"></div><label>Buyer Initials</label></div>
            <div class="ibox"><div class="slot"></div><label>Seller Initials</label></div>
          </div>`;
      } else if (isLast) {
        bodyContent = `
          <h2 class="sec">5. Prorations, Closing &amp; Possession</h2>
          <p class="clause">Taxes, HOA assessments, and rents shall be prorated as of the Closing Date. Possession shall be delivered to Buyer upon closing and funding.</p>
          <h2 class="sec">6. Execution &amp; Signatures</h2>
          <div class="sigrow">
            <div class="sig">
              <div class="line"></div>
              <label>Buyer Signature</label>
            </div>
            <div class="sig">
              <div class="line"></div>
              <label>Date Signed</label>
            </div>
          </div>
          <div class="sigrow" style="margin-top:12px;">
            <div class="sig">
              <div class="line"></div>
              <label>Seller Signature</label>
            </div>
            <div class="sig">
              <div class="line"></div>
              <label>Date Signed</label>
            </div>
          </div>`;
      } else {
        bodyContent = `
          <h2 class="sec">3. Inspection, Title &amp; Survey</h2>
          <p class="clause">Buyer shall have the agreed inspection period to conduct non-destructive inspections. Seller shall cure title objections within the statutory cure period.</p>
          <h2 class="sec">4. Representations &amp; Disclosures</h2>
          <p class="clause">Seller covenants that all statutory property disclosures, environmental notices, and HOA documentation have been accurately provided to Buyer.</p>
          <div class="initials">
            <div class="ibox"><div class="slot"></div><label>Buyer Initials</label></div>
            <div class="ibox"><div class="slot"></div><label>Seller Initials</label></div>
          </div>`;
      }
    } else {
      if (isFirst && isLast) {
        bodyContent = `
          <h2 class="sec">1. Parties &amp; Purpose</h2>
          <div class="row">
            <div class="f"><label>Primary Party</label><div class="v big">Designated Signer</div></div>
            <div class="f"><label>Company / Organization</label><div class="v big">Lone Star Realty Operations</div></div>
          </div>
          <p class="clause">This Agreement sets forth the mutual terms, covenants, and understandings regarding <b>${esc(cleanName)}</b>.</p>
          <h2 class="sec">2. Terms, Conditions &amp; Covenants</h2>
          <p class="clause">Each party covenants to perform its contractual obligations in good faith, in accordance with applicable professional standards and legal requirements.</p>
          <h2 class="sec">3. Confidentiality &amp; Governing Law</h2>
          <p class="clause">All non-public transaction data shall remain confidential. This Agreement is governed by the laws of the State of Texas with venue in Travis County.</p>
          <h2 class="sec">4. Execution &amp; Signatures</h2>
          <div class="sigrow">
            <div class="sig">
              <div class="line"></div>
              <label>Authorized Signature</label>
            </div>
            <div class="sig">
              <div class="line"></div>
              <label>Date Signed</label>
            </div>
          </div>
          <div class="sigrow" style="margin-top:12px;">
            <div class="sig">
              <div class="line">/s/ Operations Director</div>
              <label>Company Representative</label>
            </div>
            <div class="sig">
              <div class="line">2026-09-10</div>
              <label>Date Signed</label>
            </div>
          </div>`;
      } else if (isFirst) {
        bodyContent = `
          <h2 class="sec">1. Parties &amp; Subject Matter</h2>
          <p class="clause">This document establishes the binding terms and conditions between the parties regarding <b>${esc(cleanName)}</b>.</p>
          <h2 class="sec">2. Primary Obligations</h2>
          <p class="clause">Both parties covenant to perform their respective responsibilities in strict accordance with the terms, exhibits, and schedules specified herein.</p>
          <div class="initials">
            <div class="ibox"><div class="slot"></div><label>Initial</label></div>
            <div class="ibox"><div class="slot"></div><label>Initial</label></div>
          </div>`;
      } else if (isLast) {
        bodyContent = `
          <h2 class="sec">General Provisions &amp; Governing Law</h2>
          <p class="clause">This Agreement is governed by the laws of the State of Texas. Electronic signatures transmitted via DocuSign shall be deemed original and legally binding.</p>
          <h2 class="sec">Execution &amp; Signatures</h2>
          <div class="sigrow">
            <div class="sig">
              <div class="line"></div>
              <label>Authorized Signature</label>
            </div>
            <div class="sig">
              <div class="line"></div>
              <label>Date Signed</label>
            </div>
          </div>`;
      } else {
        bodyContent = `
          <h2 class="sec">Additional Terms &amp; Provisions</h2>
          <p class="clause">The parties further covenant to adhere to all operating conditions, warranties, and compliance requirements set forth in <b>${esc(cleanName)}</b>.</p>
          <div class="initials">
            <div class="ibox"><div class="slot"></div><label>Initial</label></div>
            <div class="ibox"><div class="slot"></div><label>Initial</label></div>
          </div>`;
      }
    }

    const sheetHTML = `
      <div class="paper" data-page="${i}">
        <div class="ds-envstamp" aria-hidden="true"><span>Docusign Envelope ID: ${dsEnvelopeGuid('ENV-TMPL-' + i)}</span></div>
        ${isFirst ? `
          <div class="letterhead">
            <div>
              <h1>${esc(cleanName)}</h1>
              <div class="sub">Standard Training Template &middot; DocuSign eSignature Package</div>
            </div>
            <div class="ref"><b>Ref: #${esc(cleanName.substring(0, 3).toUpperCase())}-2026-09</b>Date: September 10, 2026</div>
          </div>` : `
          <div class="contd">${esc(cleanName)} &middot; continued</div>`}
        ${bodyContent}
        <div class="foot">Generated for SkillCloud Academy DocuSign Training &middot; Practice Document</div>
        <div class="pagenum">Page ${i} of ${n}</div>
      </div>`;
    sheets.push(sheetHTML);
  }

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + esc(cleanName) + '</title>' +
    '<link rel="stylesheet" href="documents/doc.css">' +
    '<style>' +
      'body{padding:24px 20px;background:#f3f4f6;}' +
      '.paper{position:relative;margin-bottom:26px;box-shadow:0 8px 24px rgba(0,0,0,0.12);}' +
      '.sigrow{display:flex;gap:30px;margin-top:20px;}' +
      '.sig{flex:1;}' +
      '.sig .line{border-bottom:1px solid #24262b;height:32px;font-style:italic;font-family:\'Brush Script MT\',cursive,serif;font-size:18px;color:#1e3a8a;padding-top:4px;}' +
      '.sig label{display:block;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#6e727c;margin-top:6px;}' +
    '</style></head><body>' +
    sheets.join('') +
    '</body></html>';
}

// Test 1: Contractor
const h1 = dsBlankDocHTML('Independent Contractor Agreement.pdf', 1);
console.log('Contractor doc generated, length:', h1.length, 'has data-page="1":', h1.includes('data-page="1"'), 'has sigrow:', h1.includes('sigrow'));

// Test 2: NDA
const h2 = dsBlankDocHTML('Mutual Non-Disclosure Agreement (NDA).pdf', 2);
console.log('NDA doc generated, length:', h2.length, 'has data-page="2":', h2.includes('data-page="2"'), 'has sigrow:', h2.includes('sigrow'));
