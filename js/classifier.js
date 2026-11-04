/*
 * Reply Desk classifier.
 * Deterministic rules: same input, same output, every time.
 * It reads one prospect reply and returns a decision the rep reviews.
 * It never sends, never writes to a CRM, and never supplies a fact
 * (a name, an email, a title) that is not written in the reply itself.
 */
(function (root) {
  'use strict';

  const CATEGORIES = {
    BOUNCE:            { label: 'Bounce',                    tone: 'muted' },
    LEFT_SUCCESSOR:    { label: 'Left / retired, successor named', tone: 'warn' },
    LEFT_NO_SUCCESSOR: { label: 'Left / retired, no successor',    tone: 'warn' },
    OUT_OF_OFFICE:     { label: 'Out of office',             tone: 'muted' },
    DO_NOT_CONTACT:    { label: 'Do not contact',            tone: 'stop' },
    ROLE_CHANGE:       { label: 'No longer teaches / owns this', tone: 'warn' },
    EXAM_COPY:         { label: 'Exam / desk copy request',  tone: 'hot' },
    PRICING:           { label: 'Pricing / quote request',   tone: 'hot' },
    INTERESTED:        { label: 'Interested, wants a meeting', tone: 'hot' },
    INFO_REQUEST:      { label: 'Send me information',       tone: 'hot' },
    REFERRAL_NAMED:    { label: 'Referral, person named',    tone: 'warm' },
    REFERRAL_UNNAMED:  { label: 'Referral, no name given',   tone: 'warm' },
    INCUMBENT:         { label: 'Uses another product',      tone: 'cool' },
    NOT_INTERESTED:    { label: 'Not interested',            tone: 'cool' },
    NEEDS_REVIEW:      { label: 'Needs human review',        tone: 'stop' }
  };

  // Order matters: the first rule that matches wins.
  const RULES = [
    { cat: 'BOUNCE', patterns: [
      /undeliverable/i, /delivery (has )?failed/i, /address (was )?not found/i,
      /mailbox (is )?(unavailable|full|not found)/i, /\b550\b/, /could not be delivered/i,
      /recipient (address )?rejected/i ] },
    { cat: 'LEFT', patterns: [
      /\bno longer (with|at|employed|working)\b/i, /\bhas retired\b/i, /\bhave retired\b/i,
      /\bi('m| am) retired\b/i, /\bretired (from|as of|in)\b/i, /\bhas left\b/i, /\bhave left\b/i,
      /\bleft the (district|school|college|organization)\b/i, /\bis no longer in (this|that) (role|position)\b/i,
      /\bthis (mailbox|account) is no longer (monitored|active)\b/i ] },
    { cat: 'ROLE_CHANGE', patterns: [
      /\bno longer (teach|teaching|coordinat\w*|in charge of|responsible for|cover\w*|oversee\w*)\b/i,
      /\bnot teaching (this|that|the) (course|class)\b/i, /\b(course|class) (was|has been) reassigned\b/i,
      /\bsomeone else (is )?(now )?teaching\b/i ] },
    { cat: 'OUT_OF_OFFICE', patterns: [
      /\bon sabbatical\b/i,
      /out of (the )?office/i, /\bon (maternity|paternity|medical|family|parental)? ?leave\b/i,
      /\baway (from|until|through)\b/i, /limited access to (my )?e-?mail/i,
      /\bwill (return|be back)\b/i, /\breturning on\b/i, /automatic reply/i ] },
    { cat: 'DO_NOT_CONTACT', patterns: [
      /\bunsubscribe\b/i, /\bremove me\b/i, /\btake me off\b/i, /\bstop (emailing|contacting|sending)\b/i,
      /\bdo not (contact|email)\b/i, /\bdon'?t (contact|email) me\b/i, /\bopt(ed)? out\b/i ] },
    { cat: 'EXAM_COPY', patterns: [
      /\b(exam|desk|review|evaluation|instructor|examination) cop(y|ies)\b/i, /\binstructor (review )?access\b/i,
      /\breview access\b/i, /\bsample (chapter|access)\b/i ] },
    { cat: 'PRICING', patterns: [
      /\bpric(e|es|ing)\b/i, /\bquote\b/i, /\bhow much\b/i, /\bcost(s)?\b/i, /\bper[- ](student|seat|license)\b/i ] },
    { cat: 'INTERESTED', patterns: [
      /\b(set up|schedule|book) (a )?(time|call|meeting|demo)\b/i, /\bhappy to (meet|chat|talk|connect)\b/i,
      /\bi('m| am) interested\b/i, /\bwe('re| are) interested\b/i, /\bwould (love|like) to (learn|see|hear|meet|chat)\b/i,
      /\bwhat times\b/i, /\bavailable (on|next|this)\b/i, /\bdemo\b/i ] },
    { cat: 'INFO_REQUEST', patterns: [
      /\bsend (me |us )?(some |more )?(info|information|details|materials|a brochure|something)\b/i,
      /\btell me more\b/i, /\bmore information\b/i ] },
    { cat: 'REFERRAL', patterns: [
      /\bnot the (right|best|correct) (person|contact)\b/i, /\bwrong person\b/i,
      /\byou (should|might|may want to|will want to) (reach out|contact|talk|speak|email)\b/i,
      /\bplease (contact|reach out to|email)\b/i, /\bhandles (this|that|our|purchasing|cte)\b/i,
      /\bforward(ed|ing)? (this|your email) to\b/i, /\bcc'?d\b/i, /\bcopying\b/i,
      /\bdecided by (a |an |our |the )?(\w+ )?committee\b/i, /\b(course coordinator|department chair|program director) (decides|chooses|selects|handles)\b/i ] },
    { cat: 'INCUMBENT', patterns: [
      /\b(already|currently) (use|using|have|has|partner with|work with)\b/i,
      /\bwe use\b/i, /\bunder contract with\b/i, /\b(adopted|switched to) (another|a different)\b/i, /\bhappy with (our|what we)\b/i ] },
    { cat: 'NOT_INTERESTED', patterns: [
      /\bnot interested\b/i, /\bno (thank you|thanks)\b/i, /\bno need\b/i, /\bnot at this time\b/i,
      /\bnot a fit\b/i, /\bno budget\b/i, /\bpass on this\b/i, /\bnot (looking|in the market)\b/i ] }
  ];

  const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  // A name is only taken when a cue word sits right before it, and it must look like a name.
  const NAME_CUE_RE = /\b(?:contact|reach out to|email|speak with|talk to|speak to|connect with|replacement is|replaced by|successor is|new (?:director|coordinator|principal|contact) is|taken over by|forwarded (?:this|your email) to|cc'?d|copying|handles this is|would be)\s+(?:(?:our|my|the)\s+[A-Za-z ]+?,?\s+)?((?:Dr\.|Mr\.|Ms\.|Mrs\.)\s+)?([A-Z][a-z]+(?:[-'][A-Z][a-z]+)?\s+[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?)/g;
  const RETURN_RE = /\b(?:return|be back|returning)(?: to the office)?(?: on| by)?\s+((?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,?\s+)?([A-Z][a-z]+\.? \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i;
  const STUDENTS_RE = /\b(?:about |around |roughly |over |nearly )?\d[\d,]*\s+students\b/i;
  const SCHOOLS_RE = /\b(?:one|two|three|four|five|six|\d+)\s+(?:high |middle |elementary )?schools\b/i;

  function firstMatch(text, patterns) {
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return m;
    }
    return null;
  }

  function sentenceAround(text, index) {
    const start = Math.max(text.lastIndexOf('.', index - 1), text.lastIndexOf('\n', index - 1)) + 1;
    let end = text.slice(index).search(/[.!?\n]/);
    end = end === -1 ? text.length : index + end + 1;
    return text.slice(start, end).trim();
  }

  function extractFacts(text, senderEmail) {
    const own = (senderEmail || '').toLowerCase();
    const emails = [...new Set((text.match(EMAIL_RE) || []).map(e => e.replace(/[.,;]+$/, '')))]
      .filter(e => e.toLowerCase() !== own);
    const names = [];
    let m;
    NAME_CUE_RE.lastIndex = 0;
    while ((m = NAME_CUE_RE.exec(text)) !== null) {
      const name = ((m[1] || '') + m[2]).trim();
      if (!names.includes(name)) names.push(name);
    }
    const ret = text.match(RETURN_RE);
    const students = text.match(STUDENTS_RE);
    const schools = text.match(SCHOOLS_RE);
    return {
      successorNames: names,            // verbatim from the reply, or empty
      successorEmails: emails,          // verbatim from the reply, or empty
      returnDate: ret ? ret[0] : null,
      scope: [students && students[0], schools && schools[0]].filter(Boolean)
    };
  }

  function classify(reply) {
    const text = (reply.body || '').trim();
    vertical = verticalOf(reply);
    const subject = reply.subject || '';
    const haystack = subject + '\n' + text;
    const facts = extractFacts(text, reply.fromEmail);
    const hasSuccessor = facts.successorNames.length > 0 || facts.successorEmails.length > 0;

    if (!text) return decide('NEEDS_REVIEW', 'Empty reply', '', facts, 'low');

    for (const rule of RULES) {
      const m = firstMatch(haystack, rule.patterns);
      if (!m) continue;
      const evidence = sentenceAround(haystack, m.index);

      if (rule.cat === 'LEFT') {
        // Guardrail: a leave of absence is an out-of-office, never a departure.
        if (/\bon (maternity|paternity|medical|family|parental) leave\b|\bon sabbatical\b/i.test(haystack) && !/\bno longer\b|\bretired\b/i.test(haystack)) {
          return decide('OUT_OF_OFFICE', 'Leave of absence', evidence, facts, 'high');
        }
        return decide(hasSuccessor ? 'LEFT_SUCCESSOR' : 'LEFT_NO_SUCCESSOR', m[0], evidence, facts, 'high');
      }
      if (rule.cat === 'ROLE_CHANGE') {
        // Still at the institution, so never 'left' and never do-not-contact.
        return decide(hasSuccessor ? 'REFERRAL_NAMED' : 'ROLE_CHANGE', m[0], evidence, facts, 'high');
      }
      if (rule.cat === 'OUT_OF_OFFICE') {
        // An auto-reply that also asks to be removed is still only an auto-reply. Never DNC an out-of-office.
        return decide('OUT_OF_OFFICE', m[0], evidence, facts, 'high');
      }
      if (rule.cat === 'REFERRAL') {
        return decide(hasSuccessor ? 'REFERRAL_NAMED' : 'REFERRAL_UNNAMED', m[0], evidence, facts, hasSuccessor ? 'high' : 'medium');
      }
      if (rule.cat === 'INTERESTED' || rule.cat === 'INFO_REQUEST') {
        // A hot reply that also names someone else is a referral with intent; keep it hot, surface the name.
        return decide(rule.cat, m[0], evidence, facts, 'high');
      }
      if (rule.cat === 'NOT_INTERESTED' && hasSuccessor) {
        return decide('REFERRAL_NAMED', m[0], evidence, facts, 'medium');
      }
      return decide(rule.cat, m[0], evidence, facts, 'high');
    }
    return decide('NEEDS_REVIEW', 'No rule matched', text.slice(0, 160), facts, 'low');
  }

  let vertical = 'K12';
  // Same rules for every vertical. Only the wording of the cleanup steps changes.
  function verticalOf(reply) {
    const hay = (reply.org || '') + ' ' + (reply.fromEmail || '');
    return /college|university|institute|polytechnic|\.edu\b|\.cc\./i.test(hay) ? 'HE' : 'K12';
  }
  function localize(steps, v) {
    if (v !== 'HE') return steps;
    return steps.map(s => s.replace(/district staff directory/g, 'department or faculty directory')
      .replace(/district website/g, 'institution website'));
  }
  function decide(category, trigger, evidence, facts, confidence) {
    return { category, label: CATEGORIES[category].label, tone: CATEGORIES[category].tone,
      trigger, evidence, facts, confidence, vertical,
      flowAction: localize([FLOW_ACTIONS[category]], vertical)[0], checklist: localize(CHECKLISTS[category], vertical) };
  }

  // What happens to the prospect's Gong flow. A reply only PAUSES a flow; it does not remove the person.
  const FLOW_ACTIONS = {
    BOUNCE:            'Remove from flow. Mark the email invalid.',
    LEFT_SUCCESSOR:    'Remove from all flows. Add the named successor to a flow only after you confirm them on the district website.',
    LEFT_NO_SUCCESSOR: 'Remove from all flows. No replacement is added.',
    OUT_OF_OFFICE:     'Leave the flow running. Never mark do-not-contact.',
    DO_NOT_CONTACT:    'Remove from ALL flows and set the opt-out flag. No reply is sent.',
    ROLE_CHANGE:       'Remove from this flow only. They are still at the institution, so no do-not-contact.',
    EXAM_COPY:         'Remove from flow. Request review access, then follow up for a walkthrough.',
    PRICING:           'Remove from flow. Book a short pricing call with the territory manager.',
    INTERESTED:        'Remove from flow. Book the meeting.',
    INFO_REQUEST:      'Remove from flow. Send the one-pager and ask for a meeting.',
    REFERRAL_NAMED:    'Remove the replier. Add the named contact to a flow after you confirm them.',
    REFERRAL_UNNAMED:  'Pause. Reply asking who the right person is.',
    INCUMBENT:         'Remove from flow. Send the comparison reply.',
    NOT_INTERESTED:    'Remove from flow. Send the soft close. Do not mark do-not-contact unless they asked.',
    NEEDS_REVIEW:      'No action until you read it.'
  };

  // The record cleanup the rep does today by hand, written as a checklist.
  const CHECKLISTS = {
    BOUNCE: ['File the bounce in the Bounced folder', 'Salesforce: flag the email as invalid on the contact', 'Gong: remove from the flow'],
    LEFT_SUCCESSOR: ['Salesforce: clear the title and set status to left / retired', 'Gong: remove from every flow and mark do-not-contact (person has left)',
      'Check the named successor on the district staff directory', 'Salesforce: search for the successor; create the contact only if missing', 'Gong: add the successor to the right flow'],
    LEFT_NO_SUCCESSOR: ['Salesforce: clear the title and set status to left / retired', 'Gong: remove from every flow and mark do-not-contact (person has left)',
      'Optional: find the current role holder on the district website (published source only)'],
    OUT_OF_OFFICE: ['File in Handled', 'No record changes'],
    DO_NOT_CONTACT: ['Gong: remove from every flow', 'Salesforce: set the opt-out field (confirm the field name with ops)', 'Send nothing'],
    ROLE_CHANGE: ['Salesforce: update the title or course on the contact (keep the contact active)', 'Gong: remove from this flow only', 'Watch for the name of who owns it now'],
    EXAM_COPY: ['Request instructor review access for the title they named', 'Salesforce: log the request on the contact', 'Set a follow-up for one week out'],
    PRICING: ['Salesforce: create the BDR opportunity first, then the meeting event', 'Invite the territory manager', 'Note the scope they gave (students, schools)'],
    INTERESTED: ['Salesforce: create the BDR opportunity first, then the meeting event', 'Invite the territory manager', 'Send the confirmation and reminders'],
    INFO_REQUEST: ['Attach the right one-pager', 'Log the activity in Salesforce'],
    REFERRAL_NAMED: ['Check the named contact on the district staff directory', 'Salesforce: search; create the contact only if missing', 'Gong: add to a flow; remove the replier'],
    REFERRAL_UNNAMED: ['Log the reply in Salesforce', 'Watch for the name in their answer'],
    INCUMBENT: ['Salesforce: note the incumbent product on the account', 'Gong: remove from flow'],
    NOT_INTERESTED: ['Salesforce: log the reply', 'Gong: remove from flow'],
    NEEDS_REVIEW: ['Read it and pick the category by hand']
  };

  const api = { classify, extractFacts, verticalOf, CATEGORIES, FLOW_ACTIONS, CHECKLISTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ReplyDeskClassifier = api;
})(typeof window !== 'undefined' ? window : globalThis);
