import os
import subprocess

html_dir = r"c:\Users\Gerald_Work\Desktop\SCTraining\assets\docs\tc-ca-new\html"
pdf_dir = r"c:\Users\Gerald_Work\Desktop\SCTraining\assets\docs\tc-ca-new"
os.makedirs(html_dir, exist_ok=True)

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def wrap_doc(title, ref, content, page_break_footer=True):
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>
@page {{
  size: letter;
  margin: 15mm 15mm 15mm 15mm;
}}
body {{
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px 25px;
  color: #1a1a1a;
  font-size: 13.5px;
  line-height: 1.55;
}}
.header {{
  text-align: center;
  border-bottom: 2px solid #0a2647;
  padding-bottom: 12px;
  margin-bottom: 20px;
}}
.training-badge {{
  background: #0a2647;
  color: #fff;
  padding: 5px 14px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 1px;
  display: inline-block;
  margin-bottom: 6px;
}}
.disclaimer {{
  font-size: 10.5px;
  color: #666;
  font-style: italic;
  margin-bottom: 6px;
}}
h1 {{
  font-size: 19px;
  color: #0a2647;
  margin: 4px 0 2px;
  text-transform: uppercase;
  letter-spacing: .5px;
}}
.ref-line {{
  font-size: 11.5px;
  font-weight: 600;
  color: #444;
}}
h2 {{
  font-size: 14.5px;
  color: #0a2647;
  border-bottom: 1.5px solid #d0d7de;
  padding-bottom: 4px;
  margin-top: 18px;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: .3px;
}}
h3 {{
  font-size: 13.5px;
  color: #24292f;
  margin: 12px 0 6px;
}}
.field-row {{
  display: flex;
  border-bottom: 1px solid #eee;
  padding: 5px 0;
}}
.field-label {{
  width: 220px;
  font-weight: 600;
  color: #333;
  flex-shrink: 0;
}}
.field-value {{
  flex: 1;
  color: #111;
}}
.section {{
  margin-bottom: 18px;
}}
.box {{
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px 14px;
  margin: 10px 0;
}}
.table-data {{
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 12.5px;
}}
.table-data th, .table-data td {{
  border: 1px solid #cbd5e1;
  padding: 6px 8px;
  text-align: left;
}}
.table-data th {{
  background: #f1f5f9;
  font-weight: 700;
  color: #0a2647;
}}
.check-grid {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
  margin: 8px 0;
}}
.check-item {{
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
}}
.check-box {{
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 1.5px solid #333;
  border-radius: 2px;
  text-align: center;
  line-height: 12px;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
  margin-top: 2px;
}}
.check-box.checked::after {{
  content: "✓";
}}
.initials {{
  font-size: 10.5px;
  color: #64748b;
  margin-top: 15px;
  display: flex;
  justify-content: space-between;
}}
.sig-block {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 20px;
}}
.sig-line {{
  border-bottom: 1.5px solid #333;
  min-height: 28px;
  font-family: 'Brush Script MT', cursive, sans-serif;
  font-size: 18px;
  color: #0b3c5d;
  padding-left: 8px;
}}
.sig-lbl {{
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  margin-top: 4px;
}}
.page-break {{
  page-break-before: always;
  margin-top: 25px;
  padding-top: 15px;
  border-top: 1px dashed #cbd5e1;
}}
.page-footer {{
  margin-top: 24px;
  border-top: 1px solid #ddd;
  padding-top: 8px;
  font-size: 10.5px;
  color: #64748b;
  text-align: center;
}}
.highlight-warn {{
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
  padding: 8px 12px;
  margin: 8px 0;
  font-size: 12px;
}}
</style>
</head>
<body>
<div class="header">
  <div class="training-badge">TRAINING DOCUMENT · SKILLCLOUD ACADEMY</div>
  <div class="disclaimer">All names, data, and circumstances are fictional. For educational use only.</div>
  <h1>{title}</h1>
  <div class="ref-line">{ref}</div>
</div>

{content}

<div class="page-footer">
  4827 Rolando Blvd, San Diego, CA 92115 · Escrow #CTT-2025-07421<br>
  TRAINING DOCUMENT · SKILLCLOUD ACADEMY
</div>
</body>
</html>
"""

docs = {}

# 1. Listing Agreement (RLA)
docs["listing-agreement"] = (
    "Residential Listing Agreement (Exclusive Right to Sell)",
    "Reference: C.A.R. Form RLA (Training Summary)",
    """
