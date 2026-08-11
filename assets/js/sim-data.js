/* ============================================================
   VOOV Claude Academy — Simulator data
   Real-case deals + role & general scenarios
   (buyer names & prices changed for training)
   ============================================================ */

/* ---------- TRANSACTION DEALS (by state) ---------- */
const DEALS = {
  tx: {
    code:"TX", state:"Texas",
    address:"2931 McDonough Way, Katy, TX 77494",
    legal:"Lot 11, Block 1, Tamarron Sec 9 · Fort Bend County",
    price:"$389,900", finance:"Conventional financing (Third-Party Financing Addendum)",
    buyers:"Marcus Halloran & Priya Anand", seller:"Raymond Halvorsen",
    title:"Lone Star Title — Houston, TX", form:"TREC One-to-Four Family Residential Contract (Resale)",
    facts:"Effective date Nov 4 · Earnest Money $3,535 · Option Fee $300 · 7-day Option Period · HOA + MUD community",
    steps:[
      { q:"The TREC contract is fully executed on November 4. What's your first file-setup move as the TC?",
        choices:[
          {t:"Confirm the Option Fee and 3-business-day EMD deadlines, then send welcome emails to all parties.",ok:true},
          {t:"Order the appraisal immediately so it doesn't hold up closing.",ok:false},
          {t:"Wait until the Option Period ends before doing anything; nothing is firm yet.",ok:false}],
        fb:"In Texas everything starts with the Option Fee and the 3-business-day EMD clock. Lock those dates and introduce yourself to all parties on Day 1." },
      { q:"It's now Day 2. The buyers haven't scheduled their inspection. The Option Period expires in 5 days. What do you do?",
        choices:[
          {t:"Send a friendly reminder urging them to schedule the inspector now, noting the Option Period expiration date.",ok:true},
          {t:"Schedule the inspection for them without asking.",ok:false},
          {t:"Do nothing; it's the buyer's responsibility, not yours.",ok:false}],
        fb:"The Option Period is the buyer's window to terminate for any reason. A TC proactively reminds them so they don't lose leverage, but you coordinate rather than decide for them." },
      { q:"The title company tells you they have not received the $3,535 earnest money, and it's the morning of business day 3. What's the right action?",
        choices:[
          {t:"Immediately alert the buyer's agent that EMD and Option Fee must reach the title company today to stay compliant.",ok:true},
          {t:"Assume it's in the mail and note it as received.",ok:false},
          {t:"Tell the seller the deal is dead.",ok:false}],
        fb:"EMD and the Option Fee must be delivered within 3 business days. On the deadline day you escalate to the agent and confirm; never assume, never overreact." },
      { q:"Repairs were negotiated after inspection. The Option Period expires tomorrow. What must be true before it expires?",
        choices:[
          {t:"The executed Amendment reflecting the agreed repairs must be in the file before the Option Period ends.",ok:true},
          {t:"Only a verbal agreement between agents is needed.",ok:false},
          {t:"The repairs must be physically completed before expiration.",ok:false}],
        fb:"Get the signed Amendment in place before the option expires. After expiration the buyer loses the unrestricted right to walk, so paperwork timing is everything." },
      { q:"Closing is set. The buyer is financed. When must the buyer receive the Closing Disclosure (CD)?",
        choices:[
          {t:"At least 3 business days before closing.",ok:true},
          {t:"On closing day at the table.",ok:false},
          {t:"Within 3 days after closing.",ok:false}],
        fb:"The TRID rule requires the CD in the borrower's hands at least 3 business days before closing. Track it; a late CD pushes the closing date." }
    ]
  },
  ca: {
    code:"CA", state:"California",
    address:"139 S Edinburgh Ave, Los Angeles, CA 90048",
    legal:"APN 5511-023-009 · Beverly Grove · Los Angeles County",
    price:"$3,295,000", finance:"All cash",
    buyers:"Adrian & Camille Fontaine", seller:"The Hartwell Trust",
    title:"Pacific Crest Escrow — Los Angeles, CA", form:"C.A.R. Residential Purchase Agreement (RPA)",
    facts:"Acceptance Apr 28 · 17-day inspection & appraisal · 21-day loan · TDS/SPQ/NHD package · High fire & flood zone",
    steps:[
      { q:"The RPA is accepted. This is an all-cash deal. What's your first move on file setup?",
        choices:[
          {t:"Open escrow, confirm escrow number and officer, and note all contingency-removal deadlines.",ok:true},
          {t:"Order a loan-contingency timeline from the lender.",ok:false},
          {t:"Skip contingencies; all-cash deals have none.",ok:false}],
        fb:"Open escrow first and calendar the contingencies. Even all-cash deals carry the 17-day investigation contingency and disclosure timelines." },
      { q:"Day 5: the seller's agent hasn't delivered the disclosure package. What's the rule you remind them of?",
        choices:[
          {t:"Seller must deliver TDS, SPQ, and NHD within 7 days; the buyer's 17-day review clock depends on it.",ok:true},
          {t:"Disclosures are optional in California.",ok:false},
          {t:"The buyer has 30 days, so there's no rush.",ok:false}],
        fb:"California sellers deliver TDS, SPQ and NHD within 7 days. Late disclosures compress the buyer's review window, so flag it early." },
      { q:"The home inspection reveals the property sits in a high fire-hazard zone. What disclosure does this trigger?",
        choices:[
          {t:"It may require AB38 / defensible-space disclosures and a C.A.R. FHDS form.",ok:true},
          {t:"Nothing; fire zones aren't disclosed in California.",ok:false},
          {t:"Only flood insurance is affected.",ok:false}],
        fb:"This real property is in a high fire-severity zone. That can trigger AB38 defensible-space disclosures and the FHDS form, exactly what the inspection report flagged." },
      { q:"Day 16: the buyers are satisfied with inspections. What document moves the deal forward?",
        choices:[
          {t:"Request the Contingency Removal (CR) form; contingencies must be removed in writing.",ok:true},
          {t:"Nothing; California contingencies expire automatically.",ok:false},
          {t:"Cancel and re-open escrow.",ok:false}],
        fb:"Unlike some states, California contingencies do not auto-remove. The buyer must actively sign the CR form, or they keep their right to cancel." },
      { q:"Closing approaches. Who handles the closing, and what confirms it's done?",
        choices:[
          {t:"An escrow company handles closing; recording confirms the closing is complete.",ok:true},
          {t:"An attorney must preside, as in New York.",ok:false},
          {t:"The listing agent signs the deed on the seller's behalf.",ok:false}],
        fb:"California closings run through escrow companies (often separate from title). Funding plus recording at the county equals closed." }
    ]
  },
  va: {
    code:"VA", state:"Virginia",
    address:"4232 Maplehurst Road, Virginia Beach, VA 23462",
    legal:"Timberlake Sec 5, Block A, Lot 15",
    price:"$312,000", finance:"Conventional financing",
    buyers:"Caleb & Naomi Whitfield", seller:"Marcus Trent",
    title:"BHHS RW Towne Realty (Escrow Agent)", form:"REIN Standard Purchase Agreement",
    facts:"Ratified Jan 14 · Closing Feb 11 · Deposit $1,000 · CIC/POA resale certificate · PICRA inspection negotiation · WDI report",
    steps:[
      { q:"The REIN purchase agreement is ratified on January 14. As the TC, what anchors your entire file?",
        choices:[
          {t:"The ratification date; every Virginia deadline flows from it. Calendar them and send welcome emails.",ok:true},
          {t:"The listing date; that's when the clock starts in Virginia.",ok:false},
          {t:"The closing date; work backward only from February 11.",ok:false}],
        fb:"In Virginia all timelines flow from the ratification date (the date the last party signs). Lock it, build the deadline calendar, and introduce yourself to all parties." },
      { q:"When is the earnest money deposit ($1,000) typically due, and what do you confirm?",
        choices:[
          {t:"Within 1 to 3 business days of ratification; confirm delivery to the Escrow Agent and obtain a receipt.",ok:true},
          {t:"At the closing table on February 11.",ok:false},
          {t:"Within 30 days; there's no rush in Virginia.",ok:false}],
        fb:"Virginia EMD is usually due 1 to 3 business days after ratification. Confirm it reached the Escrow Agent and get a written receipt for the file." },
      { q:"This property is in a Common Interest Community (CIC/POA). What's the rule once the resale certificate is delivered?",
        choices:[
          {t:"The buyer has 3 days to review after receipt and may cancel the contract.",ok:true},
          {t:"There is no review period; the buyer is already committed.",ok:false},
          {t:"The buyer has 30 days and automatic approval.",ok:false}],
        fb:"For CIC/POA properties the seller orders the resale certificate, and the buyer gets a 3-day right to review after receipt, with the right to cancel. Track the delivery date carefully." },
      { q:"After the home inspection, the buyers want repairs. What's the correct Virginia mechanism?",
        choices:[
          {t:"Negotiate via the PICRA (Property Inspection Contingency Removal Addendum); confirm the seller's response per the contract timeline.",ok:true},
          {t:"A verbal agreement between the two agents is sufficient.",ok:false},
          {t:"The seller is automatically required to fix everything the inspector finds.",ok:false}],
        fb:"Virginia Beach REIN deals use the PICRA to negotiate inspection items. Get the addendum (and any counter) fully executed within the contingency window, exactly what this file's PICRA counters show." },
      { q:"Closing is set for February 11 and the buyers are financed. Who can close, and what timing must you protect?",
        choices:[
          {t:"A title company or an attorney can close in Virginia; ensure the buyer receives the Closing Disclosure at least 3 business days before settlement.",ok:true},
          {t:"Only an attorney may close, as in New York.",ok:false},
          {t:"The CD can be handed over at the closing table.",ok:false}],
        fb:"Virginia allows either title companies or attorneys to close. For a financed buyer, the TRID 3-business-day Closing Disclosure rule still governs; a late CD pushes the settlement date." }
    ]
  },
  ny: {
    code:"NY", state:"New York",
    address:"15 Braintree Crescent, Penfield (Rochester), NY 14526",
    legal:"MLS R1662847 · Beacon Hills Townhouses · Monroe County · Webster schools",
    price:"$192,500", finance:"Conventional, 60-day mortgage contingency",
    buyers:"Theo & Mara Vandenberg", seller:"Estate of Margaret E. Caldwell",
    title:"Genesee Valley Abstract", form:"Attorney-drafted purchase contract (estate sale, sold as-is)",
    facts:"Townhouse · 2 bd / 1.1 ba · 1,301 sqft · built 1979 · HOA (Beacon Hills) · delayed negotiations",
    steps:[
      { q:"The seller accepts the Vandenbergs' offer on this estate townhouse. In New York, is the deal binding yet?",
        choices:[
          {t:"No; it's not binding until both attorneys exchange fully signed contracts.",ok:true},
          {t:"Yes; an accepted offer is a binding contract in New York.",ok:false},
          {t:"Only once the buyer pays the option fee.",ok:false}],
        fb:"New York is attorney-driven. An accepted offer just starts attorney review; nothing binds until signed contracts are exchanged." },
      { q:"What's your first coordination task after the offer is accepted?",
        choices:[
          {t:"Confirm both parties' attorney contact info and send it to all sides.",ok:true},
          {t:"Order the title commitment yourself.",ok:false},
          {t:"Schedule the closing date.",ok:false}],
        fb:"Job one in NY is getting attorneys engaged and connected. Everything downstream flows through them." },
      { q:"This is an estate sale sold as-is, and the listing notes an HOA (Beacon Hills). What should the offer and file reflect?",
        choices:[
          {t:"State the as-is condition in the offer and request HOA rules and financials for buyer review.",ok:true},
          {t:"Demand the estate make all repairs before closing.",ok:false},
          {t:"Ignore the HOA; townhouses don't have associations.",ok:false}],
        fb:"The private remarks require the as-is language in the offer and there's an active HOA. Capture both so the buyers review obligations early." },
      { q:"Contracts are signed. How much deposit does the buyer typically pay, and who holds it?",
        choices:[
          {t:"About 10%, held in escrow by the seller's attorney.",ok:true},
          {t:"1% held by the title company.",ok:false},
          {t:"Nothing until the co-op board approves.",ok:false}],
        fb:"In NY the buyer typically puts down about 10% on contract signing, held in the seller's attorney's escrow account." },
      { q:"The buyers are financing. What contingency drives the timeline most here?",
        choices:[
          {t:"The 60-day mortgage contingency; track it and share the commitment letter with both attorneys.",ok:true},
          {t:"A 15-day inspection contingency, as in Florida.",ok:false},
          {t:"The Texas Option Period.",ok:false}],
        fb:"NY's standard mortgage contingency runs about 60 days. The commitment letter is the milestone everyone waits on before clear-to-close." }
    ]
  }
};

