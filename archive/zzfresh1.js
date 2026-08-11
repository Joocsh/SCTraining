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
          {t:"Buyer brings extra cash to cover the difference