<div class="section">
  <h2>1. Listing Terms & Property Identification</h2>
  <div class="field-row"><div class="field-label">Date Prepared:</div><div class="field-value">September 24, 2025</div></div>
  <div class="field-row"><div class="field-label">Property Address:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Assessor's Parcel No. (APN):</div><div class="field-value"><strong>470-362-18-00</strong></div></div>
  <div class="field-row"><div class="field-label">Seller(s) (Full Legal Names):</div><div class="field-value"><strong>Daniel Herrera and Carmen Herrera</strong></div></div>
  <div class="field-row"><div class="field-label">Vesting / Ownership:</div><div class="field-value"><strong>Joint Tenants</strong> (Husband and Wife)</div></div>
  <div class="field-row"><div class="field-label">Listing Brokerage:</div><div class="field-value"><strong>Berkshire Hathaway HomeServices California Properties</strong> (DRE #01317331)</div></div>
  <div class="field-row"><div class="field-label">Listing Agent:</div><div class="field-value"><strong>Sofia Reyes</strong> (DRE #02156789) · Phone: (619) 555-0312</div></div>
  <div class="field-row"><div class="field-label">Listing Type:</div><div class="field-value"><strong>Exclusive Right to Sell</strong></div></div>
</div>

<div class="section">
  <h2>2. Listing Price & Term</h2>
  <div class="field-row"><div class="field-label">Listing Price:</div><div class="field-value"><strong>$889,000</strong> (Eight Hundred Eighty-Nine Thousand Dollars)</div></div>
  <div class="field-row"><div class="field-label">Listing Commencement Date:</div><div class="field-value"><strong>September 24, 2025</strong></div></div>
  <div class="field-row"><div class="field-label">Listing Expiration Date:</div><div class="field-value"><strong>March 24, 2026</strong> (6 months standard term)</div></div>
  <div class="field-row"><div class="field-label">Target MLS Active Date:</div><div class="field-value">September 30, 2025</div></div>
</div>

<div class="section">
  <h2>3. Brokerage Compensation</h2>
  <div class="field-row"><div class="field-label">Total Brokerage Fee:</div><div class="field-value"><strong>5.0%</strong> of accepted gross purchase price</div></div>
  <div class="field-row"><div class="field-label">Cooperating Broker Fee:</div><div class="field-value">2.5% offered to Cooperating Brokerage</div></div>
  <div class="field-row"><div class="field-label">Listing Broker Fee:</div><div class="field-value">2.5% retained by Listing Brokerage</div></div>
</div>

<div class="page-break"></div>

<div class="section">
  <h2>4. Fixtures, Personal Property & Exclusions</h2>
  <p>All existing fixtures and fittings attached to the property are included in the sale as part of the real property unless specifically excluded below.</p>
  <div class="box">
    <div class="field-row"><div class="field-label">Personal Property INCLUDED:</div><div class="field-value"><strong>Existing kitchen refrigerator, washing machine, and clothes dryer</strong> (all conveyed without warranty as-is).</div></div>
    <div class="field-row" style="background:#fff3cd;padding:8px;border-radius:4px;"><div class="field-label">Personal Property / Fixtures EXCLUDED:</div><div class="field-value"><strong>Antique dining room chandelier (family heirloom).</strong> Seller shall remove prior to close of escrow and replace with a comparable brushed-nickel hanging light fixture. Agent to disclose in MLS private remarks.</div></div>
  </div>
</div>

<div class="section">
  <h2>5. Marketing, Lockbox & Key Authorization</h2>
  <div class="check-grid">
    <div class="check-item"><span class="check-box checked"></span> <span><strong>Lockbox Authorized:</strong> Electronic Supra / SentriLock keybox permitted on property.</span></div>
    <div class="check-item"><span class="check-box checked"></span> <span><strong>MLS Submission:</strong> Listing shall be entered in San Diego MLS (Sandicor/CRMLS) by Sep 30, 2025.</span></div>
    <div class="check-item"><span class="check-box checked"></span> <span><strong>Sign Placement:</strong> For Sale sign and rider authorized on front lawn.</span></div>
    <div class="check-item"><span class="check-box checked"></span> <span><strong>Internet Advertising:</strong> Syndication authorized across Realtor.com, Zillow, Redfin, BHHS.com.</span></div>
  </div>
</div>

<div class="section">
  <h2>6. Seller Authorization & Signatures</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Daniel Herrera</div>
      <div class="sig-lbl">Seller: Daniel Herrera · Date: 09/24/2025</div>
    </div>
    <div>
      <div class="sig-line">Carmen Herrera</div>
      <div class="sig-lbl">Seller: Carmen Herrera · Date: 09/24/2025</div>
    </div>
  </div>
  <div class="sig-block">
    <div>
      <div class="sig-line">Sofia Reyes</div>
      <div class="sig-lbl">Listing Agent: Sofia Reyes (DRE #02156789) · Date: 09/24/2025</div>
    </div>
    <div>
      <div class="sig-line">Berkshire Hathaway HomeServices CA</div>
      <div class="sig-lbl">Broker Designee · Date: 09/24/2025</div>
    </div>
  </div>
</div>
"""
)

# 2. TDS Disclosure (with intentional missing signature on Section III & vague foundation)
docs["tds-disclosure"] = (
    "Real Estate Transfer Disclosure Statement (TDS)",
    "Reference: C.A.R. Form TDS (California Civil Code §1102 et seq.)",
    """
<div class="highlight-warn">
  <strong>TRAINING NOTICE FOR TC:</strong> Review this completed document carefully. Verify completeness across all statutory sections, seller signature blocks, and substantive disclosure items.
</div>

<div class="section">
  <h2>I. Property & Seller Identification</h2>
  <div class="field-row"><div class="field-label">Subject Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115 (APN 470-362-18-00)</strong></div></div>
  <div class="field-row"><div class="field-label">Seller(s):</div><div class="field-value">Daniel Herrera & Carmen Herrera (Owners since 2005)</div></div>
  <div class="field-row"><div class="field-label">Year Built:</div><div class="field-value">1961 (Single family residential, 1 story ranch, 3 Bed / 2 Bath)</div></div>
</div>

<div class="section">
  <h2>II. Seller's Information & Property Items</h2>
  <p>The Seller states that the subject property has the items checked below (readily operable):</p>
  <div class="check-grid">
    <div class="check-item"><span class="check-box checked"></span> Range / Cooktop / Oven</div>
    <div class="check-item"><span class="check-box checked"></span> Dishwasher</div>
    <div class="check-item"><span class="check-box checked"></span> Garbage Disposal</div>
    <div class="check-item"><span class="check-box checked"></span> Smoke Detector(s) & Carbon Monoxide</div>
    <div class="check-item"><span class="check-box checked"></span> Central Heating (Forced Air, Gas)</div>
    <div class="check-item"><span class="check-box checked"></span> Central Air Conditioning</div>
    <div class="check-item"><span class="check-box checked"></span> Water Heater (Gas, strapped to code)</div>
    <div class="check-item"><span class="check-box checked"></span> 220V Wiring (Garage/Laundry)</div>
    <div class="check-item"><span class="check-box checked"></span> Attached/Detached 2-Car Garage</div>
    <div class="check-item"><span class="check-box checked"></span> Automatic Garage Door Opener</div>
    <div class="check-item"><span class="check-box"></span> Pool / Spa</div>
    <div class="check-item"><span class="check-box"></span> Solar Panels</div>
  </div>
  <div class="field-row"><div class="field-label">HVAC Condition:</div><div class="field-value">Original 1961 heating/AC unit. Operating normally; regularly maintained.</div></div>
  <div class="field-row"><div class="field-label">Plumbing Condition:</div><div class="field-value">Functional. Noted slow drain in hall/guest bathroom sink.</div></div>
  <div class="field-row"><div class="field-label">Roof Condition:</div><div class="field-value">Asphalt composition shingle installed 2015. No active leaks known.</div></div>
</div>

<div class="page-break"></div>

<div class="section">
  <h2>III. Structural, Environmental & Neighborhood Conditions</h2>
  <p>Are you (Seller) aware of any of the following? (Seller answers):</p>
  <div class="table-data">
    <tr><th style="width:75%">Condition / Defect</th><th style="width:25%">Seller Response</th></tr>
    <tr><td>1. Interior or exterior walls, ceilings, doors, windows defects</td><td>NO</td></tr>
    <tr><td>2. Foundation, slab, chimneys, structural components, settling</td><td><strong>NO</strong> <em>(Seller left structural notes blank despite 1961 vintage)</em></td></tr>
    <tr><td>3. Flooding, drainage, grading or standing water problems</td><td>NO</td></tr>
    <tr><td>4. Soil problems, slipping, sliding or liquefaction</td><td>NO</td></tr>
    <tr><td>5. Termites, dry rot, pests or wood destroying organisms</td><td>NO <em>(Seller unaware of active framing issue)</em></td></tr>
    <tr><td>6. Environmental hazards (Lead paint, radon, asbestos)</td><td>YES <em>(Home built 1961; lead paint disclosure required)</em></td></tr>
    <tr><td>7. Neighborhood noise, nuisances, or traffic conditions</td><td>NO</td></tr>
    <tr><td>8. Homeowners Association (HOA), common areas, CC&Rs</td><td>NO <em>(No HOA)</em></td></tr>
  </div>
</div>

<div class="section">
  <h2>IV. Seller & Agent Signatures & Acknowledgments</h2>
  <div class="box" style="background:#fef2f2;border:1.5px solid #f87171;">
    <p style="margin:0 0 6px;color:#991b1b;font-weight:700;">Section III Seller Execution Status:</p>
    <div class="sig-block">
      <div>
        <div class="sig-line" style="border-color:#e11d48;color:#991b1b;">[ MISSING SIGNATURE ]</div>
        <div class="sig-lbl">Seller: Daniel Herrera · Date: _________</div>
      </div>
      <div>
        <div class="sig-line" style="border-color:#e11d48;color:#991b1b;">[ MISSING SIGNATURE ]</div>
        <div class="sig-lbl">Seller: Carmen Herrera · Date: _________</div>
      </div>
    </div>
  </div>
  <div class="sig-block" style="margin-top:16px;">
    <div>
      <div class="sig-line">Sofia Reyes</div>
      <div class="sig-lbl">Listing Agent: Sofia Reyes (DRE #02156789) · Date: 09/25/2025</div>
    </div>
    <div>
      <div class="sig-line" style="color:#94a3b8;">(Blank - to be signed upon delivery)</div>
      <div class="sig-lbl">Buyer Receipt Acknowledgment · Date: _________</div>
    </div>
  </div>
</div>
"""
)

# 3. SPQ Questionnaire
docs["spq-questionnaire"] = (
    "Seller Property Questionnaire (SPQ)",
    "Reference: C.A.R. Form SPQ (Training Summary)",
    """
<div class="section">
  <h2>1. Property & Ownership Details</h2>
  <div class="field-row"><div class="field-label">Property Address:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Seller(s):</div><div class="field-value">Daniel Herrera and Carmen Herrera</div></div>
  <div class="field-row"><div class="field-label">Ownership Period:</div><div class="field-value">Purchased August 2005 (20 years occupancy as primary residence)</div></div>
  <div class="field-row"><div class="field-label">Reason for Selling:</div><div class="field-value">Relocating to Austin, TX for job transfer (relocation deadline early Nov 2025)</div></div>
</div>

<div class="section">
  <h2>2. Specific Seller Disclosures & History</h2>
  <div class="table-data">
    <tr><th style="width:70%">Item / Question</th><th style="width:10%">Yes/No</th><th>Seller Explanation</th></tr>
    <tr>
      <td>Alterations, modifications, or remodeling done during ownership</td>
      <td><strong>YES</strong></td>
      <td>Kitchen remodel completed in 2018 (new cabinetry, quartz counters, updated plumbing fixture). Master bath vanity updated 2020.</td>
    </tr>
    <tr>
      <td>Permits, building code violations, or unpermitted additions</td>
      <td><strong>NO</strong></td>
      <td>Kitchen remodel done with licensed general contractor. No square footage added.</td>
    </tr>
    <tr>
      <td>Water intrusion, pipe bursts, roof leaks, or standing water</td>
      <td><strong>NO</strong></td>
      <td>None known during our ownership.</td>
    </tr>
    <tr>
      <td>Heating or air conditioning past repairs or anomalies</td>
      <td><strong>YES</strong></td>
      <td>Central furnace is original (1961 vintage). Serviced annually; blower motor replaced in 2019. Works as designed.</td>
    </tr>
    <tr>
      <td>Cracks in interior drywall, stucco, foundation, or settling</td>
      <td><strong>NO</strong></td>
      <td>None observed beyond normal minor aging hairline drywall joints.</td>
    </tr>
    <tr>
      <td>Pests, wood boring insects, rodents or treatments</td>
      <td><strong>NO</strong></td>
      <td>Treated perimeter for ants in 2023. No structural pest inspections performed since 2005.</td>
    </tr>
    <tr>
      <td>Neighborhood noise, traffic, dogs, disputes or nuisances</td>
      <td><strong>NO</strong></td>
      <td>Quiet residential street in Rolando. Friendly neighbors. Standard school bus stop at corner.</td>
    </tr>
    <tr>
      <td>Easements, boundary disputes, shared fences or driveways</td>
      <td><strong>YES</strong></td>
      <td>Standard utility easement along rear 5-foot property line (SDG&E). Shared side yard wood fence with 4833 Rolando.</td>
    </tr>
  </div>
</div>

<div class="section">
  <h2>3. Seller Verification & Signatures</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Daniel Herrera</div>
      <div class="sig-lbl">Seller: Daniel Herrera · Date: 09/25/2025</div>
    </div>
    <div>
      <div class="sig-line">Carmen Herrera</div>
      <div class="sig-lbl">Seller: Carmen Herrera · Date: 09/25/2025</div>
    </div>
  </div>
</div>
"""
)

# 4. NHD Report
docs["nhd-report"] = (
    "Natural Hazard Disclosure Statement & Summary Report",
    "Vendor: JCP-LGS Natural Hazard Disclosures · Order #JCP-2025-94821",
    """
<div class="section">
  <h2>Statutory Natural Hazard Zones Summary</h2>
  <div class="field-row"><div class="field-label">Subject Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">APN:</div><div class="field-value"><strong>470-362-18-00</strong> · County of San Diego</div></div>
  <div class="field-row"><div class="field-label">Date Issued:</div><div class="field-value">September 27, 2025</div></div>
</div>

<div class="section">
  <p>This disclosure statement concerns the real property situated in the County of San Diego, State of California. Pursuant to California Government Code §8589.4, §8589.5, §51183.5, and Public Resources Code §2621.9, §2694, and §4136, the following statutory determinations are reported:</p>
  
  <table class="table-data">
    <tr><th style="width:70%">Hazard Zone Determination</th><th style="width:15%">Status</th><th style="width:15%">Source Map</th></tr>
    <tr>
      <td>Special Flood Hazard Area (100-Year Flood / Zone A or V)</td>
      <td><strong>NO</strong></td>
      <td>FEMA Flood Map 06073C1635G</td>
    </tr>
    <tr>
      <td>Area of Potential Flooding (Dam Inundation Zone)</td>
      <td><strong>NO</strong></td>
      <td>State Office of Emergency Services</td>
    </tr>
    <tr>
      <td>Very High Fire Hazard Severity Zone (State / Local)</td>
      <td><strong>NO</strong></td>
      <td>CAL FIRE Hazard Severity Zones</td>
    </tr>
    <tr>
      <td>Wildland Fire Area (State Responsibility Area - SRA)</td>
      <td><strong>NO</strong></td>
      <td>State Board of Forestry</td>
    </tr>
    <tr>
      <td>Earthquake Fault Zone (Alquist-Priolo Special Studies)</td>
      <td><strong>NO</strong></td>
      <td>California Geological Survey (CGS)</td>
    </tr>
    <tr style="background:#fee2e2;">
      <td><strong>Seismic Hazard Zone (Liquefaction Hazard Zone)</strong></td>
      <td><strong style="color:#b91c1c;">YES</strong></td>
      <td><strong>CGS Seismic Hazard Zone Map (San Diego Alluvial Basin)</strong></td>
    </tr>
    <tr>
      <td>Seismic Hazard Zone (Landslide / Slope Stability)</td>
      <td><strong>NO</strong></td>
      <td>California Geological Survey (CGS)</td>
    </tr>
  </table>
</div>

<div class="section">
  <h2>Additional Environmental & Tax Disclosures</h2>
  <div class="field-row"><div class="field-label">Mello-Roos Community Facilities District:</div><div class="field-value"><strong>NO</strong> (Property is not within a designated Mello-Roos CFD)</div></div>
  <div class="field-row"><div class="field-label">1915 Bond Act Special Assessment:</div><div class="field-value"><strong>NO</strong></div></div>
  <div class="field-row"><div class="field-label">Airport Influence Area / ALUCP:</div><div class="field-value">San Diego International Airport Review Area 2 (Overflight advisory)</div></div>
  <div class="field-row"><div class="field-label">Megan's Law Database Notice:</div><div class="field-value">Notice provided pursuant to Penal Code §290.46 (www.meganslaw.ca.gov)</div></div>
</div>

<div class="box">
  <strong>Statutory Disclaimer:</strong> The maps and data cited herein establish zones where property damage from earthquakes or geologic processes could occur. Liquefaction is a phenomenon where loose, water-saturated granular sediment temporarily loses shear strength during seismic shaking. Buyers are advised to consult structural engineers or geotechnical specialists.
</div>
"""
)

# 5. AVID Inspection
docs["avid-inspection"] = (
    "Agent Visual Inspection Disclosure (AVID)",
    "Reference: C.A.R. Form AVID · Completed by Listing Agent",
    """
<div class="section">
  <h2>1. General Information & Scope</h2>
  <div class="field-row"><div class="field-label">Inspection Date:</div><div class="field-value">September 29, 2025 (10:30 AM – 11:45 AM)</div></div>
  <div class="field-row"><div class="field-label">Property Address:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Inspecting Agent:</div><div class="field-value"><strong>Sofia Reyes</strong> (DRE #02156789) · Berkshire Hathaway HomeServices</div></div>
  <div class="field-row"><div class="field-label">Weather Conditions:</div><div class="field-value">Clear, dry, ambient temperature approx. 74°F</div></div>
</div>

<div class="section">
  <h2>2. Specific Room-by-Room Visual Observations</h2>
  <p><em>(Visual inspection only of reasonably and normally accessible areas pursuant to CA Civil Code §2079):</em></p>
  <div class="table-data">
    <tr><th style="width:30%">Area Inspected</th><th>Visual Observations Noted</th></tr>
    <tr>
      <td><strong>Exterior / Grounds / Driveway</strong></td>
      <td>Concrete driveway shows longitudinal surface settlement cracking. Mature front yard landscaping in good manicured condition. Exterior paint on wood fascias and eaves shows sun fading and early paint flaking on west/south exposures.</td>
    </tr>
    <tr>
      <td><strong>Garage (Detached 2-Car)</strong></td>
      <td>Detached garage interior dry. Some minor wood framing dust/frass noticed near south interior framing baseplate (recommend professional termite inspection). Automatic door operates normally.</td>
    </tr>
    <tr>
      <td><strong>Living Room & Dining Area</strong></td>
      <td>Original oak hardwood flooring in good condition with minor surface scratches near hallway entry. Chandelier hanging above dining table (noted as excluded item on RLA).</td>
    </tr>
    <tr>
      <td><strong>Kitchen</strong></td>
      <td>Updated cabinetry and quartz countertops clean and sound. Range, hood, and dishwasher clean. No active leaks observed beneath sink cabinet.</td>
    </tr>
    <tr>
      <td><strong>Hallway & Guest Bath</strong></td>
      <td>Sink basin faucet drained slowly during visual run test. Grout in shower enclosure intact.</td>
    </tr>
    <tr>
      <td><strong>Bedrooms (3) & Master Bath</strong></td>
      <td>All windows open and latch. Master bathroom shower tile intact. No visible stains on bedroom ceilings.</td>
    </tr>
  </div>
</div>

<div class="section">
  <h2>3. Agent Signature</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Sofia Reyes</div>
      <div class="sig-lbl">Sofia Reyes, Realtor® · BHHS California Properties · Date: 09/29/2025</div>
    </div>
  </div>
</div>
"""
)

# 6. Lead-Based Paint Disclosure
docs["lead-paint-disclosure"] = (
    "Lead-Based Paint and Lead-Based Paint Hazards Disclosure",
    "Federal EPA / HUD Form & C.A.R. Form LPD (Homes Built Before 1978)",
    """
<div class="highlight-warn">
  <strong>MANDATORY STATUTORY NOTICE:</strong> Every purchaser of any interest in residential real property on which a residential dwelling was built prior to 1978 is notified that such property may present exposure to lead from lead-based paint that may place young children at risk of developing lead poisoning.
</div>

<div class="section">
  <h2>1. Property Information</h2>
  <div class="field-row"><div class="field-label">Subject Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Year Built:</div><div class="field-value"><strong>1961</strong> (Pre-1978 Construction → Disclosure Required)</div></div>
</div>

<div class="section">
  <h2>2. Seller's Disclosure (Initials & Selection Required)</h2>
  <div class="box">
    <h3>(a) Presence of Lead-Based Paint and/or Lead Hazards:</h3>
    <div class="check-item"><span class="check-box"></span> <span>Known lead-based paint and/or lead-based paint hazards are present in the housing.</span></div>
    <div class="check-item" style="margin-top:6px;"><span class="check-box checked"></span> <span><strong>Seller has no knowledge of lead-based paint and/or lead-based paint hazards in the housing.</strong></span></div>
    <div class="initials"><span>Seller Initials: <strong>[DH]</strong> <strong>[CH]</strong></span></div>
  </div>

  <div class="box">
    <h3>(b) Records and Reports Available to the Seller:</h3>
    <div class="check-item"><span class="check-box"></span> <span>Seller has provided the purchaser with all available records and reports pertaining to lead-based paint.</span></div>
    <div class="check-item" style="margin-top:6px;"><span class="check-box checked"></span> <span><strong>Seller has no reports or records pertaining to lead-based paint and/or lead-based paint hazards in the housing.</strong></span></div>
    <div class="initials"><span>Seller Initials: <strong>[DH]</strong> <strong>[CH]</strong></span></div>
  </div>
</div>

<div class="section">
  <h2>3. Purchaser's Acknowledgment (Blank - Pending Delivery to Buyer)</h2>
  <div class="box" style="background:#f1f5f9;">
    <div class="check-item"><span class="check-box"></span> <span>Purchaser has received copies of all information listed above.</span></div>
    <div class="check-item" style="margin-top:6px;"><span class="check-box"></span> <span>Purchaser has received the pamphlet <em>Protect Your Family from Lead in Your Home</em>.</span></div>
    <div class="check-item" style="margin-top:6px;"><span class="check-box"></span> <span>Purchaser has received a 10-day opportunity (or mutually agreed period) to conduct a risk assessment.</span></div>
    <div class="initials"><span>Purchaser Initials (Pending): [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</span></div>
  </div>
</div>

<div class="section">
  <h2>4. Certification of Accuracy & Signatures</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Daniel Herrera</div>
      <div class="sig-lbl">Seller: Daniel Herrera · Date: 09/25/2025</div>
    </div>
    <div>
      <div class="sig-line">Carmen Herrera</div>
      <div class="sig-lbl">Seller: Carmen Herrera · Date: 09/25/2025</div>
    </div>
  </div>
  <div class="sig-block">
    <div>
      <div class="sig-line">Sofia Reyes</div>
      <div class="sig-lbl">Listing Agent: Sofia Reyes · Date: 09/25/2025</div>
    </div>
    <div>
      <div class="sig-line" style="color:#94a3b8;">(Pending Buyer Signature)</div>
      <div class="sig-lbl">Purchaser(s) · Date: _________</div>
    </div>
  </div>
</div>
"""
)

# 7. Preliminary Title Report (Chicago Title - with SDG&E $1,200 lien)
docs["preliminary-title-report"] = (
    "Preliminary Title Report",
    "Issued by: Chicago Title Company · Order #CTT-2025-07421-SN",
    """
<div class="section">
  <h2>Title Policy & Property Description</h2>
  <div class="field-row"><div class="field-label">Order Number:</div><div class="field-value"><strong>CTT-2025-07421</strong></div></div>
  <div class="field-row"><div class="field-label">Effective Date:</div><div class="field-value">September 28, 2025 at 8:00 AM</div></div>
  <div class="field-row"><div class="field-label">Property Address:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">APN:</div><div class="field-value"><strong>470-362-18-00</strong></div></div>
  <div class="field-row"><div class="field-label">Title Officer:</div><div class="field-value">Sarah Nguyen, Chicago Title Company · (619) 555-0412 · sarah.nguyen@ctt.com</div></div>
  <div class="field-row"><div class="field-label">Estate or Interest:</div><div class="field-value">Fee Simple</div></div>
  <div class="field-row"><div class="field-label">Title Vested In:</div><div class="field-value"><strong>Daniel Herrera and Carmen Herrera, Husband and Wife as Joint Tenants</strong></div></div>
</div>

<div class="section">
  <h2>Schedule B — Exceptions from Coverage</h2>
  <p>At the date hereof, items to be cleared or excepted on the CLTA/ALTA policy to be issued:</p>
  <div class="table-data">
    <tr><th style="width:12%">Item #</th><th>Description / Detail</th></tr>
    <tr>
      <td>1.</td>
      <td>County Real Property Taxes for fiscal year 2025-2026: 1st installment due Nov 1, 2025 ($4,480.12 - Unpaid).</td>
    </tr>
    <tr>
      <td>2.</td>
      <td>An easement for public utility distribution lines and incidental purposes granted to San Diego Gas & Electric Company over the rear 5.0 feet of said land, recorded June 14, 1961 in Book 412, Page 88 of Official Records.</td>
    </tr>
    <tr>
      <td>3.</td>
      <td>Covenants, conditions, and restrictions (CC&Rs) contained in deed recorded in Book 1961, Page 302, Official Records (Standard subdivision restrictions; no active HOA).</td>
    </tr>
    <tr style="background:#fee2e2;">
      <td><strong style="color:#b91c1c;">4. [ACTION]</strong></td>
      <td><strong style="color:#b91c1c;">NOTICE OF LIEN / DELINQUENT CHARGES:</strong> In favor of <strong>San Diego Gas & Electric (SDG&E)</strong>, in the principal amount of <strong>$1,200.00</strong>, recorded October 14, 2019, Document #2019-0412891, Official Records of San Diego County.<br>
      <em>Requirement: Title requires full reconveyance, release, or certified proof of payment from claimant prior to closing to issue clean title policy.</em></td>
    </tr>
    <tr>
      <td>5.</td>
      <td>Deed of Trust to secure an indebtedness of $320,000.00, recorded August 18, 2005 in favor of Wells Fargo Bank, N.A. (Existing first mortgage; payoff demand requested).</td>
    </tr>
  </div>
</div>
"""
)

# 8. Buyer Offer (C.A.R. RPA)
docs["buyer-offer"] = (
    "California Residential Purchase Agreement & Offer (C.A.R. RPA)",
    "Presented by: Marcus Lee (eXp Realty) · Date: October 1, 2025",
    """
<div class="section">
  <h2>1. Parties & Property</h2>
  <div class="field-row"><div class="field-label">Date of Offer:</div><div class="field-value"><strong>October 1, 2025</strong></div></div>
  <div class="field-row"><div class="field-label">Buyer(s):</div><div class="field-value"><strong>Jason Brooks and Michelle Brooks</strong> (Husband & Wife)</div></div>
  <div class="field-row"><div class="field-label">Seller(s):</div><div class="field-value">Daniel Herrera and Carmen Herrera</div></div>
  <div class="field-row"><div class="field-label">Subject Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115 (APN 470-362-18-00)</strong></div></div>
  <div class="field-row"><div class="field-label">Buyer's Brokerage:</div><div class="field-value"><strong>eXp Realty of California, Inc.</strong> (DRE #01878277)</div></div>
  <div class="field-row"><div class="field-label">Buyer's Agent:</div><div class="field-value"><strong>Marcus Lee</strong> (DRE #02198340) · (619) 555-0291 · marcus.lee@exprealty.com</div></div>
</div>

<div class="section">
  <h2>2. Purchase Price & Financing Terms</h2>
  <div class="field-row"><div class="field-label">Initial Purchase Price:</div><div class="field-value"><strong>$840,000.00</strong> (Eight Hundred Forty Thousand Dollars)</div></div>
  <div class="field-row"><div class="field-label">Initial Earnest Money Deposit:</div><div class="field-value"><strong>$16,800.00</strong> (2% of offered purchase price)</div></div>
  <div class="field-row"><div class="field-label">Loan Amount (Conventional 80%):</div><div class="field-value"><strong>$672,000.00</strong> (Fixed rate 30-yr, Pacific Home Lending)</div></div>
  <div class="field-row"><div class="field-label">Remaining Down Payment:</div><div class="field-value"><strong>$151,200.00</strong></div></div>
  <div class="field-row"><div class="field-label">Close of Escrow (COE):</div><div class="field-value">30 Days after acceptance (Target: October 31, 2025)</div></div>
</div>

<div class="section">
  <h2>3. Contingencies & Timelines</h2>
  <div class="field-row"><div class="field-label">Investigation of Property:</div><div class="field-value"><strong>17 Days</strong> after acceptance</div></div>
  <div class="field-row"><div class="field-label">Appraisal Contingency:</div><div class="field-value"><strong>17 Days</strong> after acceptance</div></div>
  <div class="field-row"><div class="field-label">Loan Contingency:</div><div class="field-value"><strong>21 Days</strong> after acceptance</div></div>
</div>

<div class="section">
  <h2>4. Additional Terms & Seller Expenses</h2>
  <div class="field-row"><div class="field-label">Home Warranty Plan:</div><div class="field-value"><strong>Buyer requests Seller pay for a 1-year home warranty</strong> (First American Home Warranty, comprehensive coverage) not to exceed <strong>$600.00</strong>.</div></div>
  <div class="field-row"><div class="field-label">Escrow & Title Fees:</div><div class="field-value">Each party to pay their customary 50% split. Chicago Title designated.</div></div>
</div>

<div class="section">
  <h2>5. Buyer Signatures</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Jason Brooks</div>
      <div class="sig-lbl">Buyer: Jason Brooks · Date: 10/01/2025</div>
    </div>
    <div>
      <div class="sig-line">Michelle Brooks</div>
      <div class="sig-lbl">Buyer: Michelle Brooks · Date: 10/01/2025</div>
    </div>
  </div>
</div>
"""
)

# 9. Seller Counter Offer (SCO)
docs["seller-counter-offer"] = (
    "Seller Counter Offer No. 1 (C.A.R. Form SCO)",
    "Prepared by: Sofia Reyes, BHHS · Date: October 2, 2025",
    """
<div class="section">
  <h2>Transaction Reference</h2>
  <div class="field-row"><div class="field-label">Subject Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115 (APN 470-362-18-00)</strong></div></div>
  <div class="field-row"><div class="field-label">Buyer(s):</div><div class="field-value">Jason Brooks and Michelle Brooks</div></div>
  <div class="field-row"><div class="field-label">Seller(s):</div><div class="field-value">Daniel Herrera and Carmen Herrera</div></div>
  <div class="field-row"><div class="field-label">Reference Purchase Agreement:</div><div class="field-value">C.A.R. RPA dated October 1, 2025 ($840,000 offer)</div></div>
</div>

<div class="section">
  <h2>Terms & Modifications</h2>
  <p>The terms and conditions of the above-referenced Purchase Agreement are accepted subject to the following modifications:</p>
  <div class="box">
    <div class="field-row"><div class="field-label">1. Purchase Price:</div><div class="field-value"><strong>$875,000.00</strong> (Eight Hundred Seventy-Five Thousand Dollars).</div></div>
    <div class="field-row"><div class="field-label">2. Initial Deposit (EMD):</div><div class="field-value"><strong>$17,500.00</strong> (2% of counter price), to be wired to Chicago Title within 3 business days of acceptance.</div></div>
    <div class="field-row"><div class="field-label">3. Close of Escrow (COE):</div><div class="field-value"><strong>November 3, 2025 (FIRM).</strong> <em>Time is of the essence; Seller is relocating to Austin on November 10.</em></div></div>
    <div class="field-row"><div class="field-label">4. Contingency Timelines:</div><div class="field-value">Investigation contingency: 17 days. Appraisal contingency: 17 days. Loan contingency: 21 days.</div></div>
    <div class="field-row"><div class="field-label">5. Home Warranty:</div><div class="field-value">Seller agrees to contribute up to <strong>$600.00</strong> towards Buyer's home warranty plan at closing.</div></div>
    <div class="field-row"><div class="field-label">6. Excluded Items:</div><div class="field-value">Antique dining room chandelier remains excluded per MLS and RLA; to be replaced prior to COE.</div></div>
  </div>
</div>

<div class="section">
  <h2>Seller Signatures</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Daniel Herrera</div>
      <div class="sig-lbl">Seller: Daniel Herrera · Date: 10/02/2025</div>
    </div>
    <div>
      <div class="sig-line">Carmen Herrera</div>
      <div class="sig-lbl">Seller: Carmen Herrera · Date: 10/02/2025</div>
    </div>
  </div>
</div>
"""
)

# 10. Buyer Counter Offer (BCO)
docs["buyer-counter-offer"] = (
    "Buyer Counter Offer No. 1 (C.A.R. Form BCO)",
    "Prepared by: Marcus Lee, eXp Realty · Date: October 3, 2025",
    """
<div class="section">
  <h2>Transaction Reference</h2>
  <div class="field-row"><div class="field-label">Subject Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115 (APN 470-362-18-00)</strong></div></div>
  <div class="field-row"><div class="field-label">Buyer(s):</div><div class="field-value">Jason Brooks and Michelle Brooks</div></div>
  <div class="field-row"><div class="field-label">Seller(s):</div><div class="field-value">Daniel Herrera and Carmen Herrera</div></div>
  <div class="field-row"><div class="field-label">Reference Counter:</div><div class="field-value">Seller Counter Offer No. 1 dated October 2, 2025 ($875,000)</div></div>
</div>

<div class="section">
  <h2>Terms & Modifications</h2>
  <p>Buyer accepts all terms of Seller Counter Offer No. 1 with the following single modification:</p>
  <div class="box">
    <div class="field-row"><div class="field-label">1. Purchase Price:</div><div class="field-value"><strong>$860,000.00</strong> (Eight Hundred Sixty Thousand Dollars).</div></div>
    <div class="field-row"><div class="field-label">2. Earnest Money Deposit:</div><div class="field-value"><strong>$17,200.00</strong> (2% of $860,000 accepted price), due within 3 business days of acceptance.</div></div>
    <div class="field-row"><div class="field-label">3. Close of Escrow:</div><div class="field-value"><strong>November 3, 2025</strong> as requested by Seller.</div></div>
    <div class="field-row"><div class="field-label">4. All Other Terms:</div><div class="field-value">All other terms and contingencies of Seller Counter Offer No. 1 remain unchanged and incorporated.</div></div>
  </div>
</div>

<div class="section">
  <h2>Buyer Execution & Seller Acceptance</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Jason Brooks</div>
      <div class="sig-lbl">Buyer: Jason Brooks · Date: 10/03/2025 (9:30 AM)</div>
    </div>
    <div>
      <div class="sig-line">Michelle Brooks</div>
      <div class="sig-lbl">Buyer: Michelle Brooks · Date: 10/03/2025 (9:30 AM)</div>
    </div>
  </div>
  <div class="sig-block" style="margin-top:16px;">
    <div>
      <div class="sig-line">Daniel Herrera</div>
      <div class="sig-lbl">Seller Acceptance: Daniel Herrera · Date: 10/03/2025 (2:15 PM)</div>
    </div>
    <div>
      <div class="sig-line">Carmen Herrera</div>
      <div class="sig-lbl">Seller Acceptance: Carmen Herrera · Date: 10/03/2025 (2:15 PM)</div>
    </div>
  </div>
</div>
"""
)

# 11. Executed Ratified Purchase Agreement (purchase-agreement-executed)
docs["purchase-agreement-executed"] = (
    "Fully Executed Purchase Agreement & Ratified Contract Package",
    "C.A.R. RPA, SCO #1 & BCO #1 Combined Ratification · Date: October 3, 2025",
    """
<div class="section">
  <h2>Final Contract Ratification Summary</h2>
  <div class="field-row"><div class="field-label">Contract Status:</div><div class="field-value"><strong>FULLY RATIFIED & BINDING (October 3, 2025)</strong></div></div>
  <div class="field-row"><div class="field-label">Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115 (APN 470-362-18-00)</strong></div></div>
  <div class="field-row"><div class="field-label">Final Agreed Purchase Price:</div><div class="field-value"><strong>$860,000.00</strong></div></div>
  <div class="field-row"><div class="field-label">Earnest Money Deposit (2%):</div><div class="field-value"><strong>$17,200.00</strong> · Due within 3 business days (by October 8, 2025)</div></div>
  <div class="field-row"><div class="field-label">Close of Escrow Date:</div><div class="field-value"><strong>November 3, 2025</strong></div></div>
  <div class="field-row"><div class="field-label">Escrow Company / Officer:</div><div class="field-value"><strong>Chicago Title Company · Sarah Nguyen (#CTT-2025-07421)</strong></div></div>
  <div class="field-row"><div class="field-label">Listing Agent / Brokerage:</div><div class="field-value">Sofia Reyes (DRE #02156789) · Berkshire Hathaway HomeServices CA</div></div>
  <div class="field-row"><div class="field-label">Buyer's Agent / Brokerage:</div><div class="field-value">Marcus Lee (DRE #02198340) · eXp Realty of California</div></div>
  <div class="field-row"><div class="field-label">Buyer's Lender:</div><div class="field-value"><strong>Pacific Home Lending · Tyler Adams (NMLS #524817)</strong></div></div>
</div>

<div class="section">
  <h2>Contingency Timelines from Acceptance Date (October 3, 2025)</h2>
  <div class="table-data">
    <tr><th>Contingency / Obligation</th><th>Duration</th><th>Deadline Date</th><th>Notes</th></tr>
    <tr><td>Earnest Money Deposit Delivery</td><td>3 Business Days</td><td><strong>October 8, 2025</strong></td><td>$17,200 wire to Chicago Title</td></tr>
    <tr><td>Seller Disclosure Delivery</td><td>7 Calendar Days</td><td><strong>October 10, 2025</strong></td><td>TDS, SPQ, NHD, Lead, Prelim</td></tr>
    <tr><td>Buyer Investigation (Physical)</td><td>17 Calendar Days</td><td><strong>October 20, 2025</strong></td><td>Home, pest, foundation</td></tr>
    <tr><td>Appraisal Contingency</td><td>17 Calendar Days</td><td><strong>October 20, 2025</strong></td><td>Pacific Home Lending</td></tr>
    <tr><td>Loan Financing Contingency</td><td>21 Calendar Days</td><td><strong>October 24, 2025</strong></td><td>Underwriting approval</td></tr>
    <tr><td>Close of Escrow (COE)</td><td>31 Calendar Days</td><td><strong>November 3, 2025</strong></td><td>Deed recording & keys</td></tr>
  </div>
</div>

<div class="section">
  <h2>Executed Signatures of All Principals</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Daniel Herrera</div>
      <div class="sig-lbl">Seller: Daniel Herrera · Date: 10/03/2025</div>
    </div>
    <div>
      <div class="sig-line">Carmen Herrera</div>
      <div class="sig-lbl">Seller: Carmen Herrera · Date: 10/03/2025</div>
    </div>
  </div>
  <div class="sig-block">
    <div>
      <div class="sig-line">Jason Brooks</div>
      <div class="sig-lbl">Buyer: Jason Brooks · Date: 10/03/2025</div>
    </div>
    <div>
      <div class="sig-line">Michelle Brooks</div>
      <div class="sig-lbl">Buyer: Michelle Brooks · Date: 10/03/2025</div>
    </div>
  </div>
</div>
"""
)

# 12. Home Inspection Report (Jerry Sandoval - Precision Home Inspections)
docs["home-inspection-report"] = (
    "Comprehensive Property Inspection Report",
    "Precision Home Inspections · Jerry Sandoval (ASHI / CREIA #20412) · Date: October 14, 2025",
    """
<div class="section">
  <h2>Property & Inspection Overview</h2>
  <div class="field-row"><div class="field-label">Subject Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Inspection Date / Time:</div><div class="field-value">October 14, 2025 · 9:00 AM – 1:00 PM</div></div>
  <div class="field-row"><div class="field-label">Inspector:</div><div class="field-value"><strong>Jerry Sandoval</strong>, Precision Home Inspections (CREIA Certified)</div></div>
  <div class="field-row"><div class="field-label">Building Style / Year:</div><div class="field-value">1-Story Ranch, Concrete Stem-Wall Foundation, Built 1961</div></div>
</div>

<div class="section">
  <h2>Executive Summary of Findings</h2>
  <div class="table-data">
    <tr><th style="width:25%">Component</th><th style="width:15%">Condition</th><th>Inspector Notes & Recommendations</th></tr>
    <tr style="background:#fee2e2;">
      <td><strong>1. Foundation & Substructure</strong></td>
      <td><strong>ACTION / DEFECT</strong></td>
      <td><strong>Horizontal hairline-to-step cracking observed along south foundation stem wall</strong>, measuring approximately <strong>18 inches in length</strong> with max width of approx 1/8 inch. Appears to be settlement-related. Recommend structural/foundation engineering specialist evaluation.</td>
    </tr>
    <tr style="background:#fee2e2;">
      <td><strong>2. HVAC Heating & Cooling</strong></td>
      <td><strong>ACTION / AGING</strong></td>
      <td><strong>Original 1961 central heating unit & older condensing unit.</strong> System responded to thermostat controls during testing, but unit is <strong>past its design useful life (64+ years vintage)</strong>. High likelihood of failure and costly maintenance. Recommend replacement.</td>
    </tr>
    <tr>
      <td><strong>3. Roof & Attic</strong></td>
      <td>SATISFACTORY</td>
      <td>Composition architectural shingles installed approx 2015. Estimated 10–12 years of remaining useful service life. No active leaks detected in attic rafters.</td>
    </tr>
    <tr>
      <td><strong>4. Plumbing System</strong></td>
      <td>MINOR DEFECT</td>
      <td>Main copper supply functional. Hallway guest bath lavatory drain exhibited slow discharge; hair/debris trap cleaning or snake service recommended.</td>
    </tr>
    <tr>
      <td><strong>5. Electrical System</strong></td>
      <td>SATISFACTORY</td>
      <td>Main service panel upgraded to modern 200A breaker panel. Ground Fault Circuit Interrupters (GFCI) installed in kitchen and bathrooms.</td>
    </tr>
    <tr>
      <td><strong>6. Pest / Wood Frass</strong></td>
      <td>REFERRAL</td>
      <td>Observed wood frass / droppings in detached garage framing. Refer to licensed structural pest control operator report.</td>
    </tr>
  </div>
</div>
"""
)

# 13. Termite Report (Atlas Pest Control)
docs["termite-report"] = (
    "Structural Pest Control Inspection Report (WDO)",
    "Atlas Pest Control · Report #WDO-2025-4128 · License #OPR-11482 · Date: October 15, 2025",
    """
<div class="section">
  <h2>Property & Inspection Details</h2>
  <div class="field-row"><div class="field-label">Address:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Inspector:</div><div class="field-value">Robert Vance (Atlas Pest Control, Branch 3 License #RA-49811)</div></div>
  <div class="field-row"><div class="field-label">Inspection Date:</div><div class="field-value">October 15, 2025</div></div>
  <div class="field-row"><div class="field-label">Building Type:</div><div class="field-value">Single Family Residence with Detached 2-Car Garage</div></div>
</div>

<div class="section">
  <h2>Section 1 Findings (Active Infestation / Infection)</h2>
  <p>Section 1 contains items where there is active wood-destroying organism infestation or infection:</p>
  <div class="box" style="background:#fee2e2;border-left:4px solid #ef4444;">
    <h3>Finding 1A: Subterranean Termites — Detached Garage</h3>
    <p><strong>Description:</strong> Active subterranean termite shelter tubes and live worker termite activity observed along the interior south sill plate and stud bay framing of the detached 2-car garage.</p>
    <p><strong>Recommendation:</strong> Trench and treat soil along garage perimeter with registered termiticide (Termidor HE) and drill/inject concrete slab edge where wood contacts foundation.</p>
    <p><strong>Estimated Cost for Treatment:</strong> <strong style="color:#b91c1c;font-size:15px;">$1,850.00</strong></p>
  </div>
</div>

<div class="section">
  <h2>Section 2 Findings (Conditions Conducive)</h2>
  <div class="box">
    <h3>Finding 2A: Earth-to-Wood Contact</h3>
    <p>Wood fence post adjacent to east exterior wall makes direct contact with soil. Recommend clearing soil line 2 inches below wood fence base.</p>
    <p><strong>Estimated Cost:</strong> $250.00 (Optional preventive maintenance)</p>
  </div>
</div>
"""
)

# 14. Foundation Assessment (Pacific Foundation Engineering)
docs["foundation-assessment"] = (
    "Structural / Geotechnical Foundation Evaluation",
    "Pacific Foundation Engineering · Robert Cheng, PE (Civil #C-68214) · Date: October 17, 2025",
    """
<div class="section">
  <h2>Engineering Inspection Report</h2>
  <div class="field-row"><div class="field-label">Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Inspection Date:</div><div class="field-value">October 17, 2025</div></div>
  <div class="field-row"><div class="field-label">Engineer:</div><div class="field-value"><strong>Robert Cheng, PE, GE</strong> · Pacific Foundation Engineering</div></div>
  <div class="field-row"><div class="field-label">Scope of Work:</div><div class="field-value">Specialized structural assessment of 18-inch horizontal crack on south foundation stem wall noted on home inspection.</div></div>
</div>

<div class="section">
  <h2>Engineering Findings & Diagnosis</h2>
  <div class="box">
    <h3>1. Geotechnical & Soil Context:</h3>
    <p>The Rolando neighborhood is characterized by alluvial soil deposits subject to minor seasonal shrink-swell behavior. Laser level manometer readings across the floor slab indicate differential elevations within 0.35 inches across 40 feet, which falls well within acceptable ASTM residential tolerances.</p>

    <h3>2. Crack Characterization:</h3>
    <p>The 18-inch horizontal crack along the south stem wall represents <strong>cosmetic settling and concrete curing shrinkage</strong> dating back decades. <strong>THERE IS NO STRUCTURAL DEFICIENCY, ROTATION, OR SIGNIFICANT SHEAR DISPLACEMENT.</strong> The foundation continues to safely support the gravity and lateral loads of the superstructure.</p>

    <h3>3. Recommended Remediation:</h3>
    <p>To prevent moisture penetration and preserve reinforcement steel integrity, we recommend pressure epoxy injection sealing with structural urethane overcoat along the 18-inch fissure.</p>
    <p><strong>Remediation Cost Estimate:</strong> <strong style="font-size:15px;color:#0a2647;">$2,200.00</strong> (Includes 5-year warranty on seal integrity)</p>
  </div>
</div>
"""
)

# 15. Request for Repair (C.A.R. RR)
docs["request-for-repair"] = (
    "Buyer's Request for Repair No. 1 (C.A.R. Form RR)",
    "Presented by: Marcus Lee on behalf of Jason & Michelle Brooks · Date: October 18, 2025",
    """
<div class="section">
  <h2>Transaction Reference</h2>
  <div class="field-row"><div class="field-label">Property Address:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Buyer(s):</div><div class="field-value">Jason Brooks and Michelle Brooks</div></div>
  <div class="field-row"><div class="field-label">Seller(s):</div><div class="field-value">Daniel Herrera and Carmen Herrera</div></div>
  <div class="field-row"><div class="field-label">Contingency Deadline:</div><div class="field-value">Day 17 Investigation Contingency expires October 20, 2025</div></div>
</div>

<div class="section">
  <h2>Buyer's Repair & Credit Requests</h2>
  <p>Pursuant to Section 11 of the Purchase Agreement, Buyer requests that Seller agree to the following items prior to Close of Escrow:</p>
  <div class="table-data">
    <tr><th>Item #</th><th>Defect / Finding Reference</th><th>Repair / Credit Requested</th><th style="width:20%">Estimate</th></tr>
    <tr>
      <td>1.</td>
      <td><strong>Foundation Specialist Report:</strong> 18-inch crack on south wall stem.</td>
      <td>Credit buyer to complete recommended epoxy injection seal by Pacific Foundation Engineering.</td>
      <td>$2,200.00</td>
    </tr>
    <tr>
      <td>2.</td>
      <td><strong>Atlas Pest Control Report #WDO-2025-4128:</strong> Section 1 active subterranean termites in detached garage.</td>
      <td>Complete full perimeter subterranean termite treatment with clear Section 1 completion notice.</td>
      <td>$1,850.00</td>
    </tr>
    <tr style="background:#fff3cd;">
      <td>3.</td>
      <td><strong>Precision Home Inspection:</strong> HVAC heating/AC unit is 64 years old, past useful life.</td>
      <td>Replace HVAC furnace and condensing unit with new modern 3-ton 16-SEER system or provide closing credit.</td>
      <td>$8,500.00</td>
    </tr>
    <tr>
      <td colspan="3" style="text-align:right;font-weight:700;">TOTAL BUYER REQUEST:</td>
      <td style="font-weight:700;color:#b91c1c;font-size:14px;">$12,550.00</td>
    </tr>
  </div>
</div>

<div class="section">
  <h2>Buyer Signatures</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Jason Brooks</div>
      <div class="sig-lbl">Buyer: Jason Brooks · Date: 10/18/2025</div>
    </div>
    <div>
      <div class="sig-line">Michelle Brooks</div>
      <div class="sig-lbl">Buyer: Michelle Brooks · Date: 10/18/2025</div>
    </div>
  </div>
</div>
"""
)

# 16. Seller Response to RR (C.A.R. Form RRR)
docs["seller-response-rr"] = (
    "Seller Response and Counter to Buyer Request for Repair (C.A.R. Form RRR)",
    "Prepared by: Sofia Reyes, BHHS · Date: October 19, 2025",
    """
<div class="section">
  <h2>Transaction Reference</h2>
  <div class="field-row"><div class="field-label">Subject Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Seller(s):</div><div class="field-value">Daniel Herrera and Carmen Herrera</div></div>
  <div class="field-row"><div class="field-label">Buyer(s):</div><div class="field-value">Jason Brooks and Michelle Brooks</div></div>
  <div class="field-row"><div class="field-label">Reference RR:</div><div class="field-value">Buyer Request for Repair No. 1 dated October 18, 2025 ($12,550.00 requested)</div></div>
</div>

<div class="section">
  <h2>Seller's Counter Response</h2>
  <div class="box">
    <p>1. <strong>Seller REFUSES Item 3 (HVAC replacement $8,500.00):</strong> The HVAC heating and cooling system was disclosed on TDS as original 1961 vintage. It operates normally and was factored into the competitive listing price.</p>
    <p>2. <strong>Seller ACCEPTS Items 1 & 2 via closing credit:</strong> In lieu of performing physical repairs prior to closing, Seller agrees to credit Buyer the total sum of <strong>$4,500.00</strong> ($2,200 for foundation seal + $1,850 for termite treatment + $450 contingency buffer) applied toward Buyer closing costs at Close of Escrow.</p>
    <p>3. <strong>Condition:</strong> Agreement is conditioned upon Buyer executing full removal of the Investigation of Property Contingency (C.A.R. Form CR).</p>
  </div>
</div>

<div class="section">
  <h2>Seller Signatures</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Daniel Herrera</div>
      <div class="sig-lbl">Seller: Daniel Herrera · Date: 10/19/2025</div>
    </div>
    <div>
      <div class="sig-line">Carmen Herrera</div>
      <div class="sig-lbl">Seller: Carmen Herrera · Date: 10/19/2025</div>
    </div>
  </div>
</div>
"""
)

# 17. Amendment #1: Repair Credit
docs["amendment-1-repair-credit"] = (
    "Amendment No. 1 (Closing Repair Credit)",
    "Reference: C.A.R. Form ADM · Date: October 20, 2025",
    """
<div class="section">
  <h2>Transaction Agreement</h2>
  <div class="field-row"><div class="field-label">Subject Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Escrow Number:</div><div class="field-value"><strong>CTT-2025-07421 (Chicago Title Company)</strong></div></div>
  <div class="field-row"><div class="field-label">Buyer(s):</div><div class="field-value">Jason Brooks and Michelle Brooks</div></div>
  <div class="field-row"><div class="field-label">Seller(s):</div><div class="field-value">Daniel Herrera and Carmen Herrera</div></div>
  <div class="field-row"><div class="field-label">Date of Agreement:</div><div class="field-value">October 20, 2025 (Day 17 Contingency Deadline)</div></div>
</div>

<div class="section">
  <h2>Agreed Terms & Covenants</h2>
  <div class="box">
    <p>Buyer and Seller hereby mutually agree to amend the California Residential Purchase Agreement and Escrow Instructions as follows:</p>
    <p>1. <strong>Seller Closing Credit:</strong> Seller shall provide a credit to Buyer in the amount of <strong>$4,500.00 (Four Thousand Five Hundred Dollars)</strong> at Close of Escrow, to be applied toward Buyer's non-recurring and recurring closing costs (in settlement of foundation and termite findings).</p>
    <p>2. <strong>Contingency Removal:</strong> Concurrently herewith, Buyer executes C.A.R. Form CR fully removing the Investigation of Property Contingency (including all physical inspections, environmental reports, and pest control).</p>
    <p>3. All other terms, conditions, purchase price ($860,000.00), and close of escrow date (November 3, 2025) remain unchanged and in full force and effect.</p>
  </div>
</div>

<div class="section">
  <h2>Signatures of All Parties</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Daniel Herrera</div>
      <div class="sig-lbl">Seller: Daniel Herrera · Date: 10/20/2025</div>
    </div>
    <div>
      <div class="sig-line">Carmen Herrera</div>
      <div class="sig-lbl">Seller: Carmen Herrera · Date: 10/20/2025</div>
    </div>
  </div>
  <div class="sig-block">
    <div>
      <div class="sig-line">Jason Brooks</div>
      <div class="sig-lbl">Buyer: Jason Brooks · Date: 10/20/2025</div>
    </div>
    <div>
      <div class="sig-line">Michelle Brooks</div>
      <div class="sig-lbl">Buyer: Michelle Brooks · Date: 10/20/2025</div>
    </div>
  </div>
</div>
"""
)

# 18. Appraisal Summary
docs["appraisal-summary"] = (
    "Uniform Residential Appraisal Report (URAR Form 1004 Summary)",
    "Lender: Pacific Home Lending · Appraiser: Western Valuation Group · Date: October 23, 2025",
    """
<div class="section">
  <h2>Subject Property & Valuation Summary</h2>
  <div class="field-row"><div class="field-label">Subject Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Contract Purchase Price:</div><div class="field-value"><strong>$860,000.00</strong></div></div>
  <div class="field-row"><div class="field-label">Appraiser / License:</div><div class="field-value">Bradley Evans, Certified Residential Appraiser (OREA #AR-042819)</div></div>
  <div class="field-row"><div class="field-label">Inspection Date:</div><div class="field-value">October 22, 2025</div></div>
  <div class="field-row"><div class="field-label">Report Delivery Date:</div><div class="field-value">October 23, 2025</div></div>
  <div class="field-row" style="background:#fee2e2;padding:6px;"><div class="field-label">FINAL APPRAISED VALUE:</div><div class="field-value"><strong style="color:#b91c1c;font-size:16px;">$845,000.00</strong> (Appraisal Gap: <strong style="color:#b91c1c;">$15,000.00 below contract</strong>)</div></div>
</div>

<div class="section">
  <h2>Comparable Sales Grid (Rolando Submarket)</h2>
  <table class="table-data">
    <tr><th>Address</th><th>Sale Price</th><th>Closed Date</th><th>GLA (Sq Ft)</th><th>Proximity / Adjustments</th><th>Adjusted Value</th></tr>
    <tr><td><strong>Subject: 4827 Rolando</strong></td><td>$860,000 (P)</td><td>Pending</td><td>1,650</td><td>—</td><td>—</td></tr>
    <tr><td>4715 Rolando Blvd</td><td>$850,000</td><td>Aug 2025</td><td>1,620</td><td>0.15 mi / Remodeled kitchen</td><td>$848,000</td></tr>
    <tr><td>4910 Malcolm Dr</td><td>$835,000</td><td>Sep 2025</td><td>1,580</td><td>0.32 mi / Original kitchen</td><td>$842,000</td></tr>
    <tr><td>4620 Seminole Dr</td><td>$847,000</td><td>Sep 2025</td><td>1,680</td><td>0.40 mi / 2-car garage</td><td>$846,000</td></tr>
  </table>
</div>

<div class="box">
  <strong>Appraiser Commentary:</strong> Subject property is a well-maintained 1961 ranch with updated kitchen (2018). However, due to market adjustments for original HVAC and recent closed comparable sales within the immediate neighborhood, the market value opinion is reconciled at <strong>$845,000.00</strong>.
</div>
"""
)

# 19. Contingency Extension Appraisal
docs["contingency-extension-appraisal"] = (
    "Contingency Extension Agreement (C.A.R. Form ADM / ETA)",
    "Mutual Agreement Extending Appraisal Contingency · Date: October 21, 2025",
    """
<div class="section">
  <h2>Transaction Reference</h2>
  <div class="field-row"><div class="field-label">Property Address:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Escrow Number:</div><div class="field-value"><strong>CTT-2025-07421 (Chicago Title Company)</strong></div></div>
  <div class="field-row"><div class="field-label">Buyer(s):</div><div class="field-value">Jason Brooks and Michelle Brooks</div></div>
  <div class="field-row"><div class="field-label">Seller(s):</div><div class="field-value">Daniel Herrera and Carmen Herrera</div></div>
</div>

<div class="section">
  <h2>Mutual Agreement for Contingency Extension</h2>
  <div class="box">
    <p>WHEREAS, the default 17-day Appraisal Contingency was scheduled to expire on October 20, 2025;</p>
    <p>WHEREAS, the appraisal physical inspection by Western Valuation Group on behalf of Pacific Home Lending was delayed due to appraiser scheduling through October 22, 2025;</p>
    <p>NOW, THEREFORE, Buyer and Seller mutually agree to amend the contract as follows:</p>
    <p>1. The <strong>Appraisal Contingency deadline is hereby extended to Monday, October 27, 2025 (5:00 PM PST)</strong>.</p>
    <p>2. The Close of Escrow date remains firm at <strong>November 3, 2025</strong>.</p>
    <p>3. In California, contingency extensions require mutual written agreement and are not unilateral or automatic.</p>
  </div>
</div>

<div class="section">
  <h2>Execution of Principals</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Daniel Herrera</div>
      <div class="sig-lbl">Seller: Daniel Herrera · Date: 10/21/2025</div>
    </div>
    <div>
      <div class="sig-line">Carmen Herrera</div>
      <div class="sig-lbl">Seller: Carmen Herrera · Date: 10/21/2025</div>
    </div>
  </div>
  <div class="sig-block">
    <div>
      <div class="sig-line">Jason Brooks</div>
      <div class="sig-lbl">Buyer: Jason Brooks · Date: 10/21/2025</div>
    </div>
    <div>
      <div class="sig-line">Michelle Brooks</div>
      <div class="sig-lbl">Buyer: Michelle Brooks · Date: 10/21/2025</div>
    </div>
  </div>
</div>
"""
)

# 20. Amendment #2: Price Reduction
docs["amendment-2-price-reduction"] = (
    "Amendment No. 2 (Purchase Price Reduction — Appraisal Gap Compromise)",
    "Reference: C.A.R. Form ADM · Date: October 25, 2025",
    """
<div class="section">
  <h2>Transaction Agreement</h2>
  <div class="field-row"><div class="field-label">Subject Property:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Escrow Number:</div><div class="field-value"><strong>CTT-2025-07421 (Chicago Title Company)</strong></div></div>
  <div class="field-row"><div class="field-label">Buyer(s):</div><div class="field-value">Jason Brooks and Michelle Brooks</div></div>
  <div class="field-row"><div class="field-label">Seller(s):</div><div class="field-value">Daniel Herrera and Carmen Herrera</div></div>
</div>

<div class="section">
  <h2>Recitals & Price Amendment Terms</h2>
  <div class="box">
    <p>WHEREAS, the subject property appraised at <strong>$845,000.00</strong>, reflecting an appraisal gap of <strong>$15,000.00</strong> below the ratified purchase price of $860,000.00;</p>
    <p>WHEREAS, the parties have mutually agreed to compromise and split the $15,000.00 appraisal shortfall equally (50/50);</p>
    <p>IT IS HEREBY AGREED:</p>
    <p>1. <strong>Revised Purchase Price:</strong> The purchase price is reduced by $7,500.00 from $860,000.00 to <strong>$852,500.00 (Eight Hundred Fifty-Two Thousand Five Hundred Dollars)</strong>.</p>
    <p>2. <strong>Buyer Down Payment Contribution:</strong> Buyer agrees to contribute the remaining $7,500.00 as additional cash down payment above the $845,000.00 loan valuation.</p>
    <p>3. <strong>Repair Credit Maintained:</strong> The $4,500.00 closing credit agreed in Amendment No. 1 remains in full effect.</p>
    <p>4. <strong>Contingency Removal:</strong> Buyer shall execute C.A.R. Form CR removing the Appraisal Contingency on or before October 27, 2025.</p>
    <p>5. <strong>Closing Date:</strong> Close of Escrow remains firm on <strong>November 3, 2025</strong>.</p>
  </div>
</div>

<div class="section">
  <h2>Signatures of All Parties</h2>
  <div class="sig-block">
    <div>
      <div class="sig-line">Daniel Herrera</div>
      <div class="sig-lbl">Seller: Daniel Herrera · Date: 10/25/2025</div>
    </div>
    <div>
      <div class="sig-line">Carmen Herrera</div>
      <div class="sig-lbl">Seller: Carmen Herrera · Date: 10/25/2025</div>
    </div>
  </div>
  <div class="sig-block">
    <div>
      <div class="sig-line">Jason Brooks</div>
      <div class="sig-lbl">Buyer: Jason Brooks · Date: 10/25/2025</div>
    </div>
    <div>
      <div class="sig-line">Michelle Brooks</div>
      <div class="sig-lbl">Buyer: Michelle Brooks · Date: 10/25/2025</div>
    </div>
  </div>
</div>
"""
)

# 21. Wire Fraud Email Screenshot (spoofed email)
docs["wire-fraud-email-screenshot"] = (
    "SECURITY INCIDENT BRIEFING: Intercepted Phishing / Wire Fraud Email",
    "Evidence Artifact for TC Training · Escrow Cyber Defense File · Date: October 29, 2025",
    """
<div class="highlight-warn" style="background:#fef2f2;border-left:4px solid #b91c1c;">
  <strong style="color:#b91c1c;font-size:14px;">CRITICAL RED FLAG AUDIT:</strong> This email was received by buyers Jason & Michelle Brooks and forwarded to the Transaction Coordinator. Identify the fraudulent indicators:
</div>

<div class="box" style="border:2px solid #ef4444;background:#fff;padding:18px;">
  <div style="border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:14px;">
    <div style="font-size:13px;margin-bottom:4px;"><strong>From:</strong> Sarah Nquyen &lt;<span style="color:#b91c1c;font-weight:700;background:#fee2e2;padding:1px 4px;">snguyen@chicago-titleco.com</span>&gt; <em>[NOTE: Name spelled 'Nquyen' not 'Nguyen'; Domain is fake 'chicago-titleco.com' vs real 'ctt.com']</em></div>
    <div style="font-size:13px;margin-bottom:4px;"><strong>To:</strong> jmbrooks.home@email.com, marcus.lee@exprealty.com</div>
    <div style="font-size:13px;margin-bottom:4px;"><strong>Date:</strong> Wednesday, October 29, 2025, 2:42 PM</div>
    <div style="font-size:14px;color:#b91c1c;font-weight:700;"><strong>Subject:</strong> URGENT: Updated Wiring Instructions for 4827 Rolando Blvd Closing Funds</div>
  </div>

  <div style="font-size:13.5px;line-height:1.65;color:#1e293b;">
    <p>Dear Jason and Michelle,</p>
    <p><strong style="color:#b91c1c;">URGENT NOTICE REGARDING CLOSING FUNDS:</strong> Due to an unscheduled system migration and banking protocol audit at our national processing hub, our primary incoming wire depository account has been temporarily restricted.</p>
    <p>To avoid missing your November 3 closing deadline and incurring late fees or deal cancellation, you must remit your final cash-to-close funds ($158,240.00) immediately to our auxiliary settlement account:</p>

    <div style="background:#f8fafc;border:1.5px dashed #b91c1c;padding:12px;border-radius:4px;margin:12px 0;">
      <div><strong>Beneficiary Bank:</strong> Metropol Commercial Depository</div>
      <div><strong>Routing Number (ABA):</strong> 121049281</div>
      <div><strong>Account Number:</strong> 9940-1284-9182</div>
      <div><strong>Account Name:</strong> Escrow Closing Disbursements LLC</div>
      <div><strong>Reference:</strong> 4827 Rolando Escrow #CTT-2025</div>
    </div>

    <p><strong style="color:#b91c1c;">DO NOT CALL OUR MAIN OFFICE</strong> as phone lines are undergoing PBX maintenance today. Please reply to this email directly with your wire confirmation receipt as soon as initiated.</p>
    <p>Sincerely,<br>
    <strong>Sarah Nquyen</strong><br>
    Senior Escrow Officer · Chicago Title Co.</p>
  </div>
</div>

<div class="box" style="background:#ecfdf5;border-left:4px solid #059669;margin-top:16px;">
  <strong style="color:#065f46;">Standard TC Best Practice:</strong> NEVER trust email for wiring instructions or account modifications. Always initiate an independent outbound phone verification call to Sarah Nguyen at Chicago Title using the known verified phone number <strong>(619) 555-0412</strong>.
</div>
"""
)

# 22. Settlement Statement (ALTA)
docs["settlement-statement"] = (
    "ALTA Settlement Statement (Seller & Buyer Combined Summary)",
    "Chicago Title Company · Sarah Nguyen · Escrow #CTT-2025-07421 · Date: November 3, 2025",
    """
<div class="section">
  <h2>Transaction & Escrow Information</h2>
  <div class="field-row"><div class="field-label">Escrow Number:</div><div class="field-value"><strong>CTT-2025-07421</strong></div></div>
  <div class="field-row"><div class="field-label">Closing Date:</div><div class="field-value"><strong>November 3, 2025</strong></div></div>
  <div class="field-row"><div class="field-label">Property Address:</div><div class="field-value"><strong>4827 Rolando Blvd, San Diego, CA 92115</strong></div></div>
  <div class="field-row"><div class="field-label">Buyer(s):</div><div class="field-value">Jason Brooks and Michelle Brooks</div></div>
  <div class="field-row"><div class="field-label">Seller(s):</div><div class="field-value">Daniel Herrera and Carmen Herrera</div></div>
  <div class="field-row"><div class="field-label">Escrow Company:</div><div class="field-value">Chicago Title Company · Sarah Nguyen, Escrow Officer</div></div>
</div>

<div class="section">
  <h2>Financial Settlement Breakdown</h2>
  <table class="table-data">
    <tr><th style="width:45%">Description</th><th style="width:25%">Seller Debit (Charge)</th><th style="width:25%">Seller Credit</th></tr>
    <tr style="background:#f8fafc;font-weight:700;">
      <td><strong>Final Agreed Purchase Price</strong></td>
      <td></td>
      <td style="color:#059669;font-weight:700;">$852,500.00</td>
    </tr>
    <tr>
      <td>First Mortgage Payoff (Wells Fargo Loan #09281)</td>
      <td>$284,350.00</td>
      <td></td>
    </tr>
    <tr>
      <td>SDG&E Utility Lien Release (Proof of payment verified by seller)</td>
      <td>$0.00 (Cleared)</td>
      <td></td>
    </tr>
    <tr style="background:#fff3cd;">
      <td><strong>Repair Credit to Buyer (Amendment #1)</strong></td>
      <td><strong>$4,500.00</strong></td>
      <td></td>
    </tr>
    <tr>
      <td>Home Warranty Contribution (First American Plan)</td>
      <td>$600.00</td>
      <td></td>
    </tr>
    <tr>
      <td>Broker Commission (Listing: BHHS 2.5% = $21,312.50)</td>
      <td>$21,312.50</td>
      <td></td>
    </tr>
    <tr>
      <td>Broker Commission (Buyer: eXp 2.5% = $21,312.50)</td>
      <td>$21,312.50</td>
      <td></td>
    </tr>
    <tr>
      <td>County Transfer Tax ($1.10 per $1,000 on $852,500)</td>
      <td>$937.75</td>
      <td></td>
    </tr>
    <tr>
      <td>Title Policy (Owner's ALTA Policy - Seller 50% Share)</td>
      <td>$1,325.00</td>
      <td></td>
    </tr>
    <tr>
      <td>Escrow Closing Fee (Chicago Title - Seller 50% Share)</td>
      <td>$725.00</td>
      <td></td>
    </tr>
    <tr>
      <td>City & County Recording / Reconveyance Fees</td>
      <td>$145.00</td>
      <td></td>
    </tr>
    <tr>
      <td>Property Tax Proration (Credit for paid tax period)</td>
      <td></td>
      <td>$420.15</td>
    </tr>
    <tr style="background:#ecfdf5;font-weight:700;font-size:14px;">
      <td><strong>NET CASH TO SELLER AT CLOSING</strong></td>
      <td><strong>$517,712.90</strong></td>
      <td><strong>$852,920.15</strong></td>
    </tr>
  </table>
</div>

<div class="section">
  <h2>Escrow Officer Certification</h2>
  <p>I certify that this is a true and correct settlement accounting of funds disbursed at Close of Escrow on November 3, 2025.</p>
  <div class="sig-block">
    <div>
      <div class="sig-line">Sarah Nguyen</div>
      <div class="sig-lbl">Sarah Nguyen, Escrow Officer · Chicago Title Company</div>
    </div>
  </div>
</div>
"""
)

print(f"Total documents to generate: {len(docs)}")

for name, (title, ref, content) in docs.items():
    html_file = os.path.join(html_dir, f"{name}.html")
    pdf_file = os.path.join(pdf_dir, f"{name}.pdf")
    full_html = wrap_doc(title, ref, content)
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(full_html)
    print(f"Wrote HTML: {name}.html")

    # Render PDF using Edge
    cmd = [
        edge_path,
        "--headless",
        "--disable-gpu",
        f"--print-to-pdf={pdf_file}",
        f"file:///{html_file.replace('\\', '/')}"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(pdf_file) and os.path.getsize(pdf_file) > 0:
        print(f"  -> Generated PDF: {name}.pdf ({os.path.getsize(pdf_file)} bytes)")
    else:
        print(f"  -> ERROR generating PDF: {name}.pdf. Stderr: {res.stderr}")

# Copy purchase-agreement-executed.pdf to purchase-agreement.pdf as well
import shutil
shutil.copyfile(os.path.join(pdf_dir, "purchase-agreement-executed.pdf"), os.path.join(pdf_dir, "purchase-agreement.pdf"))
print("Copied purchase-agreement-executed.pdf -> purchase-agreement.pdf")