/* ---------- ROLE & GENERAL SCENARIOS ---------- */
const SCENARIOS = [
  /* ===== GENERAL ===== */
  { id:"wirefraud", cat:"General", role:"All roles · Risk",
    title:"The last-minute wire change",
    context:"It's the afternoon before closing on the Texas deal. You receive an email that appears to be from the title company: 'Updated wire instructions, please send the buyer's funds to the new account below.' The buyers are copied and ready to wire.",
    steps:[
      { q:"What's your first reaction to a changed wire instruction the day before closing?",
        choices:[
          {t:"Treat it as a likely fraud attempt; wire-change emails before closing are a classic red flag.",ok:true},
          {t:"Forward it to the buyers so they can send funds quickly.",ok:false},
          {t:"Reply to the email asking them to confirm the new account.",ok:false}],
        fb:"Last-minute wire-instruction changes are the #1 real-estate fraud pattern. Assume fraud until verified through an independent channel." },
      { q:"How do you verify the instructions?",
        choices:[
          {t:"Call the title company on a known, previously verified phone number, not one from the email.",ok:true},
          {t:"Reply to the email and ask them to call you.",ok:false},
          {t:"Trust it because the buyers were copied.",ok:false}],
        fb:"Always verify by voice using a phone number you already had on file. Numbers and reply addresses in the suspicious email can be spoofed." },
      { q:"The phone call confirms the title company never sent that email. What now?",
        choices:[
          {t:"Warn the buyers and agents immediately not to wire, and report the phishing attempt.",ok:true},
          {t:"Quietly delete the email and proceed with the original instructions.",ok:false},
          {t:"Wait to see if a corrected email arrives.",ok:false}],
        fb:"Alert everyone in the transaction at once, preserve the email as evidence, and report it. Speed protects the buyers' funds." },
      { q:"What habit prevents this across every file?",
        choices:[
          {t:"Set the expectation early that wire instructions never change by email, and are always verified by phone.",ok:true},
          {t:"Only worry about wire fraud on high-priced deals.",ok:false},
          {t:"Assume the lender will catch any problem.",ok:false}],
        fb:"Bake verification into your welcome email on every transaction. Prevention is a process, not a one-time catch." }
    ]
  },
  { id:"lowappraisal", cat:"General", role:"All roles · Negotiation",
    title:"The low appraisal",
    context:"On a financed purchase at $389,900, the lender's appraisal comes back at $372,000 — a $17,900 gap. The financing contingency is still active.",
    steps:[
      { q:"What's the immediate coordination step?",
        choices:[
          {t:"Notify the agents and lay out the options factually so the principals can decide.",ok:true},
          {t:"Tell the buyer to walk away.",ok:false},
          {t:"Ask the appraiser to simply raise the number.",ok:false}],
        fb:"Your job is to surface the gap and the options quickly and neutrally, then coordinate whatever the parties decide." },
      { q:"Which is NOT a legitimate option for closing the gap?",
        choices:[
          {t:"Pressuring the appraiser to change the value without new evidence.",ok:true},
          {t:"Buyer brings extra cash to cover the difference.",ok:false},
          {t:"Seller reduces the price or the parties meet in the middle.",ok:false}],
        fb:"You can request a rebuttal/reconsideration with comparable sales, but you never pressure an appraiser to change value. The real levers are price, cash, or a meet-in-the-middle." },
      { q:"The parties agree the seller drops to $381,000 and the buyer covers the rest. What do you need?",
        choices:[
          {t:"A signed amendment documenting the new price before proceeding.",ok:true},
          {t:"Just a text from the agents confirming.",ok:false},
          {t:"Nothing; the lender will adjust automatically.",ok:false}],
        fb:"Every renegotiated term needs a fully executed amendment in the file before the lender and title can update figures." }
    ]
  },

  /* ===== CFO / BOOKKEEPER ===== */
  { id:"cda", cat:"CFO / Bookkeeper", role:"CFO / Bookkeeper",
    title:"Commission disbursement & month-end close",
    context:"A brokerage deal closed today. Gross commission to the brokerage is $11,697 (3% of $389,900). The agent is on an 80/20 split, owes a $250 transaction fee and a $400 E&O deduction. You're preparing the disbursement and the month-end books.",
    steps:[
      { q:"How does the brokerage normally get paid its commission at closing?",
        choices:[
          {t:"Via a Commission Disbursement Authorization (CDA) sent to the title/escrow company before closing.",ok:true},
          {t:"The agent collects cash from the buyer.",ok:false},
          {t:"The brokerage invoices the buyer 30 days after closing.",ok:false}],
        fb:"The CDA instructs title/escrow to pay the brokerage directly from closing proceeds. Getting it in before closing is what makes you paid on time." },
      { q:"Compute the agent's net. Gross $11,697, 80/20 split, minus $250 fee and $400 E&O. What's the agent paid?",
        choices:[
          {t:"$8,707.60  ($11,697 × 80% = $9,357.60, minus $650 in deductions).",ok:true},
          {t:"$9,357.60  (split only, no deductions).",ok:false},
          {t:"$11,047.00  (gross minus deductions, no split).",ok:false}],
        fb:"Split first: $11,697 × 0.80 = $9,357.60. Then subtract the $250 transaction fee and $400 E&O = $8,707.60 to the agent; the brokerage keeps its 20% plus the fees." },
      { q:"The buyer's earnest money was held in the brokerage trust (escrow) account. At month-end, what's essential?",
        choices:[
          {t:"Reconcile the trust account separately and never commingle it with operating funds.",ok:true},
          {t:"Move trust funds into operating to simplify the books.",ok:false},
          {t:"Skip reconciliation since the deal already closed.",ok:false}],
        fb:"Trust/escrow funds are not the brokerage's money. They must be reconciled separately to the penny and never commingled; commingling is a serious license-law violation." },
      { q:"For year-end, how is the agent's pay reported?",
        choices:[
          {t:"On a Form 1099-NEC; agents are independent contractors, not W-2 employees.",ok:true},
          {t:"On a W-2 with payroll tax withheld.",ok:false},
          {t:"It isn't reported; commissions are tax-free.",ok:false}],
        fb:"Real-estate agents are almost always 1099 independent contractors. Track their disbursements all year so the 1099-NEC is accurate." }
    ]
  },

  { id:"trustdiscrepancy", cat:"CFO / Bookkeeper", role:"CFO / Bookkeeper",
    title:"The trust account discrepancy",
    context:"During month-end reconciliation, the brokerage trust account is $1,000 short of what the ledger says it should hold. The McDonough Way, TX earnest money ($3,535) was supposed to be released to escrow at closing last week.",
    steps:[
      { q:"What's the first step in resolving a trust account shortage?",
        choices:[
          {t:"Reconcile every transaction line-by-line against bank statements before assuming anything about the cause.",ok:true},
          {t:"Immediately report it as theft to the state licensing board.",ok:false},
          {t:"Adjust the ledger to match the bank balance and move on.",ok:false}],
        fb:"A shortage is almost always a timing or recording error until proven otherwise. Line-by-line reconciliation finds the actual cause before you escalate or 'fix' the number." },
      { q:"You find the $1,000 EMD release for the McDonough Way file was recorded twice as a deduction. What's the correct fix?",
        choices:[
          {t:"Reverse the duplicate entry, document the correction with a clear audit note, and re-verify the balance matches the bank.",ok:true},
          {t:"Just delete the duplicate entry with no note.",ok:false},
          {t:"Leave it and adjust the next month's numbers to compensate.",ok:false}],
        fb:"Trust account corrections need a documented audit trail, not a silent delete or a 'catch it up later' approach. Every correction should be traceable." },
      { q:"Why does this matter more than a normal bookkeeping error?",
        choices:[
          {t:"Trust/escrow funds belong to clients, not the brokerage. Mishandling them is a licensing and legal risk, not just an accounting one.",ok:true},
          {t:"It doesn't matter more; all errors are equal.",ok:false},
          {t:"It only matters if a client notices.",ok:false}],
        fb:"Trust accounting errors carry regulatory weight beyond ordinary bookkeeping mistakes, since the money isn't the brokerage's to begin with. That's why the correction has to be airtight." },
      { q:"How do you prevent this specific error from recurring?",
        choices:[
          {t:"Add a check so EMD releases are recorded once, at the source, with a second-person review before month-end close.",ok:true},
          {t:"Do nothing differently; it was a one-time mistake.",ok:false},
          {t:"Stop reconciling trust accounts monthly to avoid finding more issues.",ok:false}],
        fb:"A second-person review at the point of entry is what catches duplicate or missing entries before they become a month-end surprise." }
    ]
  },
  { id:"vendorinvoice", cat:"CFO / Bookkeeper", role:"CFO / Bookkeeper",
    title:"The disputed vendor invoice",
    context:"A pest inspection vendor sends a $340 invoice for a report the file shows was never actually ordered for that address. The vendor insists it's correct and wants payment within 10 days.",
    steps:[
      { q:"What's the right first step before paying or disputing?",
        choices:[
          {t:"Pull the file records and confirm whether the service was actually ordered and delivered for that address.",ok:true},
          {t:"Pay it to avoid vendor conflict; $340 is small.",ok:false},
          {t:"Refuse to pay without checking anything first.",ok:false}],
        fb:"Before you pay or refuse, verify against your own records. Small invoices add up, and 'just pay it' is how billing errors go unnoticed for years." },
      { q:"Your file shows the report was ordered for a different property with a similar address. What does that tell you?",
        choices:[
          {t:"This is likely an address mix-up on the vendor's side, not a fraudulent charge. Worth a factual correction, not an accusation.",ok:true},
          {t:"The vendor is trying to scam the company.",ok:false},
          {t:"It's unresolvable; just split the difference.",ok:false}],
        fb:"Address mix-ups on multi-property vendors are common and usually innocent. Responding with the facts (not an accusation) resolves it faster and preserves the vendor relationship." },
      { q:"How do you communicate the discrepancy to the vendor?",
        choices:[
          {t:"Professionally point out the address mismatch with the correct file reference, and ask them to rebill the right property or correct the invoice.",ok:true},
          {t:"Ignore the invoice and hope they drop it.",ok:false},
          {t:"Pay it and quietly note the error internally without telling the vendor.",ok:false}],
        fb:"A clear, factual correction keeps the relationship professional and gets the invoice fixed at the source instead of creating a recurring accounting headache." },
      { q:"What should change in your AP process to catch this earlier next time?",
        choices:[
          {t:"Match every vendor invoice against the specific file/address before approving payment.",ok:true},
          {t:"Nothing; this was a one-off vendor mistake.",ok:false},
          {t:"Stop using vendors who submit any incorrect invoice.",ok:false}],
        fb:"A simple invoice-to-file match step at approval time catches address mix-ups and duplicate billing before they're paid, not after." }
    ]
  },
  { id:"budgetvariance", cat:"CFO / Bookkeeper", role:"CFO / Bookkeeper",
    title:"The quarterly budget variance",
    context:"Q1 revenue came in at $52,000 against a $45,000 budget (up 15.6%), but operating expenses hit $38,000 against a $35,000 budget (up 8.6%). Leadership wants a short explanation before the board meeting tomorrow.",
    steps:[
      { q:"What should the variance memo lead with?",
        choices:[
          {t:"The net picture: revenue beat budget by more than expenses did, so the quarter was net-positive overall.",ok:true},
          {t:"Only the expense overage, since that sounds more urgent.",ok:false},
          {t:"A long line-by-line list with no summary.",ok:false}],
        fb:"Leadership needs the headline first: despite both numbers moving, the quarter was net-favorable. Context before detail is what makes a variance memo useful under time pressure." },
      { q:"What's the most useful next section of the memo?",
        choices:[
          {t:"A brief driver of each variance: what specifically drove the revenue beat and the expense overage.",ok:true},
          {t:"A restatement of the budget numbers with no explanation.",ok:false},
          {t:"Recommendations for headcount cuts.",ok:false}],
        fb:"Naming the actual drivers (e.g., higher closed volume, or a one-time vendor cost) is what turns raw numbers into something leadership can act on." },
      { q:"The board will likely ask if the expense overage is a one-time event or an ongoing trend. How do you prepare for that?",
        choices:[
          {t:"Check whether the overage came from recurring costs or a one-time item, and have that answer ready before the meeting.",ok:true},
          {t:"Guess an answer if asked live.",ok:false},
          {t:"Avoid the topic and hope it doesn't come up.",ok:false}],
        fb:"Anticipating the obvious follow-up question and having the answer ready is what makes a CFO/bookkeeper look prepared rather than caught off guard." },
      { q:"What's the right length and tone for a memo going to the board?",
        choices:[
          {t:"Short (roughly 150-200 words), clear, and numbers-forward, since a board reads many of these.",ok:true},
          {t:"As long and detailed as possible to show thoroughness.",ok:false},
          {t:"Casual and conversational, since it's an internal team.",ok:false}],
        fb:"Board-level financial narratives are read fast and need to be scannable: a clear headline, the key drivers, and nothing extra." }
    ]
  },

  /* ===== OPERATIONS ===== */
  { id:"bottleneck", cat:"Operations", role:"Operations Manager",
    title:"The onboarding bottleneck",
    context:"Three new transaction coordinators started this month. Clients are complaining that file setup is slow, and two deadlines were nearly missed. Your senior TCs are spending hours answering the same setup questions.",
    steps:[
      { q:"What's the highest-leverage first move?",
        choices:[
          {t:"Document the intake process as a step-by-step SOP so new TCs stop relying on tribal knowledge.",ok:true},
          {t:"Tell the new TCs to work faster.",ok:false},
          {t:"Reassign all new files to senior TCs indefinitely.",ok:false}],
        fb:"Recurring questions signal a missing SOP. Capturing the intake process once removes the bottleneck for every future hire." },
      { q:"Deadlines were nearly missed. What system change protects against that?",
        choices:[
          {t:"A standardized deadline-calendar template applied at file setup, with automated reminders.",ok:true},
          {t:"Hope the agents remind everyone.",ok:false},
          {t:"Add a rule that no one takes vacation.",ok:false}],
        fb:"Critical dates can't depend on memory. A templated deadline calendar plus reminders makes compliance the default, not a heroic effect." },
      { q:"You're measuring whether the fix worked. Which metric matters most?",
        choices:[
          {t:"Time-to-file-setup and on-time deadline compliance rate.",ok:true},
          {t:"Number of emails sent per TC.",ok:false},
          {t:"How late people stay online.",ok:false}],
        fb:"Measure the outcome (setup speed and deadline compliance), not activity. Activity metrics reward busyness, not results." },
      { q:"A senior TC is now at 130% capacity. What's the responsible call?",
        choices:[
          {t:"Rebalance workload using a capacity view before quality or wellbeing slips.",ok:true},
          {t:"Pile on more; they're your best person.",ok:false},
          {t:"Ignore it until something breaks.",ok:false}],
        fb:"Sustained overallocation is how you lose your best people and your quality. A capacity plan lets you rebalance before burnout, not after." }
    ]
  },

  { id:"complianceaudit", cat:"Operations", role:"Operations Manager",
    title:"The compliance checklist gap",
    context:"A client audit finds that two recent closing files were missing signed disclosure forms before being submitted to compliance. The brokerage's own submission checklist (used for every ratified contract) should have caught this.",
    steps:[
      { q:"What's the first question to answer before assigning blame?",
        choices:[
          {t:"Was the checklist actually followed for these files, or is the checklist itself missing a step?",ok:true},
          {t:"Who do we discipline first?",ok:false},
          {t:"How do we keep this quiet from the client?",ok:false}],
        fb:"You need to know if this is a process gap (checklist doesn't cover it) or an execution gap (checklist wasn't followed) before you can actually fix it." },
      { q:"You find the checklist does include the disclosure step, but it was skipped both times by different TCs. What does that suggest?",
        choices:[
          {t:"A process compliance issue, not a one-off. Worth a spot-check habit or a required sign-off, not just a reminder.",ok:true},
          {t:"Just bad luck; no action needed.",ok:false},
          {t:"The checklist should be removed since it isn't working.",ok:false}],
        fb:"Two different people skipping the same step points to a systemic gap in enforcement, not two isolated mistakes. The fix is a stronger checkpoint, not blame or abandoning the process." },
      { q:"What's a low-friction way to add a real checkpoint without slowing every file down?",
        choices:[
          {t:"A required sign-off field on the submission checklist that a second person spot-checks before compliance submission.",ok:true},
          {t:"Require the operations manager to personally review every file line by line.",ok:false},
          {t:"Add five new forms to fill out per file.",ok:false}],
        fb:"A single required sign-off/spot-check step adds real accountability without creating a heavy new process that nobody will actually follow." },
      { q:"How do you communicate this fix to the team without it feeling like punishment?",
        choices:[
          {t:"Frame it as protecting the team and the client, walk through the specific change, and thank people for flagging the original gap.",ok:true},
          {t:"Send a stern warning email to everyone.",ok:false},
          {t:"Say nothing and just quietly change the checklist.",ok:false}],
        fb:"Process fixes land better when the team understands the 'why' and feels like partners in the solution, not suspects in an investigation." }
    ]
  },
  { id:"clientescalation", cat:"Operations", role:"Operations Manager",
    title:"The unhappy client escalation",
    context:"A client emails you directly (skipping their usual TC) saying they're 'considering ending the contract' because two status updates were late this month and one email had the wrong closing date in it.",
    steps:[
      { q:"What's your first response step?",
        choices:[
          {t:"Acknowledge the client's frustration directly and commit to a specific follow-up time, without waiting to fully investigate first.",ok:true},
          {t:"Forward the email to the TC and wait for them to respond.",ok:false},
          {t:"Defend the TC's performance immediately before hearing more.",ok:false}],
        fb:"An escalated, upset client needs to feel heard fast. A same-day acknowledgment with a concrete next step buys you time to actually investigate properly." },
      { q:"You confirm the wrong closing date was a genuine copy-paste error from an old template. How do you explain it to the client?",
        choices:[
          {t:"Own the mistake plainly, explain the specific fix (template correction), and confirm the real closing date clearly.",ok:true},
          {t:"Blame the TC by name to the client.",ok:false},
          {t:"Avoid mentioning it was an error at all.",ok:false}],
        fb:"Clients respect a direct, specific accountability ('here's what happened, here's the fix') far more than vague reassurance or finger-pointing." },
      { q:"The TC feels blindsided that the client went over their head. How do you handle that internally?",
        choices:[
          {t:"Loop the TC in on what was said, coach on the root cause, and reinforce they're not being replaced on the file.",ok:true},
          {t:"Let the TC find out only from the client.",ok:false},
          {t:"Remove the TC from the file without explanation.",ok:false}],
        fb:"Protecting the client relationship doesn't mean throwing the TC under the bus. A transparent internal conversation keeps trust on both sides." },
      { q:"How do you prevent this specific client from escalating again?",
        choices:[
          {t:"Set a proactive check-in cadence with this client specifically, given the trust was already shaken.",ok:true},
          {t:"Assume the apology fixed everything permanently.",ok:false},
          {t:"Avoid contacting the client again until they reach out.",ok:false}],
        fb:"A client who already escalated once needs a slightly higher-touch cadence for a while to rebuild confidence, not a return to the exact same routine that led here." }
    ]
  },
  { id:"perfreview", cat:"Operations", role:"Operations Manager",
    title:"The underperforming new hire",
    context:"A TC hired 60 days ago is missing small deadlines and needs frequent hand-holding on tasks other new hires picked up by now. Their client feedback is polite but lukewarm.",
    steps:[
      { q:"Before the 90-day review, what's the most useful thing to do first?",
        choices:[
          {t:"Look for a specific pattern (which tasks, which deadlines) rather than a vague sense that things are 'off.'",ok:true},
          {t:"Decide now whether to extend or end their employment.",ok:false},
          {t:"Assume it's just a slow learner and wait it out silently.",ok:false}],
        fb:"Specific patterns (e.g. always missing the same type of deadline) are coachable. A vague 'not performing' impression isn't something anyone can act on." },
      { q:"You find they consistently miss deadline reminders that live in a shared calendar they were never walked through properly. What does this tell you?",
        choices:[
          {t:"Part of this may be an onboarding gap, not purely a performance issue. Worth addressing both.",ok:true},
          {t:"It's entirely their fault; move straight to a warning.",ok:false},
          {t:"It's not worth investigating further.",ok:false}],
        fb:"If onboarding genuinely missed a step, it's fair (and more effective) to fix that gap alongside any individual coaching, rather than treating it as pure underperformance." },
      { q:"How do you structure the 90-day conversation?",
        choices:[
          {t:"Specific examples, the onboarding gap you found, clear expectations going forward, and a defined check-in point.",ok:true},
          {t:"A general 'try harder' message.",ok:false},
          {t:"Only positive comments to avoid discomfort.",ok:false}],
        fb:"A useful review is concrete: what happened, what changes, and when you'll check again. Vague positivity or vague criticism both fail to change behavior." },
      { q:"Client feedback stays lukewarm even after 30 more days of coaching. What's the responsible next step?",
        choices:[
          {t:"Have a direct conversation about fit, informed by the coaching already given and documented.",ok:true},
          {t:"Keep extending indefinitely without a new conversation.",ok:false},
          {t:"Let the client complain their way into a decision for you.",ok:false}],
        fb:"After genuine, documented coaching doesn't move the needle, it's time for a direct conversation about role fit rather than an open-ended wait." }
    ]
  },

  /* ===== LEAD MANAGER ===== */
  { id:"speedtolead", cat:"Lead Manager", role:"Lead Manager",
    title:"Speed-to-lead at 9pm",
    context:"A new buyer lead fills out a home-valuation form on the website at 9:07pm: 'Curious what my condo is worth, might sell in the spring.' You're the lead manager on call.",
    steps:[
      { q:"When should you make first contact?",
        choices:[
          {t:"Within a few minutes; speed-to-lead dramatically raises contact and conversion rates.",ok:true},
          {t:"Tomorrow afternoon, during business hours.",ok:false},
          {t:"In about a week, so you don't seem desperate.",ok:false}],
        fb:"Lead conversion drops sharply with every hour of delay. A fast, low-pressure first touch wins the response, even after hours." },
      { q:"What's the right first-touch approach for a 'might sell in spring' lead?",
        choices:[
          {t:"A short, helpful text and email offering the valuation and a no-pressure conversation.",ok:true},
          {t:"A hard push to list immediately.",ok:false},
          {t:"A 600-word email with the full market report attached.",ok:false}],
        fb:"Match the lead's temperature. They asked a soft question, so respond with a soft, helpful touch and an easy next step." },
      { q:"They reply that they're 'just researching.' What's the goal now?",
        choices:[
          {t:"Qualify gently (timeline, motivation, whether they'll buy next) and add them to a nurture sequence.",ok:true},
          {t:"Mark the lead dead and move on.",ok:false},
          {t:"Call five times in a row to force a decision.",ok:false}],
        fb:"A spring seller is a real future client. Qualify lightly, capture the details in the CRM, and nurture until they're ready." },
      { q:"How should this lead be handed to an agent?",
        choices:[
          {t:"With a clean CRM note: summary, timeline, motivation, and next follow-up date.",ok:true},
          {t:"Just forward the raw web-form email.",ok:false},
          {t:"Verbally, with no written record.",ok:false}],
        fb:"A structured handoff (summary, key details, next steps, follow-up date) is what makes the agent's job easy and the lead well-served." }
    ]
  },

  { id:"relolead", cat:"Lead Manager", role:"Lead Manager",
    title:"The sell-and-buy relocation lead",
    context:"A lead calls: they've accepted a job offer in another state and need to sell their current home and buy in the new city within roughly 90 days. They sound stressed and unsure where to start.",
    steps:[
      { q:"What's the highest-priority information to capture first?",
        choices:[
          {t:"Their hard deadline (start date), current home details, and whether they need the sale proceeds to fund the purchase.",ok:true},
          {t:"Just their name and phone number for the CRM.",ok:false},
          {t:"Their favorite neighborhoods in the new city.",ok:false}],
        fb:"A relocation lead is timeline-driven and often financially linked (sale funds the purchase). Capturing the deadline and the sale-to-buy dependency shapes everything that follows." },
      { q:"They mention needing an agent in both the current and destination city. What's the right handoff?",
        choices:[
          {t:"Connect them with a listing agent locally and, if VOOV has a referral network, a vetted agent in the destination city.",ok:true},
          {t:"Tell them to find their own agent out of state.",ok:false},
          {t:"Only help with the local sale and drop the rest of the request.",ok:false}],
        fb:"A relocation lead is really two leads in one. A full-service handoff (or referral) on both ends keeps the client and captures the full opportunity." },
      { q:"How do you note this in the CRM so nothing falls through?",
        choices:[
          {t:"A dual-sided record: sale timeline, purchase timeline, dependency between them, and both agent assignments.",ok:true},
          {t:"A single generic 'buyer lead' note.",ok:false},
          {t:"No note; it's memorable enough.",ok:false}],
        fb:"Relocation leads have moving parts across two transactions. A structured, dual-sided CRM note is what keeps both sides coordinated instead of dropped." },
      { q:"Three weeks pass with no update from either agent. What do you do?",
        choices:[
          {t:"Proactively check in with both agents and the client to confirm timelines are still on track.",ok:true},
          {t:"Assume no news is good news.",ok:false},
          {t:"Wait for the client to complain first.",ok:false}],
        fb:"On a deadline-driven relocation, silence is a risk, not a good sign. A lead manager proactively checks the pulse rather than waiting to be told there's a problem." }
    ]
  },
  { id:"coldnurture", cat:"Lead Manager", role:"Lead Manager",
    title:"The lead that went cold",
    context:"A promising buyer lead was responsive for two weeks, then went silent after you sent a list of 5 homes. It's been 10 days with no reply to two follow-ups.",
    steps:[
      { q:"What's the right read on this silence?",
        choices:[
          {t:"They may have gone quiet for a reason unrelated to interest (life got busy, found another agent, or the listings didn't fit). Don't assume they're gone.",ok:true},
          {t:"They're definitely not interested anymore; remove them from the pipeline.",ok:false},
          {t:"Keep sending the exact same follow-up daily until they respond.",ok:false}],
        fb:"Silence has many causes. Marking a lead dead too early or spamming them are both mistakes; the goal is a pattern change, not more of the same message." },
      { q:"What's a better third follow-up than repeating 'just checking in'?",
        choices:[
          {t:"A specific, low-effort question tied to something concrete, like one new listing or a market update relevant to their search.",ok:true},
          {t:"The exact same message as before.",ok:false},
          {t:"A guilt-trip about not responding.",ok:false}],
        fb:"A fresh, specific hook (one relevant listing, one useful fact) is far easier to reply to than a generic check-in, and doesn't read as nagging." },
      { q:"Still no response after the new approach. What's the right cadence going forward?",
        choices:[
          {t:"Move them to a longer-term nurture sequence (monthly market touches) instead of frequent follow-ups.",ok:true},
          {t:"Keep messaging weekly indefinitely at the same intensity.",ok:false},
          {t:"Delete the lead from the CRM entirely.",ok:false}],
        fb:"A cold-but-not-dead lead belongs in a lower-frequency nurture track. That keeps the door open without burning goodwill or your own time." },
      { q:"Two months later they reply: 'Sorry, got busy, still looking.' What's the ideal next move?",
        choices:[
          {t:"Re-qualify briefly (timeline, must-haves) since their situation may have changed, then re-engage an agent if it's still active.",ok:true},
          {t:"Immediately resend the same 5 homes from two months ago.",ok:false},
          {t:"Assume nothing has changed and skip straight to scheduling showings.",ok:false}],
        fb:"After a long gap, a quick re-qualification protects everyone's time. Needs, budget, and timeline can all shift in two months." }
    ]
  },
  { id:"duplead", cat:"Lead Manager", role:"Lead Manager",
    title:"The duplicate lead mess",
    context:"You notice the same person appears in the CRM three times under slightly different name spellings and phone numbers, each with different notes from different intake forms. An agent is about to call one version, unaware of the history in the others.",
    steps:[
      { q:"What's the risk if this goes uncorrected?",
        choices:[
          {t:"The agent could contradict a prior conversation, annoying the lead and looking disorganized.",ok:true},
          {t:"There's no real risk; extra records don't matter.",ok:false},
          {t:"It only affects reporting, not the client experience.",ok:false}],
        fb:"Duplicate records create real client-facing risk: repeated questions, inconsistent info, and a lead who feels like nobody is tracking them." },
      { q:"What's the right way to consolidate the three records?",
        choices:[
          {t:"Merge into one record, keeping the most complete and recent notes, and verify the correct contact info with the lead if unsure.",ok:true},
          {t:"Delete two at random to save time.",ok:false},
          {t:"Leave all three and just tell the agent to 'be careful.'",ok:false}],
        fb:"A deliberate merge that preserves history is the only way to give the agent (and the next person) one accurate picture instead of three partial ones." },
      { q:"How do you prevent this from happening again?",
        choices:[
          {t:"Flag it as a process gap and suggest a duplicate-check step whenever a new lead is entered.",ok:true},
          {t:"Assume it was a one-time fluke.",ok:false},
          {t:"Blame whoever entered the third record.",ok:false}],
        fb:"One duplicate is a data-entry slip; a recurring pattern is a process gap. Building in a duplicate check protects data quality going forward." },
      { q:"The agent already called the wrong version and gave outdated information. What's the recovery step?",
        choices:[
          {t:"Give the agent the merged, accurate picture immediately so they can follow up and correct course with the lead.",ok:true},
          {t:"Let it go since the call already happened.",ok:false},
          {t:"Avoid telling the agent so they don't feel bad.",ok:false}],
        fb:"The fastest fix is getting the agent the correct picture right away so they can smooth things over, rather than letting a bad first impression sit." }
    ]
  },

  /* ===== LEASING ===== */
  { id:"leasing", cat:"Leasing Coordinator", role:"Leasing Coordinator",
    title:"The rental application",
    context:"You're processing applications for a 2-bedroom unit at $1,850/month. One applicant earns $4,900/month, has fair credit, and a family with two young children. The owner casually mentions they'd 'prefer a quiet tenant without kids.'",
    steps:[
      { q:"The owner's preference 'without kids' — how do you handle it?",
        choices:[
          {t:"Politely explain that familial status is a protected class; you cannot screen on it.",ok:true},
          {t:"Quietly deny the family to keep the owner happy.",ok:false},
          {t:"Add a 'no children' line to the listing.",ok:false}],
        fb:"Familial status is protected under the Fair Housing Act. Screening or steering based on children is illegal, and you protect the owner by refusing to do it." },
      { q:"Does this applicant meet a standard income test for $1,850 rent?",
        choices:[
          {t:"Yes; $4,900/month easily clears a standard 3x-rent requirement.",ok:false},
          {t:"Not quite; 3x rent is $5,550, so at $4,900 (about 2.6x) they fall short, apply the policy consistently.",ok:true},
          {t:"Income doesn't matter if credit is fair.",ok:false}],
        fb:"$1,850 × 3 = $5,550. At $4,900 the applicant is about 2.6x, under a standard 3x policy. The key is applying the same written criteria to every applicant." },
      { q:"You decline based on the income ratio. What does the notice look like?",
        choices:[
          {t:"A brief, consistent adverse-action notice citing the income criterion, applied the same way for everyone.",ok:true},
          {t:"A detailed letter listing everything about the applicant.",ok:false},
          {t:"No notice; just stop responding.",ok:false}],
        fb:"Keep declines brief, factual, and consistent, and follow adverse-action requirements. Consistency is your best protection against a fair-housing complaint." }
    ]
  },

  { id:"leasemaint", cat:"Leasing Coordinator", role:"Leasing Coordinator",
    title:"The maintenance dispute",
    context:"A tenant emails, furious: the AC has been out for 4 days in July, the owner isn't responding, and the tenant is threatening to withhold rent. You coordinate leasing and light property-management issues.",
    steps:[
      { q:"What's your first move on receiving this email?",
        choices:[
          {t:"Acknowledge the tenant same-day, confirm the AC issue is logged, and escalate to the owner/vendor immediately.",ok:true},
          {t:"Wait for the owner to respond on their own schedule.",ok:false},
          {t:"Tell the tenant that's not your department.",ok:false}],
        fb:"A no-AC-in-July call is urgent and often a habitability issue. Acknowledge fast and escalate; silence is what turns a maintenance ticket into a legal problem." },
      { q:"The tenant says they'll 'just stop paying rent until it's fixed.' What do you tell them?",
        choices:[
          {t:"Explain that withholding rent can violate the lease and put them at risk, and give a firm repair timeline instead.",ok:true},
          {t:"Agree that's a fair response.",ok:false},
          {t:"Threaten eviction immediately.",ok:false}],
        fb:"Rent withholding rules vary by state and can backfire on the tenant. Redirect the energy into a concrete fix timeline rather than confirming or threatening." },
      { q:"The owner is slow to authorize a repair vendor. What's the right escalation?",
        choices:[
          {t:"Document the timeline in writing and escalate to the owner with the habitability/urgency risk spelled out.",ok:true},
          {t:"Send a vendor without any owner authorization.",ok:false},
          {t:"Stop responding to the tenant until the owner replies.",ok:false}],
        fb:"You need authorization before dispatching a vendor, but you also need a paper trail showing you pushed. Silence from the owner is not silence from you to the tenant." },
      { q:"The AC is fixed on day 6. How do you close the loop?",
        choices:[
          {t:"Confirm the repair with the tenant in writing and note the resolution and timeline in the file for future reference.",ok:true},
          {t:"Consider it done with no follow-up.",ok:false},
          {t:"Only tell the owner, not the tenant.",ok:false}],
        fb:"Closing the loop in writing protects everyone if the issue resurfaces, and shows the tenant their concern was taken seriously." }
    ]
  },
  { id:"leaserenewal", cat:"Leasing Coordinator", role:"Leasing Coordinator",
    title:"The renewal pushback",
    context:"A good tenant's lease expires in 60 days. Market rent has risen, so the owner wants to raise their $1,850/month to $2,100. The tenant calls upset, saying they can't afford a $250 jump and might just leave.",
    steps:[
      { q:"How do you open the renewal conversation?",
        choices:[
          {t:"Acknowledge their tenancy and concern, then explain the increase is based on current market comps, not a penalty.",ok:true},
          {t:"Tell them the owner's decision is final and hang up.",ok:false},
          {t:"Promise to keep rent the same without asking the owner.",ok:false}],
        fb:"Good-tenant retention starts with acknowledging the relationship, then grounding the number in market data so it doesn't feel arbitrary." },
      { q:"The tenant asks if there's any flexibility. What's the appropriate next step?",
        choices:[
          {t:"Take the request to the owner with the tenant's payment history and ask if a smaller increase or longer term is workable.",ok:true},
          {t:"Say no immediately since you don't set the price.",ok:false},
          {t:"Offer a discount on your own authority.",ok:false}],
        fb:"You're the coordinator, not the decision-maker on price, but a good payment history is real leverage. Bring the case back to the owner rather than deciding or refusing on the spot." },
      { q:"The owner agrees to $2,000 with a 13-month term. How do you formalize it?",
        choices:[
          {t:"Send a written renewal offer with the new rent, term, and effective date, and set a response deadline.",ok:true},
          {t:"Consider it done after a verbal yes on the phone.",ok:false},
          {t:"Let the old lease auto-continue at the new price without paperwork.",ok:false}],
        fb:"Every renewal term change needs to be in writing with a clear deadline; verbal agreements aren't enforceable and create confusion later." },
      { q:"The tenant signs but asks to move their due date from the 1st to the 5th. What do you do?",
        choices:[
          {t:"Confirm whether the owner allows due-date changes, then document it as an addendum if approved.",ok:true},
          {t:"Just agree since it's a small request.",ok:false},
          {t:"Refuse without checking, since leases never change.",ok:false}],
        fb:"Even small term changes need owner approval and a written addendum. Assuming either way (agree or refuse) without checking creates inconsistency across your portfolio." }
    ]
  },
  { id:"movedeposit", cat:"Leasing Coordinator", role:"Leasing Coordinator",
    title:"The security deposit dispute",
    context:"A tenant moved out after 18 months. The move-out inspection shows carpet stains and a broken blind. The owner wants to deduct $650 from the $1,850 deposit. The tenant is disputing the carpet charge, saying it was already stained at move-in.",
    steps:[
      { q:"What's the first thing you check before approving any deduction?",
        choices:[
          {t:"The move-in inspection report/photos to see if the carpet condition was already documented.",ok:true},
          {t:"Just trust the owner's word on move-in condition.",ok:false},
          {t:"Deny the tenant's claim without checking records.",ok:false}],
        fb:"Move-in documentation is exactly what resolves this kind of dispute. If the stain was noted at move-in, that charge doesn't hold; if it wasn't, the owner has a stronger case." },
      { q:"The move-in report has no mention of carpet stains. What does that mean for the deduction?",
        choices:[
          {t:"The carpet damage deduction is weak without move-in evidence; only the blind replacement is clearly supportable.",ok:true},
          {t:"It doesn't matter; charge the tenant anyway.",ok:false},
          {t:"Automatically return the full deposit with no deductions.",ok:false}],
        fb:"Without move-in evidence of pre-existing damage, deducting for it is hard to defend if challenged. The documented blind damage stands on its own." },
      { q:"How do you communicate the itemized deposit return to the tenant?",
        choices:[
          {t:"Send a written itemized statement showing what's deducted, what's returned, and why, within your state's required timeframe.",ok:true},
          {t:"Just mail a check with no explanation.",ok:false},
          {t:"Wait until the tenant complains again to explain anything.",ok:false}],
        fb:"Deposit return laws generally require an itemized, written accounting within a set number of days. Being proactive here avoids a second dispute or a legal complaint." },
      { q:"The tenant still disagrees with the blind deduction. What's the appropriate next step?",
        choices:[
          {t:"Provide the photo evidence and repair invoice, and note that small claims is the venue for further dispute.",ok:true},
          {t:"Refund everything just to end the conversation.",ok:false},
          {t:"Stop responding to the tenant.",ok:false}],
        fb:"When you have real documentation, share it and be clear about next steps. You don't need to keep negotiating past that point, but you do need to stay responsive and professional." }
    ]
  },

  /* ===== ADMIN / SOCIAL ===== */
  { id:"listinglaunch", cat:"Admin & Social", role:"Admin & Social Media",
    title:"The listing launch",
    context:"A new luxury listing goes live Friday. The agent wants MLS entry, photography coordinated, social posts, and an email to the past-client list, all ready to go.",
    steps:[
      { q:"What has to be true before you publish the MLS listing?",
        choices:[
          {t:"Accurate required fields and the seller's signed listing agreement and disclosures are in place.",ok:true},
          {t:"Just the price and a photo.",ok:false},
          {t:"Nothing; you can fix details after it's live.",ok:false}],
        fb:"Publishing before the listing agreement and required data are in place creates compliance and accuracy problems. Verify first, publish once." },
      { q:"For the public MLS remarks and social captions, what do you avoid?",
        choices:[
          {t:"Fair-housing-sensitive language and any agent contact info in public remarks.",ok:true},
          {t:"Mentioning the number of bedrooms.",ok:false},
          {t:"Describing the kitchen finishes.",ok:false}],
        fb:"Describe the property, not the ideal buyer. Avoid language that signals a preferred demographic, and keep contact details out of public MLS remarks." },
      { q:"The agent asks for three Instagram captions. What's the strongest prompt to give Claude?",
        choices:[
          {t:"Specify the property, price, three distinct tones, and a hashtag count, plus 'avoid fair-housing-sensitive language.'",ok:true},
          {t:"'Write some captions.'",ok:false},
          {t:"'Make it go viral.'",ok:false}],
        fb:"A strong prompt names the property, the price, the tones you want, the format, and the compliance guardrail. Vague prompts produce vague captions." }
    ]
  }
];

