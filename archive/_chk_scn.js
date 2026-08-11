const SCENARIOS = [
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
        fb:"You can request a rebuttal/reconsideration with comparable sales, but you never pressure an appraiser. The real levers are price, cash, or a meet-in-the-middle." },
      { q:"The parties agree the seller drops to $381,000 and the buyer covers the rest. What do you need?",
        choices:[
          {t:"A signed amendment documenting the new price before proceeding.",ok:true},
          {t:"Just a text from the agents confirming.",ok:false},
          {t:"Nothing; the lender will adjust automatically.",ok:false}],
        fb:"Every renegotiated term needs a fully executed amendment in the file before the lender and title can update figures." }
    ]
  },
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
  { id:"leasing", cat:"Leasing Coordinator", role:"Leasing Coordinator",
    title:"The rental application",
    context:"You're processing applications for a 2-bedroom unit at $1,850/month. One applicant earns $4,900/month, has fair credit, and a family with two young children. The owner casually mentions they'd 'prefer a quiet tenant without kids.'",
    steps:[
      { q:"The owner's preference 'without kids' — how do you handle it?",
        choices:[
          {t:"Politely explain that familial status is a protected class; you cannot screen on it.",ok:true},
          {t:"Quietly deny the family to keep the owner happy.",ok:false},
          {t:"Add a 'no children' line to the listing.",ok:false}],
        fb:"Familial status is protected under the Fair Housing Act." },
      { q:"Does this applicant meet a standard income test for $1,850 rent?",
        choices:[
          {t:"Yes; $4,900/month easily clears a standard 3x-rent requirement.",ok:false},
          {t:"Not quite; 3x rent is $5,550, so at $4,900 (about 2.6x) they fall short, apply the policy consistently.",ok:true},
          {t:"Income doesn't matter if credit is fair.",ok:false}],
        fb:"$1,850 × 3 = $5,550. At $4,900 the applicant is about 2.6x, under a standard 3x policy." },
      { q:"You decline based on the income ratio. What does the notice look like?",
        choices:[
          {t:"A brief, consistent adverse-action notice citing the income criterion, applied the same way for everyone.",ok:true},
          {t:"A detailed letter listing everything about the applicant.",ok:false},
          {t:"No notice; just stop responding.",ok:false}],
        fb:"Keep declines brief, factual, and consistent, and follow adverse-action requirements." }
    ]
  }
];
console.log("OK scenarios:",SCENARIOS.length,"steps:",SCENARIOS.reduce((a,s)=>a+s.steps.length,0));
