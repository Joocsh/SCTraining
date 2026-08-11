/* ================================================================
   LEAD MANAGER: FULL CASE SIMULATOR
   Built from the Lead Manager Workflow SOP (15 steps)
   Case 1: Morning Triage & Lead Crisis (12 decisions)
   Case 2: A Complete Lead Manager Week (12 decisions)
   ================================================================ */
'use strict';

window.LMSim = (function () {

  /* ── state ── */
  let _score = 0;
  let _maxScore = 0;
  let _decisions = [];
  let _currentCase = null;
  let _currentStepIdx = 0;
  let _answered = false;

  const $ = id => document.getElementById(id);
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function nl2br(s) { return esc(s).replace(/\n/g,'<br>'); }

  /* ================================================================
     CASE 1 DATA: Morning Triage & Lead Crisis
  ================================================================ */
  const CASE1 = {
    id: 'morning-triage',
    badge: 'DAY IN THE LIFE',
    title: 'Morning Triage & Lead Crisis',
    subtitle: 'Real Geeks inbox · CRM audit · urgent decisions · compliance escalation',
    difficulty: 'Intermediate',
    estTime: '12 to 15 min',
    intro: 'It\'s 8:05 AM. You open your inbox to 97 unread emails: Real Geeks alerts, agent messages, and an office admin note about a walk-in lead that was never entered into the CRM. One agent is texting demanding a lead he says was promised to him. Another agent is in week 3 of logging calls with no notes.\n\nYour job: triage everything, make the right calls at each moment, and close the day with a clean CRM and zero dropped leads.',
    steps: [

      /* ── S1 Inbox Triage ── */
      { phase:'STEP 1: Inbox & Email Triage', sub:'SOP §5.1 · ~100 emails/day',
        narrative:'Your Real Geeks inbox shows 97 unread emails. You have 15 minutes before a team meeting. You scan and find these 5 items that need attention:',
        cards:[
          {icon:'📨',label:'Real Geeks Alert',text:'New lead: Maria Gonzalez, home valuation form submitted 7:48 AM, 2204 Saltwater Circle, Chesapeake VA'},
          {icon:'📨',label:'Real Geeks Alert',text:'Showing request from James Park for MLS #2025-441, submitted 11:30 PM last night'},
          {icon:'📩',label:'Agent: Carlos Ruiz',text:'"Where is my lead? Daniel qualified someone yesterday and I was told I\'d get it. Still nothing in Real Geeks."'},
          {icon:'📩',label:'Office Admin: Sandra',text:'"FYI, a couple came in yesterday at 3 PM. I have their info on a paper form. Never got entered. Attaching."'},
          {icon:'📩',label:'Real Geeks Auto',text:'Nurture lead David Kim (90 days cold) just clicked a property listing, so a status change is recommended.'},
        ],
        question:'You have 15 minutes before a meeting. What is your FIRST action?',
        options:[
          {text:'Reply to Carlos immediately, since agent satisfaction is critical.',correct:false,pts:0,
            fb:'Understandable instinct, but the SOP priority is identifying time-sensitive operational items first. The showing request (live prospect, overnight delay) and the un-entered walk-in lead (data integrity risk) are more urgent.'},
          {text:'Flag the showing request and the un-entered walk-in as immediate-action items, then log the rest for routine processing.',correct:true,pts:2,
            fb:'Correct. Per SOP Step 1, the first goal in inbox triage is identifying what needs immediate action vs. routine logging. The 11:30 PM showing request and the missing walk-in record are the two that cannot wait.'},
          {text:'Forward everything to your supervisor before touching any of it.',correct:false,pts:0,
            fb:'Routing everything upward is not the Lead Manager\'s role here. The SOP defines this triage as your responsibility: you identify what needs immediate action.'},
          {text:'Process all 97 emails in chronological order so nothing gets missed.',correct:false,pts:0,
            fb:'First-in first-out is the least effective triage approach. The SOP calls for identifying priority items first, not processing by timestamp.'},
        ]
      },

      /* ── S2 Walk-In Lead ── */
      { phase:'STEP 2: Walk-In Lead, Missing CRM Record', sub:'SOP §5.7 · Data Integrity',
        narrative:'Sandra\'s paper form is for Marcus and Diane Thompson, a couple who walked in yesterday at 3:08 PM asking about 3-bedroom homes in Norfolk, priced between $380K and $420K. They left contact info but said they\'re "just looking" and won\'t be ready until spring. The form has been sitting 19 hours. No CRM record exists.',
        cards:[
          {icon:'📋',label:'Walk-In Form',text:'Marcus & Diane Thompson · (757) 555-0192 · marcusthompson@gmail.com · 3BR, Norfolk, $380K to $420K · Timeline: Spring 2027 · "just browsing right now"'},
          {icon:'⚠️',label:'Data Gap',text:'19 hours since walk-in. No Real Geeks record. Agent assignment unknown.'},
        ],
        question:'What is the correct action for this walk-in lead?',
        options:[
          {text:'Skip it, since they said spring 2027, so there\'s no urgency right now.',correct:false,pts:0,
            fb:'Incorrect regardless of timeline. All leads, whether walk-in, call-in, or web, must be entered into Real Geeks. No CRM record means no tracking, no assignment, no audit, no reporting.'},
          {text:'Create the Real Geeks record now using the original walk-in date/time (yesterday, 3:08 PM), update the tracking spreadsheet, and set stage to long-term nurture.',correct:true,pts:2,
            fb:'Exactly right. SOP Steps 7 & 14 require you to enter the record with the original date, not today\'s date, so reporting data stays accurate. Long-term nurture matches their spring 2027 timeline.'},
          {text:'Email Sandra and ask her to enter it since she collected the form.',correct:false,pts:0,
            fb:'CRM accuracy is the Lead Manager\'s responsibility. Pushing it back to the admin risks it never being entered at all.'},
          {text:'Call the Thompsons first to follow up, then create the record afterward.',correct:false,pts:0,
            fb:'The CRM record must be created first. Calling before the entry means any conversation notes have nowhere to go, and you\'re contacting a lead with zero documentation of who they are.'},
        ]
      },

      /* ── S3 CRM Audit ── */
      { phase:'STEP 3: CRM Task & Follow-Up Audit', sub:'SOP §5.2 · Verify notes · flag missing info',
        narrative:'You open Real Geeks and review open tasks from this morning. You find activity logged for 4 agents:',
        cards:[
          {icon:'✅',label:'Agent: Priya Patel',text:'Call logged 8:22 AM. Notes: "Spoke with lead, confirmed still interested, viewing 2 homes Saturday AM, sent calendar invite." ✓ Complete'},
          {icon:'❌',label:'Agent: Carlos Ruiz',text:'Text logged 9:05 AM. Notes: [BLANK]. No follow-up detail entered.'},
          {icon:'⚠️',label:'Agent: James Okonkwo',text:'Email logged 7:58 AM. Notes: "sent email." Only 2 words. No lead response, no next step documented.'},
          {icon:'❌',label:'Agent: Sofia Chen',text:'Call logged 10:12 AM. Notes: [BLANK]. No contact detail, no outcome, no next step.'},
        ],
        question:'Three agents have incomplete or missing CRM notes. What do you do?',
        options:[
          {text:'Send correction requests to Carlos, James, and Sofia. Carlos and Sofia need full notes, and James needs to expand his entry with outcome and next steps. Document all three as compliance issues.',correct:true,pts:2,
            fb:'Correct on all three. Per SOP Step 2, missing notes always trigger a correction request. "Sent email" is not a complete note: the SOP requires outcome, lead response, and next step. Documenting all three enables pattern tracking.'},
          {text:'Only flag Carlos and Sofia since their notes are completely blank. James at least wrote something.',correct:false,pts:1,
            fb:'"Sent email" does not meet SOP note standards. All three need correction requests. Partial notes missing outcomes and next steps are treated as incomplete.'},
          {text:'Wait until the end of the week, since agents may still update their notes today.',correct:false,pts:0,
            fb:'The SOP says correction requests go out during the same audit session, not at week\'s end. Waiting also means agents forget the details of interactions they\'ve already moved past.'},
          {text:'Fill in the notes yourself based on what you think probably happened.',correct:false,pts:0,
            fb:'Fabricating CRM notes is a data integrity violation. Your job is to request the notes from the agent who had the interaction, not invent them.'},
        ]
      },

      /* ── S4 Web Lead Tracker ── */
      { phase:'STEP 4: New Website Lead, Tracker Entry', sub:'SOP §5.3 & §5.4 · Verification & Spreadsheet',
        narrative:'Maria Gonzalez submitted her home valuation form at 7:48 AM. Daniel Alvarez reviewed and qualified it at 8:15 AM. You\'re about to enter it into the Google Sheets tracker when you notice a detail:\n\nThe "Date/Time Generated" column is pre-filled with 8:15 AM, the time Daniel reviewed it, instead of 7:48 AM when the form was actually submitted.',
        cards:[
          {icon:'📋',label:'Tracker Entry Draft',text:'Lead: Maria Gonzalez · Date/Time: 8:15 AM ← PROBLEM · Source: Website Home Valuation Form · Channel: Organic Search · Contact: (757) 555-0221 / maria.gonzalez@gmail.com · Qualified by: Daniel Alvarez'},
          {icon:'⚠️',label:'Timestamp Discrepancy',text:'Form submitted: 7:48 AM. Daniel\'s review: 8:15 AM. The difference is 27 minutes, but it matters for speed-to-lead reporting.'},
        ],
        question:'What do you do about the timestamp discrepancy before submitting the tracker entry?',
        options:[
          {text:'Submit as-is. The difference is only 27 minutes and it doesn\'t affect the outcome.',correct:false,pts:0,
            fb:'The SOP specifically requires the lead generation date and time, not the review date. Even small timestamp errors corrupt speed-to-lead reporting data used to evaluate the entire lead response process.'},
          {text:'Correct the time to 7:48 AM (when the form was submitted) and then submit.',correct:true,pts:2,
            fb:'Correct. The tracker must record when the lead was generated. This timestamp feeds directly into the RGL Hand-Off Report and speed-to-lead metrics. Accuracy matters even when the difference seems small.'},
          {text:'Ask Daniel to re-stamp his review with 7:48 AM since he processed the lead.',correct:false,pts:0,
            fb:'The Lead Manager is responsible for the tracker entry. You already have the original submission time from Real Geeks; no need to loop Daniel back in.'},
        ]
      },

      /* ── S5 Assignment ── */
      { phase:'STEP 5: Lead Assignment, Territory Decision', sub:'SOP §5.5 · Location → Territory Map → Availability',
        narrative:'Maria Gonzalez\'s lead is ready for assignment. You post it in the WhatsApp assignment thread. Three agents respond within minutes:',
        cards:[
          {icon:'🏠',label:'Agent: Carlos Ruiz',text:'"That\'s my zip code! I know Chesapeake well. Available all day." ⚠️ Note: Carlos has 2 CRM note flags from this morning\'s audit.'},
          {icon:'🏠',label:'Agent: Priya Patel',text:'"I covered Chesapeake last quarter. Available this afternoon." Her territory map currently shows Norfolk and Virginia Beach.'},
          {icon:'🏠',label:'Agent: Jamal Washington',text:'"In a showing until noon, but I cover Chesapeake per the territory map." Territory map confirmed: Chesapeake. Available after 12 PM.'},
        ],
        question:'Per the SOP, who gets the lead?',
        options:[
          {text:'Carlos, since he\'s free all day and says he knows Chesapeake.',correct:false,pts:0,
            fb:'Familiarity and availability don\'t override territory assignments. The SOP\'s first filter is the territory coverage map, and the map must confirm the claim, not just the agent saying so.'},
          {text:'Priya, since she worked Chesapeake last quarter and is free this afternoon.',correct:false,pts:0,
            fb:'Past experience doesn\'t override the current territory map. Priya\'s map shows Norfolk and Virginia Beach. The SOP says to verify on the map, not take agents\' word for it.'},
          {text:'Jamal, since the territory map confirms Chesapeake. Assign in Real Geeks, confirm in WhatsApp, and set a 12:15 PM reminder to verify he contacted Maria.',correct:true,pts:2,
            fb:'Correct. SOP assignment order: verify property location → verify territory map → confirm availability. Jamal is the only agent whose map actually covers Chesapeake. The noon showing is fine; document it and set a reminder.'},
          {text:'Let the three agents work it out among themselves.',correct:false,pts:0,
            fb:'Peer-to-peer negotiation bypasses the structured assignment process entirely. The Lead Manager makes the decision based on territory and availability, then confirms in Real Geeks.'},
        ]
      },

      /* ── S6 Compliance Escalation ── */
      { phase:'STEP 6: Follow-Up Compliance, Recurring Violation', sub:'SOP §5.6 · Monitor → Remind → Escalate',
        narrative:'It\'s 2:30 PM. Jamal confirmed contact with Maria at 12:20 PM, which is great. But reviewing Carlos Ruiz\'s leads, you find none of his 4 assigned leads this week show any contact attempt. This is week 3 of the same pattern. You sent reminders on Tuesday and Thursday of week 1, Monday of week 2, and again this Monday. He acknowledged them, but still hasn\'t updated his CRM.',
        cards:[
          {icon:'📊',label:'Carlos Compliance Log',text:'Week 1: 2 missing notes, correction request sent. Week 2: 3 missing notes, 2 reminders sent, no improvement. Week 3 (today): 4 leads, zero contact logged.'},
          {icon:'⚠️',label:'SOP Threshold',text:'Per SOP §5.6, recurring non-compliance issues must be escalated to management when reminders are not producing results.'},
        ],
        question:'How do you handle Carlos\'s situation at this point?',
        options:[
          {text:'Send another reminder and give him until Friday.',correct:false,pts:0,
            fb:'Three weeks of reminders with no improvement is exactly the SOP trigger for escalation. Another reminder doesn\'t meet the requirement and means more leads go undocumented.'},
          {text:'Document the 3-week pattern, send a final correction request with a clear deadline, and formally escalate to management with the full compliance log.',correct:true,pts:2,
            fb:'This is the SOP-correct response. The Lead Manager must: send a correction request AND document the pattern AND escalate recurring problems to management. All three are required, not just one.'},
          {text:'Reassign all of Carlos\'s leads to other agents without telling him.',correct:false,pts:0,
            fb:'Unilateral reassignment without documentation and management involvement is outside the Lead Manager\'s authority. It also doesn\'t resolve the compliance issue.'},
          {text:'Write the missing notes yourself so the CRM is accurate.',correct:false,pts:0,
            fb:'Fabricating CRM notes is a data integrity violation even with good intentions. Request the notes, then escalate if Carlos still refuses.'},
        ]
      },

      /* ── S7 Showing Request ── */
      { phase:'STEP 7: Showing Request, 15-Hour Delay', sub:'SOP §5.7 · Walk-In & Call-In Leads',
        narrative:'Back to that 11:30 PM showing request from James Park, flagged this morning but not yet addressed. It\'s now 2:45 PM. James Park has been in nurture for 58 days, hasn\'t replied to 3 emails, but just submitted a direct showing request through the listing page for 4807 Shoreline Drive ($485K). Pre-qualified at $490K.',
        cards:[
          {icon:'📋',label:'James Park: Lead Profile',text:'Buyer · Pre-qualified $490K · 58 days nurture · 3 unanswered emails · Showing request: 4807 Shoreline Drive ($485K) · Submitted 11:30 PM last night'},
          {icon:'⏱️',label:'Time Elapsed',text:'15+ hours since showing request submitted. No response from anyone on the team.'},
        ],
        question:'What is the correct response to James Park\'s showing request?',
        options:[
          {text:'Add him to a re-engagement drip, since a 58-day cold lead isn\'t ready for a showing.',correct:false,pts:0,
            fb:'A direct showing request is the strongest possible intent signal, far stronger than a passive email open. This lead bypassed the nurture sequence entirely and is actively trying to see a property.'},
          {text:'Contact James immediately by phone and text, coordinate with the listing agent to schedule the showing, and update his CRM stage and notes.',correct:true,pts:2,
            fb:'Correct. A showing request requires immediate outreach. SOP Step 7 requires contacting the prospect, coordinating with the agent, and updating the CRM record; all three actions are needed.'},
          {text:'Forward the request to the listing agent and let them handle it.',correct:false,pts:1,
            fb:'The Lead Manager coordinates the response, not just forwards it. The CRM update and showing confirmation are also your responsibility.'},
          {text:'Wait until tomorrow, since the request came in at night so James probably isn\'t expecting a same-day response.',correct:false,pts:0,
            fb:'Speed matters even for showing requests. This one has already been sitting 15 hours, and further delay significantly reduces the chance of booking.'},
        ]
      },

      /* ── S8 QA Audit ── */
      { phase:'STEP 8: Quality Assurance Audit', sub:'SOP §5.8 · Min. 2 leads/agent · 25 to 30% walk-in & call-in',
        narrative:'You conduct QA calls for the week\'s audit. You call one of Priya Patel\'s leads, Robert Chen, to verify the interaction quality. He says: "Priya was fantastic. Very helpful. She sent me 4 listings that match exactly what I described. I\'m actually planning to book a showing this week."\n\nBut when you call one of James Okonkwo\'s leads, Sandra Torres, she says: "James called once, said he\'d send something, and I never heard back. That was 8 days ago."',
        cards:[
          {icon:'✅',label:'QA Result: Robert Chen (Priya)',text:'"Priya was fantastic, sent 4 matching listings, planning to book a showing this week." Positive service quality confirmed.'},
          {icon:'❌',label:'QA Result: Sandra Torres (James)',text:'"James called once, said he\'d send something, never heard back. That was 8 days ago." Broken commitment, no follow-through.'},
        ],
        question:'Two very different QA results. What actions do you take?',
        options:[
          {text:'Document only the negative finding about James, since positive feedback doesn\'t need recording.',correct:false,pts:0,
            fb:'The SOP requires all audit findings to be documented, positive and negative. Positive results are part of the performance record and are used in coaching as examples of good practice.'},
          {text:'Document both findings in Google Sheets. For Robert: note Priya\'s strong performance and alert her that Robert is ready to book. For Sandra: immediately contact James to follow up with Sandra today, and escalate as a compliance concern.',correct:true,pts:2,
            fb:'Correct. SOP Step 9 requires recording all results. The positive Priya finding is actionable intelligence (Robert is ready to book, so Priya should know now). The James finding is a broken client commitment that requires immediate follow-up and documentation.'},
          {text:'Tell Priya she did a great job verbally, and send James a reminder to follow up with Sandra.',correct:false,pts:1,
            fb:'Verbal-only feedback and a simple reminder are insufficient. All QA results must be documented in Google Sheets. James\'s broken commitment also needs escalation, not just a reminder.'},
        ]
      },

      /* ── S9 Coaching ── */
      { phase:'STEP 9: Coaching Session, James Okonkwo', sub:'SOP §5.10 · Feedback → Commitments → Document → Report',
        narrative:'Based on QA findings (Sandra Torres + two other leads with similar patterns), you schedule a 30-minute coaching session with James. His profile: calls average under 3 minutes, no qualifying questions, leads consistently unsure of next steps, and CRM notes are thin. The "sent email" entry from this morning is typical.',
        cards:[
          {icon:'📋',label:'James Okonkwo: Coaching Data',text:'Avg call duration: 2.8 min · Zero qualifying questions observed · 3 leads unclear on next step (QA confirmed) · CRM notes consistently incomplete · No malicious intent, just a clear skill gap.'},
        ],
        question:'What is the right approach for this 30-minute coaching session?',
        options:[
          {text:'Tell James his metrics are below standard and he needs to improve.',correct:false,pts:0,
            fb:'Vague feedback without specific examples, actionable guidance, or documented commitments doesn\'t meet the SOP coaching requirement and is unlikely to produce real improvement.'},
          {text:'Deliver specific example-based feedback (short calls, no qualifying questions, unclear next steps), agree on 2 to 3 concrete action items with a follow-up timeline, document the commitments, and send a summary to management.',correct:true,pts:2,
            fb:'This is the complete SOP coaching process (Step 10): specific feedback → actionable commitments → documentation → management summary. All four are required. Coaching without documentation means the feedback loop is broken.'},
          {text:'Focus only on CRM notes since that\'s the most visible issue.',correct:false,pts:1,
            fb:'Thin notes are a symptom; the root cause is surface-level calls with no qualifying questions. Addressing only the most visible symptom leaves the core problem untouched.'},
          {text:'Postpone, since James is still learning and may improve on his own.',correct:false,pts:0,
            fb:'The SOP requires coaching sessions to be executed based on QA findings. Postponing means leads continue to receive poor service quality while you wait for organic improvement.'},
        ]
      },

      /* ── S10 Cold Lead ── */
      { phase:'STEP 10: Cold Lead Reactivation, David Kim', sub:'SOP §5.6 · Activity Signal · Pipeline Stage Change',
        narrative:'David Kim has been cold for 93 days. No response to 3 emails. No phone contact since Day 7. But this morning he clicked a $520K listing in Virginia Beach 3 times in 2 hours. His original profile: $500K to $550K buyer, timeline "6 to 9 months" when he registered 93 days ago.',
        cards:[
          {icon:'📊',label:'David Kim: Pipeline Status',text:'93 days in system · Timeline: 6 to 9 months · Last contact: Day 7 (no answer) · 3 emails sent, zero replies · Today: clicked listing #5512 ($520K, Virginia Beach), 3 views in 2 hours'},
          {icon:'🔔',label:'Real Geeks Activity Alert',text:'David Kim viewed property #5512 three times in the last 2 hours. High engagement signal.'},
        ],
        question:'David is 93 days in, still in his original timeline window, and just clicked a listing 3 times. What do you do?',
        options:[
          {text:'Do nothing, since he\'s within his timeline and will reach out when ready.',correct:false,pts:0,
            fb:'Three views in 2 hours on a single listing is a clear behavioral engagement signal. The SOP calls for active pipeline monitoring; this warrants re-engagement outreach, not passive waiting.'},
          {text:'Send a low-pressure re-engagement message referencing his original timeline and the specific property he clicked, update his CRM stage, and assign to an agent for a follow-up call within 24 hours.',correct:true,pts:2,
            fb:'Correct. A 93-day cold lead with 3 property clicks is a re-engagement moment. Reference their timeline to show you remembered them. Update the stage and assign for follow-up; both are required.'},
          {text:'Call David immediately and push him to book a showing today.',correct:false,pts:1,
            fb:'Jumping straight to a showing ask is too aggressive for a lead who hasn\'t replied in 93 days. A low-pressure re-engagement message calibrates the approach correctly: reopen the conversation before asking for action.'},
          {text:'Reset him to a new 5-email drip from the beginning.',correct:false,pts:0,
            fb:'A generic drip reset ignores the specific behavioral signal and the relationship history. Personalized outreach referencing his timeline and the specific property is far more effective.'},
        ]
      },

      /* ── S11 Weekly Report ── */
      { phase:'STEP 11: Weekly RGL Hand-Off Report', sub:'SOP §5.11 · Update → Review → Send to Brock',
        narrative:'It\'s Friday. You need to submit the RGL Hand-Off Report to Brock before the 5 PM meeting. This week\'s data:',
        cards:[
          {icon:'📊',label:'This Week\'s Numbers',text:'New leads: 47 · Contacted: 29 · Qualified: 11 · Appointments set: 4 · Referrals: 1 · Walk-in/call-in: 14'},
          {icon:'📊',label:'Last Week\'s Numbers',text:'New leads: 39 · Contacted: 22 · Qualified: 8 · Appointments set: 2 · Referrals: 0'},
          {icon:'⚠️',label:'Key Issues This Week',text:'Carlos Ruiz: 3-week compliance escalation submitted. James Okonkwo: coaching session completed, action items documented. Thompson walk-in corrected. James Park showing request (15hr delay) resolved.'},
        ],
        question:'Beyond raw numbers, what should the RGL Hand-Off Report include?',
        options:[
          {text:'Just the raw numbers, contacts, qualifications, appointments. Brock can draw his own conclusions.',correct:false,pts:0,
            fb:'Raw numbers without context don\'t meet the SOP reporting standard. The report should enable Brock to understand what changed, why, and what\'s actively being addressed.'},
          {text:'Week-over-week comparison, key wins (4 appointments vs. 2 last week), active compliance and coaching issues, the Thompson correction, and a note on the James Park showing delay, so Brock has a complete operational picture.',correct:true,pts:2,
            fb:'Correct. The SOP requires the report to cover conversion metrics AND a summary for the Broker that includes wins, open issues, and any data corrections or incidents. Brock needs context to act, not just numbers.'},
          {text:'Focus mainly on the Carlos compliance escalation, since that\'s the most urgent issue.',correct:false,pts:1,
            fb:'Compliance escalations are part of the report, but so are conversion metrics, coaching activities, and data corrections. An incomplete report leaves gaps in the Broker\'s operational visibility.'},
        ]
      },

      /* ── S12 End of Day ── */
      { phase:'STEP 12: End-of-Day Wrap-Up', sub:'Full SOP compliance verification',
        narrative:'Before logging off, you realize: the re-engagement message to David Kim never got sent. You got pulled into the Carlos escalation this afternoon and completely forgot. It\'s 5:30 PM.',
        cards:[
          {icon:'⏱️',label:'Situation',text:'David Kim clicked the listing 3 times this morning. It\'s now 5:30 PM, 9+ hours since the engagement signal. No outreach sent yet.'},
        ],
        question:'What do you do about the missed David Kim outreach?',
        options:[
          {text:'Leave it for Monday, since it\'s already the end of the day.',correct:false,pts:0,
            fb:'Monday means 3 full days after the engagement signal. That re-engagement window closes quickly. The right answer is to act as close to the signal as possible.'},
          {text:'Send the re-engagement message now (even at 5:30 PM), update his CRM stage, add a Monday morning reminder to assign for follow-up, and note it in your end-of-day log.',correct:true,pts:2,
            fb:'Correct. A brief re-engagement text or email at 5:30 PM is appropriate and far better than a 3-day delay. Noting it in your log ensures accountability and closes the loop on today\'s open item.'},
          {text:'Assign David to an agent right now and let the agent handle the outreach.',correct:false,pts:1,
            fb:'Assigning without first re-engaging is premature for a lead who hasn\'t responded in 93 days. The Lead Manager should send the initial message, then assign based on the lead\'s response.'},
        ]
      }
    ]
  };

  /* ================================================================
     CASE 2 DATA: A Complete Lead Manager Week (15 SOP steps)
  ================================================================ */
  const CASE2 = {
    id: 'full-week',
    badge: 'FULL WEEK SOP',
    title: 'A Complete Lead Manager Week',
    subtitle: 'All 15 SOP steps · QA audits · coaching · weekly report · missing leads',
    difficulty: 'Advanced',
    estTime: '18 to 22 min',
    intro: 'This simulation covers an entire work week as a Lead Manager. You will handle the full scope of the SOP: inbox triage, CRM audits, new leads, walk-in and call-in leads, assignment decisions, compliance monitoring, QA calls, coaching sessions, the weekly RGL Hand-Off Report, staffing meetings, and correcting missing records.\n\nEvery decision reflects a real situation you will encounter on the job. Pay attention to context, since the right answer isn\'t always the obvious one.',
    steps: [

      /* ── W1 Monday Inbox ── */
      { phase:'MONDAY, Step 1: Inbox Triage (Weekend Backlog)', sub:'SOP §5.1 · ~100 emails/day',
        narrative:'Monday, 8:00 AM. Your inbox has 112 emails from the weekend: Real Geeks alerts, agent messages, and a note from Brock about a new agent joining next week. You scan and find 3 showing requests submitted Saturday with zero response logged.',
        cards:[
          {icon:'📨',label:'Weekend Highlights',text:'18 new leads generated over the weekend · 3 showing requests submitted Saturday · 2 agent emails about lead disputes · Brock note: new agent onboarding next week'},
          {icon:'⚠️',label:'Critical Gap',text:'3 showing requests submitted Saturday AM. It is now Monday 8:00 AM. No response logged from anyone. 48+ hours of silence.'},
        ],
        question:'Three weekend showing requests have gone 48+ hours with no response. What is your first move?',
        options:[
          {text:'Process all 112 emails in order, since systematic coverage prevents anything from being missed.',correct:false,pts:0,
            fb:'Chronological processing is the least effective approach for triage. The 3 unanswered showing requests represent live prospects who have been waiting all weekend.'},
          {text:'Immediately flag all 3 showing requests as critical, contact each prospect directly by phone and text, and document the 48-hour weekend gap as a process issue to escalate.',correct:true,pts:2,
            fb:'Correct. Showing requests that have been unanswered for 48+ hours are your highest-urgency items. Direct prospect contact is required. Documenting the weekend gap is also critical: it\'s a systemic issue that needs to reach leadership.'},
          {text:'Forward the showing requests to the assigned agents and ask them to follow up today.',correct:false,pts:1,
            fb:'After 48 hours of silence, the Lead Manager needs to make direct contact, not just forward and hope. The SOP says to contact prospects directly regarding showing activity when needed.'},
        ]
      },

      /* ── W2 CRM Audit w/ Context ── */
      { phase:'MONDAY, Step 2: CRM Audit with Context', sub:'SOP §5.2 · Context matters in compliance documentation',
        narrative:'You audit Monday\'s CRM tasks. Of 22 open tasks from last week, 7 were never closed or updated. Five belong to Michael Torres, who had an approved personal day Thursday and Friday. The other 2 belong to different agents with no documented reason.',
        cards:[
          {icon:'📊',label:'Audit Results',text:'22 open tasks reviewed · 7 not updated · 5 from Michael Torres (approved absence Thurs/Fri) · 2 from other agents (no known reason for gap)'},
        ],
        question:'How do you handle the 7 unclosed tasks differently based on context?',
        options:[
          {text:'Send the same correction request to all 7, since context doesn\'t change the requirement.',correct:false,pts:1,
            fb:'Everyone does get a correction request (the tasks need updating regardless), but the compliance documentation should distinguish between an approved absence and an unexplained gap. This distinction matters for any future performance action.'},
          {text:'Send correction requests to all 7, but document Michael\'s 5 tasks differently, noting his approved absence, versus the 2 unexplained gaps, which are flagged as compliance concerns.',correct:true,pts:2,
            fb:'Correct. All 7 need correction requests; the tasks still need updating. But the compliance documentation distinguishes between a legitimate reason and an unexplained gap. That distinction matters in performance tracking and future escalations.'},
          {text:'Excuse Michael\'s 5 tasks since he was out with approval, and only send correction requests to the 2 unexplained agents.',correct:false,pts:0,
            fb:'Michael\'s absence is documented and legitimate, but the tasks still need to be updated. He still gets a correction request, just with appropriate context in the compliance notes.'},
        ]
      },

      /* ── W3 Duplicate Lead ── */
      { phase:'MONDAY/TUESDAY, Steps 3 & 4: Leads & CRM Integrity', sub:'SOP §5.3 & §5.4 · Data integrity · No duplicates',
        narrative:'You\'re processing 18 weekend leads. Daniel qualified 11 of them. As you\'re entering them into the Google Sheets tracker, you find that one lead, Victoria Park, has a 6-month-old cold record already in Real Geeks. She\'s now submitting a fresh inquiry as a new website lead.',
        cards:[
          {icon:'⚠️',label:'Duplicate Detected',text:'Victoria Park: appears in Real Geeks as a cold lead from 6 months ago (no response) AND as a new website lead from this weekend. If entered again, it creates a duplicate record.'},
        ],
        question:'Victoria Park has an old cold record and a new web inquiry. What do you do?',
        options:[
          {text:'Enter her as a completely new lead, since 6 months is a fresh start.',correct:false,pts:0,
            fb:'Creating a duplicate record hides her 6-month interaction history and corrupts the CRM database. This is a data integrity violation regardless of how long ago the first record was created.'},
          {text:'Update the existing record with her new inquiry, add a re-engagement note, update her pipeline stage to reflect new activity, and enter her in the tracker as a re-engaged lead.',correct:true,pts:2,
            fb:'Correct. One clean record per lead is a core CRM data integrity principle. Her 6-month history and her new inquiry should both be visible in a single record. The re-engagement note also gives any assigned agent important context.'},
          {text:'Flag it for Brock, since duplicate records are above the Lead Manager\'s authority.',correct:false,pts:0,
            fb:'Managing lead records including duplicates is within the Lead Manager\'s scope. This is a routine data integrity task, not an escalation case.'},
        ]
      },

      /* ── W4 Territory Gap ── */
      { phase:'TUESDAY, Step 5: Assignment with No Territory Owner', sub:'SOP §5.5 · Escalate structural gaps to leadership',
        narrative:'A new qualified lead: Angela Simmons, buyer, Suffolk VA, $550K to $600K, 4BR. You check the territory map: Suffolk is listed as "unassigned/shared market." No agent has exclusive coverage. Brock mentioned the new agent starting next week was supposed to cover Suffolk, but he hasn\'t started yet.',
        cards:[
          {icon:'🗺️',label:'Territory Gap',text:'Angela Simmons: Suffolk VA · $550K to $600K · 4BR buyer · Suffolk = "unassigned/shared market" on coverage map · New agent starts next week but hasn\'t onboarded yet'},
        ],
        question:'There\'s no assigned agent for Suffolk and the new hire doesn\'t start until next week. What do you do?',
        options:[
          {text:'Hold Angela\'s lead until the new agent starts next week.',correct:false,pts:0,
            fb:'Holding a qualified, active lead for a week is unacceptable. Speed-to-lead matters; this lead will go cold or find another agent on their own during that window.'},
          {text:'Escalate to Brock immediately: explain the territory gap, recommend a temporary assignment to the nearest-territory agent this week, and flag that Suffolk needs formal designation before the new agent onboards.',correct:true,pts:2,
            fb:'Correct. When the territory map has a gap, the Lead Manager escalates to leadership; they don\'t make structural decisions independently. The temporary assignment recommendation is appropriate, and flagging the gap for formal resolution is process-correct.'},
          {text:'Assign Angela to whoever is available today, since action beats waiting.',correct:false,pts:1,
            fb:'An informal undocumented assignment bypasses the structured process and creates accountability gaps. The territory gap also needs to reach Brock; an ad-hoc assignment doesn\'t fix the systemic issue.'},
        ]
      },

      /* ── W5 Walk-In Priority ── */
      { phase:'TUESDAY/WEDNESDAY, Step 7: Walk-In & Call-In Triage', sub:'SOP §5.7 · Verify contact info · Prioritize data gaps',
        narrative:'This week: 6 walk-in and call-in leads. Reviewing the intake forms: 2 are complete. 2 have phone numbers but no email. 1 has an email but a Texas phone number (suspicious for a Virginia buyer). 1 was entered by an agent as "guy came in asking about 3BRs," with no contact information at all.',
        cards:[
          {icon:'📋',label:'Walk-In/Call-In Audit',text:'2 complete ✓ · 2 missing email · 1 suspicious phone (TX number for VA buyer) · 1 completely missing contact info ("guy came in asking about 3BRs")'},
        ],
        question:'4 of 6 leads have issues. What is the correct priority order?',
        options:[
          {text:'Fix the 2 missing emails first since those leads are closest to being complete.',correct:false,pts:0,
            fb:'Closest to complete doesn\'t mean highest priority. The lead with zero contact information is the most urgent; every hour that passes makes the interaction harder to recover from the agent\'s memory.'},
          {text:'Contact the agent who wrote "guy came in" immediately to recover contact info before the memory fades. Then request missing emails from the 2 partial records. Then verify the Texas phone number before assigning.',correct:true,pts:2,
            fb:'Correct prioritization. The missing contact info is the most urgent: it cannot be followed up at all without it, and time kills the memory. Partial records are next. The phone discrepancy warrants verification, not immediate rejection.'},
          {text:'Discard the "guy came in" lead, since there\'s nothing to work with.',correct:false,pts:0,
            fb:'Never discard without attempting recovery. The agent who wrote the note was in that interaction; they may still remember the person. A quick call to that agent is always worth trying first.'},
        ]
      },

      /* ── W6 QA Escalation ── */
      { phase:'WEDNESDAY/THURSDAY, Step 8: QA Audit Finding', sub:'SOP §5.8 & §5.9 · Broken client commitment → immediate action',
        narrative:'You\'re conducting QA calls this week. You call one of James Okonkwo\'s leads, Patricia Wells. She says: "James called once, said he\'d send me listings in a couple days. That was 6 days ago. I never got anything and haven\'t heard from him since." This is the same James you coached earlier this week.',
        cards:[
          {icon:'⚠️',label:'Critical QA Finding',text:'Patricia Wells: buyer · James promised listings "in a couple days" · 6 days ago · No listings sent · No follow-up · Client is frustrated and waiting'},
          {icon:'📋',label:'Context',text:'James Okonkwo was formally coached earlier this week on: short calls, no qualifying questions, unclear next steps. This QA finding confirms the pattern continues 3 days after coaching.'},
        ],
        question:'A QA call surfaces a broken client commitment 3 days after you formally coached James. What do you do?',
        options:[
          {text:'Note it in the audit records and address it in next week\'s coaching session.',correct:false,pts:0,
            fb:'A QA call that reveals a broken client commitment is an immediate action item; Patricia has been waiting 6 days. Deferring to next week\'s coaching session also compounds the pattern with more delay.'},
          {text:'Document the finding, contact James immediately to follow up with Patricia today, escalate to management as a repeat performance issue after this week\'s coaching session, and record it in the audit system.',correct:true,pts:2,
            fb:'Correct. Four actions are required: document it, get James to follow up immediately (the client is waiting), escalate to management (this is now a pattern, the same issues 3 days after a formal coaching session), and record in the audit tracker.'},
          {text:'Contact Patricia yourself and send her listings directly so she doesn\'t go cold.',correct:false,pts:1,
            fb:'The Lead Manager is not the agent; bypassing James and handling the client relationship directly creates confusion. The correct action is getting James to fulfill his commitment, with escalation if needed.'},
        ]
      },

      /* ── W7 Coaching Documentation ── */
      { phase:'THURSDAY, Step 10: Coaching Documentation After Escalation', sub:'SOP §5.10 · Full documentation → management summary',
        narrative:'James follows up with Patricia immediately after you call him. He\'s apologetic and seems to genuinely want to improve. When you ask about the commitments from Monday\'s coaching session, he says "I\'ve been trying to keep calls longer but it\'s hard when leads want to end the call."',
        cards:[
          {icon:'📋',label:'James Okonkwo: Full Picture',text:'Monday: formal coaching session, commitments documented (longer calls, qualifying questions, clear next steps) · Thursday QA: broken client commitment · James contacts Patricia immediately after you reach out · Attitude: cooperative, wants to improve'},
        ],
        question:'James has resolved the immediate situation with Patricia. How do you handle the coaching documentation?',
        options:[
          {text:'Document it as resolved since James acted quickly and seems motivated.',correct:false,pts:0,
            fb:'Quick resolution doesn\'t erase the pattern. This is a repeat performance issue 3 days after a formal coaching session. Per the SOP, it must be escalated to management with the full timeline, both the Monday session and Thursday\'s QA finding.'},
          {text:'Update the coaching record with Thursday\'s QA finding, document both the broken commitment and the resolution, and submit an updated management summary connecting Monday\'s session to Thursday\'s escalation.',correct:true,pts:2,
            fb:'Correct. Management needs the full picture: the Monday action items, and the QA finding 3 days later showing the same patterns continuing. That timeline is what enables leadership to make informed decisions about next steps.'},
          {text:'Give James one more week before reporting anything, since he was honest and followed up quickly.',correct:false,pts:0,
            fb:'Honesty matters, but the SOP requires management reporting after coaching sessions, especially when QA surfaces a pattern. Delaying means leadership makes decisions without the information they need.'},
        ]
      },

      /* ── W8 Missing CRM Records ── */
      { phase:'THURSDAY, Step 14: Correcting Missing CRM Records', sub:'SOP §5.14 · Original date · Full record recovery',
        narrative:'Reviewing the tracker, you find 2 leads from Tuesday are in Google Sheets but not in Real Geeks: someone entered the spreadsheet but forgot to create the CRM records. Kevin Marsh was already contacted by an agent but has no CRM record. The agent remembers the call but never logged it. Tamara Reid hasn\'t been contacted yet and is simply missing from the CRM.',
        cards:[
          {icon:'⚠️',label:'Kevin Marsh: Contacted, No CRM Record',text:'In Google Sheets (Tuesday date) · Agent called him · No Real Geeks record · No logged interaction · Agent remembers the call content'},
          {icon:'⚠️',label:'Tamara Reid: Not Contacted, Missing Record',text:'In Google Sheets (Tuesday date) · Not yet contacted · No Real Geeks record created'},
        ],
        question:'Kevin has been contacted but has no CRM record. What\'s the correct recovery process?',
        options:[
          {text:'Create Kevin\'s record with today\'s date, since the important thing is getting him into the system.',correct:false,pts:0,
            fb:'Using today\'s date is a data integrity error. The SOP requires the original lead generation date. Today\'s date makes the timeline inaccurate and corrupts speed-to-lead reporting.'},
          {text:'Create Kevin\'s record with the original Tuesday date, ask the agent to log the call and notes from memory immediately, update the tracker to note the correction, and document the data gap as a process error.',correct:true,pts:2,
            fb:'Correct on all points. Original date must be used. The agent\'s call must be logged even retrospectively (notes from memory are better than no notes). The tracker should note the correction. And documenting the process failure helps prevent recurrence.'},
          {text:'Since Kevin has been contacted, prioritize Tamara, since she\'s the one who hasn\'t been reached yet.',correct:false,pts:0,
            fb:'Both need immediate attention. Kevin\'s missing record means his interaction history is invisible to the whole team: it can\'t be audited, tracked, or reported. A contacted lead with no CRM record is still a critical data gap.'},
        ]
      },

      /* ── W9 Staffing Meeting ── */
      { phase:'THURSDAY, Step 12: Staffing & Team Meeting', sub:'SOP §5.12 & §5.13 · Present data · Route structural decisions to leadership',
        narrative:'Thursday\'s 90-minute team meeting. You\'re presenting this week\'s lead activity summary. During open discussion, two agents argue that the territory map is "unfair," since some agents get more leads simply because marketing generates more traffic in their zones, not because of their performance or effort.',
        cards:[
          {icon:'🏢',label:'Meeting Context',text:'Thursday team meeting · 90 min · Agenda: lead distribution, Suffolk coverage plan, agent performance, CRM optimization, territory fairness concern raised by agents'},
        ],
        question:'Agents raise a fairness concern about territory-based lead distribution. How do you respond?',
        options:[
          {text:'Agree and promise to revise the territory map this week.',correct:false,pts:0,
            fb:'Territory map changes are a leadership decision, not something the Lead Manager commits to independently in a meeting. Making unilateral promises outside your authority creates problems.'},
          {text:'Acknowledge the concern, present the current lead distribution data by territory, and recommend Brock lead a formal territory review, then document the concern in the meeting summary for follow-up.',correct:true,pts:2,
            fb:'Correct. The Lead Manager\'s role is to present accurate data, acknowledge legitimate concerns, and route structural decisions to leadership. Documenting it in the meeting summary ensures proper follow-up rather than letting it fade after the meeting.'},
          {text:'Dismiss the concern, since the territory map exists for operational reasons and agents should trust the process.',correct:false,pts:0,
            fb:'Dismissing agent concerns without acknowledgment damages trust. Even if the current map is correct, agents deserve to have their concern heard and considered by leadership.'},
        ]
      },

      /* ── W10 Training Review ── */
      { phase:'FRIDAY, Step 15: Monthly Training Review', sub:'SOP §5.15 · Real Geeks University · Targeted recommendations',
        narrative:'Monthly training review day. You access Real Geeks University and assess the available content. Based on this week\'s QA and coaching findings, you\'ve identified four recurring patterns across multiple agents: short calls with no qualifying questions, thin CRM notes, unclear next steps communicated to leads, and stale nurture leads sitting 60+ days without activity checks.',
        cards:[
          {icon:'📚',label:'Recurring Issues: This Month',text:'Short calls / no qualifying questions (James + 2 others) · Thin CRM notes (3 agents) · Unclear next steps to leads (confirmed in 4 QA calls) · Stale nurture: 60+ day leads with no activity (8 leads identified)'},
        ],
        question:'Based on four recurring patterns across multiple agents, what training recommendation do you develop?',
        options:[
          {text:'Send all agents the full Real Geeks University catalog and ask them to self-study what\'s relevant.',correct:false,pts:0,
            fb:'Generic self-study doesn\'t address specific patterns. The SOP says to create targeted training packages based on the specific operational challenges identified, not send a catalog and hope for the best.'},
          {text:'Create a targeted training package addressing all four patterns: call framework for qualification, CRM note template, script for communicating next steps, and a nurture pipeline review checklist, then present it to Brock for team-wide rollout.',correct:true,pts:2,
            fb:'This is the SOP-correct approach: identify recurring issues, create targeted learning resources, and bring recommendations to management for implementation. The four-topic package directly addresses the four patterns found in QA and coaching.'},
          {text:'Focus training on James only since he was the most visible issue this week.',correct:false,pts:1,
            fb:'The patterns span multiple agents. A team training is more efficient and more impactful than addressing each agent individually for the same systemic issue. James needs individual follow-up too, but the training should be broader.'},
        ]
      },

      /* ── W11 Weekly Report Timing ── */
      { phase:'FRIDAY, Step 11: RGL Hand-Off Report', sub:'SOP §5.11 · Written report before meeting · Present highlights live',
        narrative:'End of a demanding week. You need to compile and submit the RGL Hand-Off Report. Brock is in back-to-back meetings until 4:30 PM. The weekly team meeting (where you present results) is at 5 PM. This was a heavy week: 47 total leads, 3 delayed showing responses, 2 missing CRM records recovered, the Suffolk territory escalation, QA findings on James, and 2 coaching sessions.',
        cards:[
          {icon:'📊',label:'Full Week Summary',text:'Leads: 47 · Qualified: 19 · Appointments: 6 · Missing records recovered: 3 · QA calls: 9 · Coaching sessions: 2 · Compliance escalations: 1 · Territory escalation: 1 (Suffolk) · Corrections sent: 14'},
        ],
        question:'Brock is unavailable until 4:30 PM and the meeting is at 5 PM. How do you handle the report?',
        options:[
          {text:'Wait until Monday, since the week is over and the report can go out with next week\'s update.',correct:false,pts:0,
            fb:'The SOP requires the report to be submitted and presented weekly, on Friday. Brock goes into the weekend without the week\'s operational picture if you delay.'},
          {text:'Send the full written report to Brock before 4:30 PM so he can review before the meeting, then present the key highlights at 5 PM, specifically flagging Suffolk, the James pattern, and the 3 recovered records.',correct:true,pts:2,
            fb:'Correct. The written report goes to Brock before the meeting so he comes prepared. The live presentation focuses on actionable items needing leadership decisions or awareness. Written before plus verbal highlights during is the complete SOP approach.'},
          {text:'Present everything verbally at the 5 PM meeting, since the week was too complex for a written report.',correct:false,pts:0,
            fb:'A verbal-only report doesn\'t create the documented record the RGL Hand-Off Report is designed to provide. The more complex the week, the more important the written record.'},
        ]
      },

      /* ── W12 Reflection ── */
      { phase:'FRIDAY, End-of-Week Reflection', sub:'Full SOP review · Learning consolidation',
        narrative:'You\'ve completed a full work week in the Lead Manager role. This final step asks you to reflect on the most challenging SOP principle to apply consistently, not the hardest individual task, but the underlying discipline that trips people up most often in real execution.',
        cards:[
          {icon:'📋',label:'SOP Core Disciplines',text:'1. Triage urgency: live prospects and data gaps first · 2. Document everything: findings, corrections, coaching · 3. Escalate patterns: reminders for one incident, management for recurring · 4. Integrity on dates: always use original generation date · 5. QA is proactive: you call leads to surface problems before they surface themselves'},
        ],
        question:'Which of these SOP principles is most likely to break down under real workload pressure?',
        options:[
          {text:'Documenting everything, especially when you\'re moving fast and documentation feels like it slows you down.',correct:true,pts:2,
            fb:'This is the most common real-world failure point. Under pressure, the instinct is to "just handle it" and document later, which means it often doesn\'t get documented at all. Kevin Marsh\'s missing CRM record, James\'s undocumented coaching commitment, the Thompson walk-in sitting 19 hours: all were documentation failures, not knowledge failures.'},
          {text:'Knowing when to escalate versus when to handle it myself.',correct:true,pts:2,
            fb:'This is genuinely difficult and gets better with experience. The general rule: data corrections and routine compliance requests are yours to own. Structural decisions, repeated performance failures, and resource gaps escalate to management. When in doubt, document and escalate; it\'s always safer than staying silent.'},
          {text:'Prioritizing correctly when multiple urgent items arrive simultaneously.',correct:true,pts:2,
            fb:'Priority order when everything feels urgent: (1) Live prospects with no response (especially showing requests), (2) Data gaps blocking assignment or reporting, (3) Compliance issues, (4) Routine auditing. Having a clear mental model for this hierarchy makes triage faster under pressure.'},
        ]
      }
    ]
  };

  /* ================================================================
     RENDERING ENGINE
  ================================================================ */

  function renderCaseList() {
    const grid = $('lmsim-case-grid');
    if (!grid) return;
    grid.innerHTML = '';
    [CASE1, CASE2].forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'lmsim-case-card';
      card.innerHTML = `
        <div class="lmsim-case-badge">${esc(c.badge)}</div>
        <h3 class="lmsim-case-title">${esc(c.title)}</h3>
        <p class="lmsim-case-sub">${esc(c.subtitle)}</p>
        <div class="lmsim-case-meta">
          <span class="lmsim-meta-chip">${esc(c.difficulty)}</span>
          <span class="lmsim-meta-chip">⏱ ${esc(c.estTime)}</span>
          <span class="lmsim-meta-chip">${c.steps.length} decisions</span>
        </div>
        <button class="lmsim-start-btn" onclick="LMSim.startCase(${idx})">Start Simulation →</button>`;
      grid.appendChild(card);
    });
  }

  function startCase(idx) {
    _currentCase = idx === 0 ? CASE1 : CASE2;
    _currentStepIdx = 0;
    _score = 0;
    _maxScore = 0;
    _decisions = [];
    _answered = false;

    _currentCase.steps.forEach(s => {
      _maxScore += Math.max(...s.options.map(o => o.pts));
    });

    showScreen('lmsim-play');
    renderIntro();
  }

  function renderIntro() {
    const play = $('lmsim-play');
    if (!play) return;
    const c = _currentCase;
    play.innerHTML = `
      <div class="lmsim-intro-wrap">
        <div class="lmsim-intro-badge">${esc(c.badge)}</div>
        <h2 class="lmsim-intro-title">${esc(c.title)}</h2>
        <div class="lmsim-intro-meta">
          <span>${esc(c.difficulty)}</span><span>⏱ ${esc(c.estTime)}</span><span>${c.steps.length} key decisions</span>
        </div>
        <div class="lmsim-intro-narrative">${nl2br(c.intro)}</div>
        <div class="lmsim-intro-sop">
          <strong>SOP Foundation:</strong> Every scenario in this simulation is built directly from the Lead Manager Standard Operating Procedure: real steps, real decisions, real consequences.
        </div>
        <button class="lmsim-begin-btn" onclick="LMSim.nextStep()">Begin Simulation →</button>
        <button class="lmsim-back-link" onclick="LMSim.backToList()">← Choose a different case</button>
      </div>`;
  }

  function nextStep() {
    if (!_currentCase) return;
    if (_currentStepIdx >= _currentCase.steps.length) { renderFinalScore(); return; }
    renderStep(_currentCase.steps[_currentStepIdx]);
  }

  function renderStep(step) {
    const play = $('lmsim-play');
    if (!play) return;
    _answered = false;

    const pct = Math.round((_currentStepIdx / _currentCase.steps.length) * 100);

    const cardsHtml = (step.cards || []).map(c => `
      <div class="lmsim-info-card">
        <span class="lmsim-info-icon">${c.icon}</span>
        <div><div class="lmsim-info-label">${esc(c.label)}</div><div class="lmsim-info-text">${esc(c.text)}</div></div>
      </div>`).join('');

    const optsHtml = step.options.map((o, i) => `
      <button class="lmsim-option" onclick="LMSim.pick(${i})" id="lmsim-opt-${i}">
        <span class="lmsim-opt-letter">${String.fromCharCode(65+i)}</span>
        <span class="lmsim-opt-text">${esc(o.text)}</span>
      </button>`).join('');

    play.innerHTML = `
      <div class="lmsim-step-wrap">
        <div class="lmsim-progress-bar-row">
          <div class="lmsim-progress-track"><div class="lmsim-progress-fill" style="width:${pct}%"></div></div>
          <div class="lmsim-chips-row">
            <span class="lmsim-chip">Step ${_currentStepIdx+1} / ${_currentCase.steps.length}</span>
            <span class="lmsim-chip" id="lmsim-score-chip">Score: ${_score}/${_maxScore}</span>
          </div>
        </div>

        <div class="lmsim-phase-block">
          <div class="lmsim-phase-name">${esc(step.phase)}</div>
          <div class="lmsim-phase-sub">${esc(step.sub)}</div>
        </div>

        <div class="lmsim-narrative">${nl2br(step.narrative)}</div>

        ${cardsHtml ? `<div class="lmsim-cards-wrap">${cardsHtml}</div>` : ''}

        <div class="lmsim-decision-block">
          <div class="lmsim-decision-tag">DECISION POINT</div>
          <div class="lmsim-decision-q">${esc(step.question)}</div>
          <div class="lmsim-options-wrap" id="lmsim-opts">${optsHtml}</div>
          <div id="lmsim-fb" class="lmsim-fb" style="display:none"></div>
          <div id="lmsim-next-wrap" style="display:none;margin-top:18px"></div>
        </div>
      </div>`;
  }

  function pick(i) {
    if (_answered) return;
    _answered = true;

    const step = _currentCase.steps[_currentStepIdx];
    const opt = step.options[i];
    const maxPts = Math.max(...step.options.map(o => o.pts));

    document.querySelectorAll('.lmsim-option').forEach((btn, j) => {
      btn.disabled = true;
      const o = step.options[j];
      if (o.correct) btn.classList.add('lmsim-opt-correct');
      else if (o.pts > 0 && j === i) btn.classList.add('lmsim-opt-partial');
      if (j === i && !o.correct && o.pts === 0) btn.classList.add('lmsim-opt-wrong');
    });

    _score += opt.pts;
    _decisions.push({ stepNum: _currentStepIdx+1, phase: step.phase, question: step.question,
      chosen: opt.text, correct: opt.correct, pts: opt.pts, maxPts, fb: opt.fb });

    const fb = $('lmsim-fb');
    fb.style.display = 'block';
    const cls = opt.correct ? 'lmsim-fb-good' : opt.pts > 0 ? 'lmsim-fb-partial' : 'lmsim-fb-bad';
    fb.className = `lmsim-fb ${cls}`;
    fb.innerHTML = `
      <div class="lmsim-fb-head">
        ${opt.correct ? '✅ Right call.' : opt.pts > 0 ? '🟡 Partially correct.' : '❌ Not the best call.'}
        <span class="lmsim-fb-pts">+${opt.pts} / ${maxPts} pts</span>
      </div>
      <div class="lmsim-fb-body">${esc(opt.fb)}</div>`;

    const sc = $('lmsim-score-chip');
    if (sc) sc.textContent = `Score: ${_score}/${_maxScore}`;

    const nw = $('lmsim-next-wrap');
    nw.style.display = 'block';
    const isLast = _currentStepIdx >= _currentCase.steps.length - 1;
    nw.innerHTML = isLast
      ? `<button class="lmsim-next-btn lmsim-finish-btn" onclick="LMSim.renderFinalScore()">See Final Results →</button>`
      : `<button class="lmsim-next-btn" onclick="LMSim.advance()">Next Step →</button>`;

    _currentStepIdx++;
  }

  function advance() { nextStep(); }

  function renderFinalScore() {
    const play = $('lmsim-play');
    if (!play) return;
    const pct = _maxScore > 0 ? Math.round((_score / _maxScore) * 100) : 0;

    let band, msg;
    if (pct >= 90) {
      band = '🏆 Lead Manager Elite';
      msg = 'Outstanding. You handled inbox triage, CRM audits, compliance escalations, QA audits, coaching, reporting, and data corrections at a professional level. You\'re ready for the real role.';
    } else if (pct >= 75) {
      band = '⭐ Solid Practitioner';
      msg = 'Strong performance overall. Most SOP decisions were handled correctly. Review the feedback on missed decisions: they often involve the documentation and escalation steps that are easiest to skip under pressure.';
    } else if (pct >= 55) {
      band = '📈 Developing';
      msg = 'You\'re building the right foundation. The SOP has a lot of moving parts. Focus on escalation timing, documentation completeness, and CRM data integrity: those are where most points were lost.';
    } else {
      band = '📖 Keep Practicing';
      msg = 'This SOP is complex, which is why we practice. Focus on the three pillars: triage urgently, document everything, escalate recurring issues. Revisit the SOP steps and try again.';
    }

    const missed = _decisions.filter(d => !d.correct);
    const partial = _decisions.filter(d => !d.correct && d.pts > 0);

    const missedHtml = missed.length > 0 ? `
      <div class="lmsim-missed-section">
        <div class="lmsim-missed-title">Decisions to Review (${missed.length})</div>
        ${missed.map(d => `
          <div class="lmsim-missed-card">
            <div class="lmsim-missed-phase">${esc(d.phase)}</div>
            <div class="lmsim-missed-q">${esc(d.question)}</div>
            <div class="lmsim-missed-chosen">You chose: <em>"${esc(d.chosen)}"</em></div>
            <div class="lmsim-missed-fb">${esc(d.fb)}</div>
          </div>`).join('')}
      </div>` : `<div class="lmsim-perfect-notice">🎯 Perfect score, every decision was correct on the first try.</div>`;

    const caseIdx = _currentCase === CASE1 ? 0 : 1;

    play.innerHTML = `
      <div class="lmsim-result-wrap">
        <div class="lmsim-result-ring">
          <div class="lmsim-result-pct">${pct}%</div>
          <div class="lmsim-result-pts-label">${_score} / ${_maxScore} pts</div>
        </div>
        <div class="lmsim-result-band">${band}</div>
        <p class="lmsim-result-msg">${msg}</p>

        ${missedHtml}

        <div class="lmsim-sop-reminder">
          <div class="lmsim-sop-reminder-title">SOP Quick Reference: Key Principles</div>
          <ul>
            <li><strong>Triage first:</strong> Showing requests + data gaps beat routine audits every time.</li>
            <li><strong>Document everything:</strong> Findings, corrections, coaching sessions, escalations. If it\'s not in writing, it didn\'t happen.</li>
            <li><strong>Escalate patterns:</strong> One incident equals a correction request. Recurring means a management escalation.</li>
            <li><strong>Integrity on dates:</strong> Always use the original lead generation date, never today\'s date.</li>
            <li><strong>QA is proactive:</strong> You call leads to surface service quality issues before they surface themselves.</li>
            <li><strong>Territory map is law:</strong> What agents say about their territory doesn\'t override the map.</li>
          </ul>
        </div>

        <div class="lmsim-result-actions">
          <button class="lmsim-start-btn" onclick="LMSim.startCase(${caseIdx})">Retry This Case</button>
          <button class="lmsim-back-link-btn" onclick="LMSim.backToList()">← Try the Other Case</button>
        </div>
      </div>`;

    try {
      if (window.SCApp && window.rpMe) {
        SCApp.setModeScore(window.rpMe.id, 'lm', 'sim', _score, _maxScore);
      }
    } catch(e) {}
  }

  function showScreen(id) {
    ['lmsim-list','lmsim-play'].forEach(s => {
      const el = $(s);
      if (el) el.style.display = s === id ? 'block' : 'none';
    });
  }

  function backToList() {
    _currentCase = null; _currentStepIdx = 0; _score = 0; _decisions = [];
    showScreen('lmsim-list');
  }

  function init() { showScreen('lmsim-list'); renderCaseList(); }

  return { init, startCase, nextStep, advance, pick, renderFinalScore, backToList };

})();
