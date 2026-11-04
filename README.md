# BDR Reply Desk

**Innovation Day 2026. Theme: Reinventing How We Work Beyond AI Tools.**
Built by Anthony Degani, Business Development Representative, Pearson Career Ready (eDynamic Learning).

The rep makes every decision. The desk does the sorting, drafting and record cleanup. One rule set for higher ed and K-12, built to work for any Pearson BDR or inside sales team.

## The problem

A BDR's outreach generates a steady stream of replies: interested, pricing questions, "talk to someone else," "she retired," out of office, unsubscribe, bounces. Every one is handled by hand. Open it, decide what it is, find a template, fill it in, then fix the contact in Salesforce and the flow in Gong.

- My own volume: about **60 replies a day at about 4 minutes each**. That's four hours a day.
- Every rep does it differently. All five reps I shadowed in my first week track work outside the CRM, mostly in private spreadsheets.
- The judgment in each reply takes seconds. The assembly takes minutes, and those minutes come out of phone time, which is where district-level meetings get booked.

## The redesigned workflow

| Step | Who | What happens |
|---|---|---|
| Sort | Desk | Classifies each reply into one of 15 types with fixed rules and highlights the sentence that triggered it |
| Assemble | Desk | Picks the template, pre-fills it, sets the Gong flow action, lists the Salesforce cleanup |
| Decide | Rep | Reads, edits, can override, approves. Nothing moves without this |
| Call | Rep | The time saved goes to the phone |

Replies are worked in one daily batch instead of interrupting the day 60 times.

## One rule set, every vertical

The desk detects the vertical from the institution and adjusts the wording. The rules, guardrails and approval step stay the same.

- **Higher ed:** exam and desk copy requests, sabbaticals (out of office, never do-not-contact), "I no longer teach this course" (the contact stays active and only that course's outreach stops), adoption committees and course coordinators, and departments that switched platforms.
- **K-12:** retirements with a named successor, "talk to curriculum," district pricing questions with student counts.
- **Any vertical:** bounces, opt-outs, out of office, interested, pricing, referrals and not interested work the same way. A new vertical means new templates, not a rebuild.

## Hard lines, enforced in code and covered by tests

1. **Nothing sends.** The desk drafts and the rep sends.
2. **No invented facts.** A successor's name or email is used only if it appears word for word in the reply. If someone retired and named no one, no one is added.
3. **Out of office is never do-not-contact.** A leave of absence or sabbatical is treated as an auto-reply, even if it says "remove me." A faculty member who stops teaching a course stays an active contact.
4. **Do-not-contact gets no reply** and is removed from every flow, not just one.
5. **Deterministic.** Same input, same output, so every decision can be audited and explained.
6. **No prospect data.** The prototype runs entirely in the browser on synthetic replies. Every name, district and address in `data/` is invented.

## Return on investment

Defaults are in the ROI tab and can all be edited. The volume and time figures are mine. Everything else is a labeled assumption.

| Input | Value | Source |
|---|---|---|
| Replies per rep per day | 60 | My volume |
| Minutes per reply today | 4 | My estimate |
| Minutes per reply with the desk | 2 | Estimate, to be measured in the pilot |
| BDRs in the pilot | 13 | My team |
| Working days | 220 | Assumption |
| Loaded cost per hour | $36 | $58,000 / 2,080 x 1.3 |
| Build and pilot | 80 hours at $75 = $6,000 | Assumption, using existing licenses |

**Result:** 60 x (4 - 2) = 120 minutes, so **2 hours back per rep per day**. Across 13 reps that's 26 hours a day, the same as **3.3 more BDRs**. Over a year that's 5,720 hours, worth about **$206,000** in payroll time, against about $6,000 to build. Payback is under two weeks.

**Scale.** Each rep gets back about **$15,840 a year** of time (2 hours x 220 days x $36). My team is 13 BDRs. Pearson has more BDR and inside sales reps across higher ed, K-12 and other businesses. I haven't confirmed the total, so these rows are illustrative:

| Reps using it | Value per year |
|---|---|
| 13 (pilot) | $205,920 |
| 50 | $792,000 |
| 100 | $1,584,000 |
| 250 | $3,960,000 |

The rules and templates are shared, so each new team adds only setup time.

The bigger return is where the time goes. The playbook sets a 40-call daily minimum, and district-level outbound meetings come from the phone. Two hours a day back is two hours of calling.

## Path to production, all on tools Pearson already licenses

1. **Weeks 1-2, pilot as a check.** I classify each reply first, then compare with the desk. Each disagreement either fixes a rule or captures knowledge nobody had written down.
2. **Weeks 3-4, inside the tenant.** An Outlook rule feeds a folder, Power Automate runs the same rules, and a Teams approval card replaces this screen. Salesforce stays the source of truth, because Gong can't write to the CRM.
3. **Scale.** The rules and templates are a written standard. Any BDR or inside sales team in higher ed, K-12 or another Pearson business gets the same triage, and a new hire gets it on day one.

Open questions for ops: which Salesforce field carries an opt-out to Gong, and whether BDRs can use the Salesforce connector in Power Automate.

## Run it

- Open `index.html` in a browser. No install, no server, no API key.
- Tests: `node tests/run-tests.js` (66 checks: every sample's category, one question per draft, no invented successors, out of office and sabbaticals never treated as do-not-contact, course reassignment never treated as a departure, vertical detection, no reply to do-not-contact, deterministic output).

## Files

```
index.html               the desk (UI)
js/classifier.js         rules, flow actions, cleanup checklists
js/templates.js          reply templates, one question each
data/sample-replies.js   21 synthetic replies (higher ed and K-12) with expected categories
tests/run-tests.js       guardrail and accuracy tests
```
