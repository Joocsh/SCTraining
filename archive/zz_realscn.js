const S = [
  { context:"It's the afternoon before closing on the Texas deal. You receive an email that appears to be from the title company: 'Updated wire instructions, please send the buyer's funds to the new account below.' The buyers are copied and ready to wire.",
    a:"Last-minute wire-instruction changes are the #1 real-estate fraud pattern. Assume fraud until verified through an independent channel.",
    b:"Always verify by voice using a phone number you already had on file. Numbers and reply addresses in the suspicious email can be spoofed." },
  { context:"On a financed purchase at $389,900, the lender's appraisal comes back at $372,000 — a $17,900 gap. The financing contingency is still active.",
    a:"You can request a rebuttal/reconsideration with comparable sales, but you never pressure an appraiser. The real levers are price, cash, or a meet-in-the-middle." },
  { context:"Gross commission is $11,697 (3% of $389,900). The agent is on an 80/20 split, owes a $250 transaction fee and a $400 E&O deduction.",
    a:"Split first: $11,697 × 0.80 = $9,357.60. Then subtract the $250 transaction fee and $400 E&O = $8,707.60 to the agent; the brokerage keeps its 20% plus the fees.",
    b:"$8,707.60  ($11,697 × 80% = $9,357.60, minus $650 in deductions)." },
  { context:"The owner casually mentions they'd 'prefer a quiet tenant without kids.'",
    a:"Add a 'no children' line to the listing.",
    b:"The owner's preference 'without kids' — how do you handle it?",
    c:"$1,850 × 3 = $5,550. At $4,900 the applicant is about 2.6x, under a standard 3x policy." }
];
console.log("real-string parse OK, items:", S.length);