/* ---------- PROMPT-PRACTICE SANDBOX ---------- */
const PROMPTS = [
  { role:"Transaction Coordinator", task:"Draft a welcome email for the Texas buyers (Marcus Halloran & Priya Anand) on 2931 McDonough Way, opening the Option Period.",
    weak:"Write a welcome email to the buyer.",
    strong:"You are an experienced Texas real estate transaction coordinator at VOOV. Draft a professional welcome email to the buyers, Marcus Halloran and Priya Anand, for their executed contract on 2931 McDonough Way, Katy, TX 77494. Include their action items: Option Fee $300 and Earnest Money $3,535 due to the title company within 3 business days, and a reminder to schedule the home inspection during the 7-day Option Period. Warm, professional tone with a subject line.",
    why:"The strong prompt gives Claude a role, the exact deal facts, the specific action items with amounts and deadlines, and a format. That's the difference between a generic note and a send-ready email." },
  { role:"Transaction Coordinator", task:"Summarize the California RPA key terms for the file.",
    weak:"Summarize this contract.",
    strong:"Summarize the key terms of this California Residential Purchase Agreement in plain English for our transaction file. Extract: purchase price, all-cash vs financed, acceptance date, inspection contingency deadline, loan contingency deadline, disclosure delivery deadline, and any unusual clauses. Present as a clean bulleted list. [Paste RPA text]",
    why:"Naming the exact fields you need, and the output format, stops Claude from giving a vague paragraph and gets you a usable file summary." },
  { role:"CFO / Bookkeeper", task:"Draft a commission disbursement summary for the closed Texas deal.",
    weak:"Write up the commission.",
    strong:"You are a bookkeeper for a real estate brokerage. Draft a clear commission disbursement summary for a closed transaction. Gross commission to the brokerage: $11,697. Agent split: 80/20. Deductions: $250 transaction fee and $400 E&O. Show the gross, the split, each deduction, the agent's net, and the brokerage's retained amount as a simple table, and note the agent is a 1099 independent contractor.",
    why:"It supplies the real numbers, the split, the deductions, and the output format, so Claude returns an accurate, review-ready breakdown rather than a vague paragraph." },
  { role:"CFO / Bookkeeper", task:"Explain trust-account reconciliation to a new bookkeeper.",
    weak:"Explain trust accounts.",
    strong:"Explain, in plain English for a brand-new real estate bookkeeper, what a broker trust (escrow) account is, why earnest money held in it must never be commingled with operating funds, and the month-end steps to reconcile it. Keep it to a short numbered list with one cautionary note about license-law risk.",
    why:"The role context, the specific concept, and the requested structure produce a focused training explanation instead of a generic finance lecture." },
  { role:"Operations Manager", task:"Turn three known bottlenecks into an action plan.",
    weak:"How do we fix our process?",
    strong:"You are an operations manager at a real estate virtual staffing company. I have 3 bottlenecks: (1) agents slow to respond to document requests, (2) title companies miss deadline reminders, (3) new TCs take too long to learn intake. For each, give 3 specific, low-cost solutions a fully remote team could implement this month. Format as a table: Bottleneck, Solution, Owner.",
    why:"Specifying the role, the exact bottlenecks, the constraint (remote, low-cost, this month), and a table format turns a vague ask into an action plan you can assign." },
  { role:"Lead Manager", task:"Re-engage a cold lead by text after 3 days of silence.",
    weak:"Write a follow up text.",
    strong:"Write a follow-up text message for a real estate lead who hasn't responded in 3 days. Keep it under 160 characters, friendly and low-pressure, with a soft question that invites a reply. No emojis.",
    why:"Channel constraints matter. Giving the character limit, tone, and a soft-question goal produces something you can actually send, not a paragraph that won't fit an SMS." },
  { role:"Leasing Coordinator", task:"Politely deny a rental application for insufficient income.",
    weak:"Write a denial letter.",
    strong:"Write a professional, compliant rental-application denial letter. Reason: insufficient income (the applicant did not meet the 3x monthly rent requirement). Be polite and respectful, do not elaborate on specifics beyond the income requirement, and keep it to one short paragraph. Neutral, courteous tone.",
    why:"Denials carry fair-housing risk. The strong prompt constrains scope (do not elaborate), states the single reason, and sets tone, keeping the letter consistent and defensible." },
  { role:"Admin & Social Media", task:"Write public MLS remarks for the Virginia listing.",
    weak:"Write a listing description.",
    strong:"Write public MLS remarks for a Virginia Beach listing in under 400 characters. Highlight the Timberlake community, the open layout, and proximity to schools and shopping. Use an inviting, professional tone, avoid any fair-housing-sensitive language, and do not include agent contact information.",
    why:"It sets the length, the features to feature, the tone, and the two compliance guardrails, producing remarks you can paste straight into the MLS." }
];

