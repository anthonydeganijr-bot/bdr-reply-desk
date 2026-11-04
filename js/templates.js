/*
 * Reply templates. One per category that gets a reply.
 * Every draft ends with exactly one question. Categories that must not get a reply return null.
 * Placeholders are filled only from the reply and the rep's settings, never invented.
 */
(function (root) {
  'use strict';

  const TEMPLATES = {
    INTERESTED: (c) =>
`Hi ${c.first},

Thanks for getting back to me. I'd be glad to set up a 20-minute virtual meeting with ${c.tm} and me to walk through what this could look like for ${c.org}.

What day and time work best for you next week?

${c.sign}`,

    PRICING: (c) =>
`Hi ${c.first},

Thanks for the details${c.scope ? ` (${c.scope})` : ''}. Pricing depends on the courses and the number of students, so the fastest way to get you an accurate number is a 15-minute call with ${c.tm}, who covers your ${c.he ? 'institution' : 'state'}.

Would you have 15 minutes this week or next?

${c.sign}`,

    INFO_REQUEST: (c) =>
`Hi ${c.first},

Happy to. I've attached a one-page overview you can pass along to anyone else who would weigh in${c.he ? ', including your department or adoption committee' : ''}.

Would a 20-minute walkthrough be useful once you've had a look, and if so, what day works best?

${c.sign}`,

    REFERRAL_NAMED: (c) =>
`Hi ${c.first},

Thank you for pointing me to ${c.successor}. I'll reach out to them directly and mention that you sent me their way.

Is there anything about your ${c.orgShort} priorities you think I should know before I do?

${c.sign}`,

    EXAM_COPY: (c) =>
`Hi ${c.first},

Happy to help. I'll request instructor review access for you and send it over as soon as it's set up.

Once you've had a look, would a 15-minute walkthrough of the course tools be useful?

${c.sign}`,

    ROLE_CHANGE: (c) =>
`Hi ${c.first},

Thanks for letting me know. Who is the best person to talk with about ${c.topic} for that course now?

${c.sign}`,

    REFERRAL_UNNAMED: (c) =>
`Hi ${c.first},

Thanks for letting me know. Who would be the best person to talk with about ${c.topic} at ${c.org}?

${c.sign}`,

    LEFT_SUCCESSOR: (c) =>
`Hi ${c.successorFirst},

I was in touch with your predecessor about ${c.topic} for ${c.org}. I understand you're now the right person for this.

Would you be open to a 20-minute conversation in the next couple of weeks?

${c.sign}`,

    INCUMBENT: (c) =>
`Hi ${c.first},

Thanks for letting me know. A lot of ${c.he ? 'departments' : 'districts'} we work with were using another program when we first talked. If it's ever useful, I can show you a side-by-side and see whether we can save you money or add certifications you don't have now.

Would you be open to a 20-minute look when your renewal comes up?

${c.sign}`,

    NOT_INTERESTED: (c) =>
`Hi ${c.first},

Thanks for getting back to me. ${c.background}, I know how full your inbox is. If your priorities change and you want to look at ${c.topic}, feel free to keep my information.

Would it be all right if I checked back before ${c.nextCycle}?

${c.sign}`
  };

  // No reply for these, by design.
  const NO_REPLY = ['BOUNCE', 'OUT_OF_OFFICE', 'DO_NOT_CONTACT', 'LEFT_NO_SUCCESSOR', 'NEEDS_REVIEW'];

  function draft(decision, reply, settings) {
    if (NO_REPLY.includes(decision.category)) return null;
    const successor = decision.facts.successorNames[0] || decision.facts.successorEmails[0] || '';
    if ((decision.category === 'LEFT_SUCCESSOR' || decision.category === 'REFERRAL_NAMED') && !successor) return null;
    const successorFirst = decision.facts.successorNames[0]
      ? decision.facts.successorNames[0].replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.)\s+/, '').split(' ')[0]
      : 'there';
    const he = decision.vertical === 'HE';
    const org = reply.org || (he ? 'your institution' : 'your district');
    const ctx = {
      first: reply.fromFirst || 'there',
      org,
      orgShort: he ? 'department' : 'district',
      he,
      topic: he ? 'course materials, digital learning tools and certifications' : 'career and technical education courses and certifications',
      nextCycle: he ? 'adoption decisions for next term' : "next school year's budget planning",
      tm: settings.tm || 'our territory manager',
      sign: `${settings.rep || 'Your name'}\n${settings.title || 'Business Development Representative'}\n${settings.company || 'Pearson Career Ready'}`,
      background: settings.background || 'As a former teacher',
      successor,
      successorFirst,
      scope: decision.facts.scope.join(', ')
    };
    return TEMPLATES[decision.category](ctx);
  }

  const api = { draft, TEMPLATES, NO_REPLY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ReplyDeskTemplates = api;
})(typeof window !== 'undefined' ? window : globalThis);
