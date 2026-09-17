/* ══════════════════════════════════════════════════════════
   REIN MLS (Virginia): Agent, Location, Property, Marketing, Financial
   Mirrors pages 1, 2, 4 and 5 of the REIN "Residential Property Data
   Input & Features" form (07/01/2025). Field names, option lists,
   required marks (*), auto filled fields (!) and character limits are
   the ones printed on that form. Features and Rooms / Units live in
   rein-va-features.js. Uses vaf() from the role page.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* one field: id, label, required, type, options, hint, max characters, auto filled */
  function fld(id, label, req, type, opts, hint, max, auto) {
    var h = vaf(id, label, '', req, type || 'text', opts || null, hint || (auto ? 'Fills in automatically in REIN' : (max ? max + ' characters' : '')));
    if (max) h = h.replace('id="vf-' + id + '" class="lc-rein-input"', 'id="vf-' + id + '" class="lc-rein-input" maxlength="' + max + '"');
    if (auto) h = h.replace('id="vf-' + id + '" class="lc-rein-input"', 'id="vf-' + id + '" class="lc-rein-input" readonly tabindex="-1" style="background:#eef2f6"');
    return h;
  }
  function ms(id, label, req, opts, maxPick) {
    return vaf(id, label, '', req, 'multiselect', opts, maxPick ? 'Up to ' + maxPick : 'Check one').replace('class="rein-ms"', 'class="rein-ms" data-max="' + (maxPick || 1) + '"');
  }
  function yn(id, label, req) {
    return fld(id, label, req, 'select', ['', 'Y', 'N']);
  }
  function box(title, inner) {
    return '<fieldset><legend>' + title + '</legend><div class="lc-form-grid">' + inner + '</div></fieldset>';
  }
  function wide(inner) { return '<div class="lc-field full">' + inner + '</div>'; }

  window.reinGuide = function () {
    return '<div class="lc-callout-info" style="margin-bottom:16px;font-size:13.5px;line-height:1.6">' +
      '<strong>How to fill this in:</strong> copy each field exactly as it appears on the Residential Property Data Input. ' +
      'If the document writes <b>N/A</b>, enter N/A. If the document leaves a field blank, leave it blank. ' +
      'Fields marked <b>*</b> are required on the form, and fields the form marks with <b>!</b> fill in automatically in REIN.' +
      '</div>';
  };

  /* ── Page 1: Agent ── */
  window.reinAgent = function () {
    return box('Listing',
        fld('mls-num', 'MLS #', false, 'text', null, 'Assigned by REIN after the listing is entered', 0, true) +
        fld('input-date', 'Input Date', false, 'date')) +
      box('Agent',
        fld('agent-id', 'List Agent REIN ID #', true, 'text', null, '', 6) +
        fld('agent-officeid', 'List Office I.D.', false, 'text', null, '', 0, true) +
        fld('agent-other', 'List Agent Other Ph. # & Description', false, 'text', null, '', 20) +
        fld('agent-fax', 'Fax # Office or Agent Number', false, 'text', null, '', 12) +
        fld('agent2-id', '2nd List Agent REIN ID #', false, 'text', null, '', 6) +
        fld('agent2-name', '2nd List Agent Name', false, 'text', null, '', 0, true) +
        fld('agent2-phone', '2nd List Agent Phone #', false, 'text', null, '', 0, true) +
        wide(fld('display-email', 'Listing Display Email Address', false, 'text', null, 'Leave blank to use the REIN primary email', 80))) +
      box('Showing &amp; Access',
        ms('lockbox', 'Lock Box Type', true, ['CBAR Lockbox', 'HUD Key', 'None', 'Other Approved Lockbox', 'REIN Lockbox', 'VA Key', 'VPAR Lockbox', 'Williamsburg']) +
        yn('vacant', 'Vacant', false) +
        wide(fld('showing', 'Showing Instructions', true, 'text', null, '', 100))) +
      '<fieldset><legend>Agent Remarks</legend>' +
        vaf('agent-remarks', 'Agent Remarks', '', false, 'textarea', null, 'Up to 500 characters').replace('<textarea id="vf-agent-remarks"', '<textarea maxlength="500" id="vf-agent-remarks"') +
      '</fieldset>';
  };

  /* ── Page 1: Location ── */
  window.reinLocation = function () {
    return box('Location',
        fld('street-num', 'Street Number', true, 'text', null, '', 6) +
        fld('dir-prefix', 'Dir Prefix', false, 'text', null, '', 2) +
        fld('street-name', 'Street Name', true, 'text', null, '', 21) +
        fld('street-type', 'Street Type', true, 'select', ['', 'Alley', 'Avenue', 'Boulevard', 'Circle', 'Court', 'Crescent', 'Drive', 'Highway', 'Lane', 'Landing', 'Parkway', 'Place', 'Road', 'Square', 'Street', 'Terrace', 'Trail', 'Way']) +
        fld('dir-suffix', 'Dir Suffix', false, 'text', null, '', 2) +
        fld('unit-num', 'Unit Number', false, 'text', null, '', 4) +
        fld('state', 'State', true, 'text', null, '', 2) +
        fld('area', 'Area', true, 'text', null, '', 3) +
        fld('city-county', 'County/City', true, 'select', ['', 'Chesapeake VA', 'Norfolk VA', 'Portsmouth VA', 'Suffolk VA', 'Virginia Beach VA', 'Hampton VA', 'Newport News VA', 'Isle of Wight VA', 'Currituck NC']) +
        fld('city', 'City', true, 'select', ['', 'Chesapeake', 'Norfolk', 'Portsmouth', 'Suffolk', 'Virginia Beach', 'Hampton', 'Newport News']) +
        fld('zip', 'Zip Code', true, 'text', null, '', 5) +
        fld('zip4', 'Zip Code +4', false, 'text', null, '', 4) +
        fld('pin', 'Property Identification Number', true, 'text', null, '', 20) +
        fld('subdivision', 'Subdivision Name', true, 'text', null, 'From the REIN subdivision list (reinmls.com)', 20) +
        fld('division', 'Division', false, 'text', null, '', 0, true) +
        fld('neighborhood', 'Neighborhood Name', false, 'text', null, '', 20) +
        wide(fld('legal-desc', 'Legal Description', true, 'text', null, '', 40)) +
        fld('high-school', 'Senior High School', true, 'text') +
        fld('middle-school', 'Middle School', true, 'text') +
        fld('elem-school', 'Elementary School', true, 'text') +
        fld('other-schools', 'Other Public Schools', false, 'text', null, '', 18) +
        ms('crash', 'Crash', true, ['APZ 1', 'APZ 2', 'Clear', 'None']) +
        ms('noise', 'Noise', true, ['-65', '65-70', '70-75', '75+', 'N/A']));
  };

  /* ── Page 2: Property Information ── */
  window.reinProperty = function () {
    return box('Listing Details',
        ms('prop-subtype', 'Property Sub Type', true, ['Attached', 'Detached']) +
        fld('list-price', 'List Price', true, 'number', null, '', 10) +
        fld('list-date', 'List Date', true, 'date') +
        fld('expiry-date', 'Expire Date', true, 'date') +
        ms('list-type', 'List Type', true, ['Auction', 'Bank', 'Building Package', 'Building Soon', 'FSBO Sale', 'HUD Sale', 'Independent Contractor EA', 'Independent Contractor ER', 'Limited Service EA', 'Limited Service ER', 'Standard Agency EA', 'Standard Agency ER', 'VA Sale']) +
        ms('ownership', 'Ownership', true, ['Business Only', 'Co-Op', 'Condo', 'Leasehold', 'Simple', 'Timeshare']) +
        fld('zoning', 'Zoning', false, 'text', null, '', 8) +
        fld('sqft', 'Appx. Sq. Ft. of Liv. Area', true, 'number')) +
      box('Property Details',
        fld('bedrooms', '#Bedrooms', true, 'number') +
        fld('full-baths', '#Full Baths', true, 'number') +
        fld('half-baths', '#Half Baths', true, 'number') +
        fld('stories', '#Stories', true, 'text', null, '', 3) +
        fld('fireplaces', '#Fireplaces', true, 'number') +
        fld('garage-sqft', 'Garage Sqft', false, 'number') +
        fld('year-built', 'Appx. Year Built', true, 'number') +
        yn('new-const', 'New Const.', true) +
        yn('master-model', 'Master Model', true) +
        fld('model-name', 'Model Name', false, 'text') +
        yn('first-flr-bed', 'First Floor Bedroom and First Floor Full Bath', true) +
        fld('beds-ensuites', '#Bedrooms w/en suite', false, 'number')) +
      box('Owner',
        fld('owner-name', "Owner's Name", true, 'text', null, '', 35) +
        fld('owner-name2', "Owner's Name 2", false, 'text', null, '', 35) +
        fld('owner-phone', "Owner's Phone", false, 'text', null, '', 12)) +
      box('Lot',
        fld('lot-frontage', 'Appx. Lot Frontage', false, 'text', null, '', 4) +
        fld('lot-depth', 'Appx. Lot Depth', false, 'text', null, '', 4) +
        fld('acres', 'Appx. # Acres', false, 'text', null, '', 7) +
        fld('lot-dims', 'Appx. Lot Dimensions', false, 'text', null, '', 20)) +
      box('Associations',
        wide(fld('cic-name', 'CIC/Condo Assoc. Legal Name', true, 'text')) +
        wide(fld('cic-mgmt', 'CIC/Condo Assoc. Mgmt. Co. and Contact Information', true, 'text')) +
        wide(fld('hoa-name', 'CIC/HOA/POA Name', true, 'text')) +
        wide(fld('hoa-mgmt', 'CIC/HOA/POA Assoc. Mgmt. Co. and Contact Information', true, 'text'))) +
      box('Utilities',
        ms('sewer', 'Type Sewer', true, ['Call', 'City/County', 'None', 'Other', 'Septic', 'Septic on Waiver']) +
        ms('water', 'Type Water', true, ['Call', 'City/County', 'None', 'Other', 'Private', 'Well']) +
        ms('water-heater', 'Water Heater', true, ['Electric', 'Gas', 'None', 'Oil', 'Other', 'Solar']) +
        fld('condo-level', 'Condo Level', false, 'text', null, '', 2)) +
      box('Disclosures',
        vaf('disclosures', 'Disclosures', '', true, 'multiselect', ['55+ Community (ACTIV)', 'Additional Attachment(s) (ADD)', 'Assisted Living (ASLIV)', 'Bank Repossessed (REO)', 'Board Approval (BDAP)', 'Call LA for other Disclosure / Restrictions (CALL)', 'Common Interest Community (CIC)', 'Contract Owner (CON)', 'Court Approval (COURT)', 'Deed Restrictions/Covenants (DEDRS)', 'Defective Drywall (DRY)', 'DPOR Disclosure Statement (DPOR)', 'Environmental Restrictions (ENVRS)', 'ESIGN-NO (NOESN)', 'Estate (EST)', 'Excluded Party Call LA (EXCL)', 'Exempt Disclosure/Disclaimer (EXMPT)', 'FIRPTA (FIRPTA)', 'Government Owned (GOVT)', 'Historical District (HIST)', 'Lis Pendens (LISPEN)', 'Meth Lab Discl Req (METH)', 'None (NONE)', 'Occupancy Permit (OP)', 'Owner Agent (O/A)', 'Pending Building or Zoning Violations (ZONE)', 'Pet on Premises (PET)', 'Related to Seller (REL)', 'Relocation (RELO)', 'Resale Certif Req (RSLC)', '62+ Community (SEN)', 'Short/Comp Sale (COMP)', 'Special Tax Rate (TAX)', 'Special Warranty Deed (SPDED)'], 'As applicable'));
  };

  /* ── Page 4: Marketing ── */
  window.reinMarketing = function () {
    return '<fieldset><legend>Marketing</legend>' +
        '<div class="lc-field"><label>Public Remarks</label>' +
        '<textarea class="lc-rein-textarea" id="vf-public-remarks" maxlength="1000" style="min-height:140px" oninput="vaCountChars(\'public-remarks\',1000)"></textarea>' +
        '<div class="rein-charcount" id="vf-public-remarks-cnt">Characters remaining: 1000</div></div>' +
        '<div class="lc-form-grid" style="margin-top:12px">' +
          wide(fld('directions', 'Directions', false, 'text', null, '', 60)) +
          ms('photo-code', 'Photo Code', true, ['Exterior Plus Extra Photos (Photographer Fees Apply)', 'Take Exterior Photo Only (REIN Fee Applies)', 'Land, Commercial Listing - No Photo Required', 'Listing Agent/Office Uploads Own Photo(s)']) +
          ms('web-exclude', 'Web Exclude', false, ['Exclude Address', 'Exclude AVM', 'Exclude Blogging', 'Exclude Listing'], 3) +
          wide(fld('tour-branded', 'Virtual Tour Branded', false, 'text')) +
          wide(fld('tour-nonbranded', 'Virtual Tour Non Branded', false, 'text')) +
          wide(fld('tour-3d', 'Virtual Tour 3D Non Branded', false, 'text')) +
          wide(fld('drone-video', 'Aerial Drone Video Non Branded', false, 'text')) +
        '</div></fieldset>';
  };

  /* ── Page 5: Financial and Auction ── */
  window.reinFinancial = function () {
    return box('Financial',
        ms('seller-finance', 'Seller Finance Options', true, ['Assumption', 'Buy Option', 'Lease/Purchase', 'Non-Qualifying', 'None', 'Owner Financing', 'Owner Second', 'Trade', 'VHDA'], 4) +
        vaf('agency-approved', 'Agency Approved (required for condo)', '', false, 'multiselect', ['All', 'Fannie Mae', 'FHA', 'Freddie Mac', 'None', 'Other', 'VA'], 'As applicable') +
        yn('seller-conc', 'Seller Concessions', false) +
        fld('seller-concessions', 'Amount Seller Concessions ($)', false, 'number', null, 'Expressed in dollars') +
        wide(fld('seller-conc-desc', 'Seller Concessions Description', true, 'text', null, 'Required when Seller Concessions is Y')) +
        fld('mortgage-bal', 'Appx. Mortgage Balance', false, 'text', null, '', 8) +
        fld('mortgage-pmt', 'Appx. Mortgage Pmt.', false, 'text', null, '', 5) +
        fld('payment-incl', 'Payment Incl. (T=Tax, I=Ins)', false, 'text', null, '', 2) +
        fld('interest-rate', 'Interest Rate', false, 'text', null, '', 6) +
        fld('loan-type', 'Loan Type', false, 'text', null, '', 6) +
        fld('years-remaining', 'Years Remaining', false, 'text', null, '', 2) +
        fld('min-cash', 'Minimum Cash on Assumpt.', false, 'text', null, '', 8) +
        fld('appx-taxes', 'Appx. Taxes', true, 'text', null, '', 5) +
        yn('has-hoa', 'CIC/HOA/POA', true) +
        fld('mo-hoapoa-fees', 'Mo. CIC/HOA/POA Fees', true, 'text', null, '', 4) +
        fld('mo-cic-fees', 'Mo. CIC/Condo Fees', true, 'text', null, '', 4) +
        yn('release-liab', 'Release of Liab.', false) +
        yn('sub-of-elig', 'Sub. of Elig.', false) +
        fld('possession', 'Possession', true, 'text', null, '', 30)) +
      '<fieldset><legend>Auction</legend><p style="font-size:13px;color:var(--v-muted);margin:0 0 10px">All fields required for Auction type listings.</p><div class="lc-form-grid">' +
        fld('auction-site', 'Auction Website', false, 'text', null, '', 35) +
        fld('auction-date', 'Auction Date', false, 'date') +
        ms('auction-bid', 'Auction Bid Type', false, ['Live', 'Online']) +
        yn('auction-early', 'Auction Early Offers', false) +
        ms('auction-type', 'Auction Type', false, ['Absolute Bid', 'Disclosure Reserve Bid', 'Reserve Bid', 'Seller Confirmation']) +
        ms('auction-value', 'Auction List Price Value', false, ['Assessed Value', 'Minimum Opening Bid', 'Other', 'Value Range']) +
        fld('auction-premium', 'Auction Buyer Premium', false, 'text', null, '', 10) +
        vaf('auction-req', 'Action Req. to Rep Bidder', '', false, 'multiselect', ['Attend-Onsite', 'Call Auctioneer', 'Complete Broker Reg Form', 'Deposit', 'Other-See Remarks', 'Register Online', 'Review bid package'], 'As applicable') +
        fld('auction-explain', 'Auction Explanation Type', false, 'text') +
      '</div></fieldset>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px">' +
        '<button type="button" class="lc-mls-btn primary" onclick="reinValidate()">Validate Listing</button>' +
      '</div><div id="va-result" style="margin-top:14px"></div>';
  };

  /* required fields, exactly the ones marked * on the form */
  var REQUIRED = [
    ['agent-id', 'List Agent REIN ID #'], ['lockbox', 'Lock Box Type'], ['showing', 'Showing Instructions'],
    ['street-num', 'Street Number'], ['street-name', 'Street Name'], ['street-type', 'Street Type'], ['state', 'State'],
    ['area', 'Area'], ['city-county', 'County/City'], ['city', 'City'], ['zip', 'Zip Code'], ['pin', 'Property Identification Number'],
    ['subdivision', 'Subdivision Name'], ['legal-desc', 'Legal Description'], ['high-school', 'Senior High School'],
    ['middle-school', 'Middle School'], ['elem-school', 'Elementary School'], ['crash', 'Crash'], ['noise', 'Noise'],
    ['prop-subtype', 'Property Sub Type'], ['list-price', 'List Price'], ['list-date', 'List Date'], ['expiry-date', 'Expire Date'],
    ['list-type', 'List Type'], ['ownership', 'Ownership'], ['sqft', 'Appx. Sq. Ft. of Liv. Area'],
    ['bedrooms', '#Bedrooms'], ['full-baths', '#Full Baths'], ['half-baths', '#Half Baths'], ['stories', '#Stories'],
    ['fireplaces', '#Fireplaces'], ['year-built', 'Appx. Year Built'], ['new-const', 'New Const.'], ['master-model', 'Master Model'],
    ['first-flr-bed', 'First Floor Bedroom and First Floor Full Bath'], ['owner-name', "Owner's Name"],
    ['cic-name', 'CIC/Condo Assoc. Legal Name'], ['cic-mgmt', 'CIC/Condo Assoc. Mgmt. Co.'], ['hoa-name', 'CIC/HOA/POA Name'],
    ['hoa-mgmt', 'CIC/HOA/POA Mgmt. Co.'], ['sewer', 'Type Sewer'], ['water', 'Type Water'], ['water-heater', 'Water Heater'],
    ['disclosures', 'Disclosures'],
    ['appliances', 'Appliances'], ['fence', 'Fence'], ['pool', 'Pool'], ['waterfront', 'Waterfront'], ['parking', 'Parking'],
    ['heating', 'Heating'], ['cooling', 'Cooling'], ['ext-siding', 'Exterior'], ['roof', 'Roof'], ['flooring', 'Flooring'],
    ['style', 'Style'], ['foundation', 'Foundation'], ['num-rooms', '#Rooms'],
    ['photo-code', 'Photo Code'],
    ['seller-finance', 'Seller Finance Options'], ['appx-taxes', 'Appx. Taxes'], ['has-hoa', 'CIC/HOA/POA'],
    ['mo-hoapoa-fees', 'Mo. CIC/HOA/POA Fees'], ['mo-cic-fees', 'Mo. CIC/Condo Fees'], ['possession', 'Possession']
  ];
  var AUCTION = [['auction-site', 'Auction Website'], ['auction-date', 'Auction Date'], ['auction-bid', 'Auction Bid Type'],
    ['auction-early', 'Auction Early Offers'], ['auction-type', 'Auction Type'], ['auction-value', 'Auction List Price Value'],
    ['auction-premium', 'Auction Buyer Premium'], ['auction-req', 'Action Req. to Rep Bidder'], ['auction-explain', 'Auction Explanation Type']];

  function filled(id) {
    var el = document.getElementById('vf-' + id);
    if (!el) return true;
    if (el.classList.contains('rein-ms')) return !!el.querySelector('input:checked');
    return String(el.value || '').trim() !== '';
  }
  function picked(id, value) {
    var el = document.getElementById('vf-' + id);
    if (!el) return false;
    if (el.classList.contains('rein-ms')) return !!el.querySelector('input[value="' + value + '"]:checked');
    return el.value === value;
  }

  window.reinValidate = function () {
    var need = REQUIRED.slice();
    if (picked('list-type', 'Auction')) need = need.concat(AUCTION);
    if (picked('seller-conc', 'Y')) need.push(['seller-conc-desc', 'Seller Concessions Description']);
    var missing = need.filter(function (r) { return !filled(r[0]); }).map(function (r) { return r[1]; });
    if (!picked('seller-conc', 'Y')) {
      /* description is only required with concessions, so drop it when blank */
      missing = missing.filter(function (m) { return m !== 'Seller Concessions Description'; });
    }
    var out = document.getElementById('va-result');
    if (!out) return;
    out.innerHTML = missing.length
      ? '<div class="lc-validate-result warn"><strong>' + missing.length + ' required field(s) still empty:</strong><br>' +
        missing.map(function (m) { return '<code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:4px;font-size:12px">' + m + '</code>'; }).join(' ') + '</div>'
      : '<div class="lc-validate-result ok"><strong>Every required field on the Data Input is filled in.</strong> Check each value against the document before you submit.</div>';
  };
})();