/* ---------- TIMED QUIZ ---------- */
const QUIZ = [
  {q:"In Texas, what does the Option Fee buy the buyer?",a:["The unrestricted right to terminate within a set number of days","A discount on the purchase price","Title insurance","A free appraisal"],c:0},
  {q:"How fast must earnest money reach the title company in Texas?",a:["Within 3 business days of execution","Within 30 days","At closing","Within 24 hours"],c:0},
  {q:"In California, the seller must deliver the TDS, SPQ and NHD within…",a:["7 days","24 hours","30 days","At closing"],c:0},
  {q:"California's default inspection contingency period is…",a:["17 days","3 days","45 days","10 days"],c:0},
  {q:"How are California contingencies removed?",a:["Actively, in writing (CR form)","Automatically when the period ends","By the escrow officer","They can't be removed"],c:0},
  {q:"In Virginia, all contract timelines flow from…",a:["The ratification date (last party signs)","The listing date","The closing date","The inspection date"],c:0},
  {q:"For a Virginia CIC/POA property, the buyer's resale-certificate review period is…",a:["3 days after receipt (may cancel)","30 days","No review period","Until closing"],c:0},
  {q:"In New York, when does a deal become binding?",a:["When both attorneys exchange fully signed contracts","When the offer is accepted","When earnest money is paid","At the final walkthrough"],c:0},
  {q:"A financed buyer must receive the Closing Disclosure…",a:["At least 3 business days before closing","On closing day","After closing","Within 7 days of contract"],c:0},
  {q:"A last-minute change to wire instructions by email should be treated as…",a:["A likely fraud attempt, verified by phone on a known number","Routine, just forward it to the buyer","Confirmed if the buyer is copied","Valid if it looks official"],c:0},
  {q:"When an appraisal comes in below the contract price, a TC should…",a:["Present the options neutrally and document any renegotiation in an amendment","Tell the buyer to walk","Ask the appraiser to raise the value","Hide it from the seller"],c:0},
  {q:"A broker's trust (escrow) account must be…",a:["Reconciled separately and never commingled with operating funds","Combined with operating funds for simplicity","Ignored after a deal closes","Used to pay office rent"],c:0},
  {q:"Real estate agents are usually paid and reported as…",a:["1099 independent contractors","W-2 employees with withholding","Cash, untaxed","Salaried staff"],c:0},
  {q:"A Commission Disbursement Authorization (CDA) is sent to…",a:["The title/escrow company, to pay the brokerage at closing","The buyer, to collect funds","The MLS","The appraiser"],c:0},
  {q:"Under the Fair Housing Act, you may NOT screen tenants based on…",a:["Familial status (e.g., having children)","Verified income","Consistent credit criteria","Completed application"],c:0},
  {q:"The biggest driver of online lead conversion is…",a:["Speed of first contact","Length of the first email","Time of day you email","The lead's ZIP code"],c:0},
  {q:"Best practice when pasting a contract into Claude:",a:["Redact SSNs and bank/account numbers first","Paste everything as-is","Never paste contracts at all","Email it to Claude"],c:0},
  {q:"A strong prompt always includes…",a:["Role, task, details, and desired format","Only the task","A long backstory","The word please three times"],c:0}
];

/* ---------- DEADLINE-TRACKER DRILLS ---------- */
const DRILLS = {
  tx: {
    code:"TX", state:"Texas", deal:"2931 McDonough Way, Katy",
    start:"2024-11-04", startLabel:"Contract Effective Date: Monday, Nov 4, 2024",
    rows:[
      {id:"emd", label:"Earnest Money + Option Fee due to title company", rule:"Within 3 business days of the effective date", mode:"biz", n:3},
      {id:"opt", label:"Option Period expires", rule:"7 calendar days from the effective date", mode:"cal", n:7},
      {id:"cd",  label:"Closing Disclosure to financed buyer (closing Dec 6)", rule:"At least 3 business days before closing", mode:"bizBefore", n:3, ref:"2024-12-06"}
    ]
  },
  ca: {
    code:"CA", state:"California", deal:"139 S Edinburgh Ave, Los Angeles",
    start:"2025-04-28", startLabel:"Offer Accepted: Monday, Apr 28, 2025",
    rows:[
      {id:"emd",  label:"EMD due to escrow", rule:"Within 3 business days of acceptance", mode:"biz", n:3},
      {id:"disc", label:"Seller delivers TDS / SPQ / NHD", rule:"Within 7 calendar days", mode:"cal", n:7},
      {id:"insp", label:"Inspection contingency removal", rule:"17 days (default)", mode:"cal", n:17},
      {id:"loan", label:"Loan contingency removal", rule:"21 days (default)", mode:"cal", n:21}
    ]
  },
  va: {
    code:"VA", state:"Virginia", deal:"4232 Maplehurst Road, Virginia Beach",
    start:"2026-01-14", startLabel:"Ratification Date: Wednesday, Jan 14, 2026",
    rows:[
      {id:"emd",  label:"Earnest Money Deposit to Escrow Agent", rule:"Within 3 business days of ratification", mode:"biz", n:3},
      {id:"insp", label:"Home inspection contingency (PICRA) period", rule:"10 calendar days from ratification", mode:"cal", n:10},
      {id:"cd",   label:"Closing Disclosure to financed buyer (settlement Feb 11)", rule:"At least 3 business days before settlement", mode:"bizBefore", n:3, ref:"2026-02-11"}
    ]
  },
  ny: {
    code:"NY", state:"New York", deal:"15 Braintree Crescent, Penfield",
    start:"2026-03-02", startLabel:"Contracts Exchanged: Monday, Mar 2, 2026",
    rows:[
      {id:"mort", label:"Mortgage contingency deadline", rule:"60 calendar days (standard)", mode:"cal", n:60},
      {id:"walk", label:"Final walkthrough (target)", rule:"about 1 day before closing", mode:"cal", n:73},
      {id:"close",label:"Target closing (weekday)", rule:"about 74 days (60-90 day NY norm)", mode:"cal", n:74}
    ]
  }
};
