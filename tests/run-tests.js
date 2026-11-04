// Run with: node tests/run-tests.js
const { classify } = require('../js/classifier.js');
const { draft } = require('../js/templates.js');
const samples = require('../data/sample-replies.js');
const settings = { rep: 'Test Rep', tm: 'Test TM', company: 'Pearson Career Ready' };
let pass = 0, fail = 0;
function check(name, ok, detail) { if (ok) pass++; else { fail++; console.log('FAIL', name, detail || ''); } }

for (const r of samples) {
  const d = classify(r);
  check(`#${r.id} category`, d.category === r.expect, `got ${d.category}, expected ${r.expect}`);
  const text = draft(d, r, settings);
  if (text) {
    const qs = (text.match(/\?/g) || []).length;
    check(`#${r.id} one question`, qs === 1, `${qs} questions`);
    check(`#${r.id} no internal meeting names`, !/Career Ready (Phone Call|Introductory Meeting)/.test(text));
  }
}

// Guardrail 1: never invent a successor. Every name or email in a draft must appear in the reply.
for (const r of samples) {
  const d = classify(r);
  for (const n of [...d.facts.successorNames, ...d.facts.successorEmails]) {
    check(`#${r.id} successor is verbatim`, r.body.includes(n), n);
  }
}
const noName = classify({ body: 'John Doe has retired. Thanks.', fromEmail: 'x@y.example' });
check('left with no successor gets no draft', draft(noName, {}, settings) === null);

// Guardrail 2: a leave of absence is never do-not-contact and never "left".
for (const body of ['I am on medical leave until March. Please remove me from urgent lists.',
                    'Out of office. Unsubscribe me from nothing, I am just away until Friday.']) {
  const d = classify({ body });
  check('leave is OOO: ' + body.slice(0, 30), d.category === 'OUT_OF_OFFICE', d.category);
}

// Guardrail 2b: sabbatical and course reassignment are never departures or do-not-contact.
check('sabbatical is OOO', classify({ body: 'On sabbatical this term. Remove me from urgent lists.' }).category === 'OUT_OF_OFFICE');
check('no longer teaching is not LEFT', classify({ body: "I'm no longer teaching this course." }).category === 'ROLE_CHANGE');
// Vertical detection
check('HE detected', classify({ body: 'Not interested.', org: 'Riverton Community College' }).vertical === 'HE');
check('K12 detected', classify({ body: 'Not interested.', org: 'Granite Falls Regional School District' }).vertical === 'K12');
const heDraft = draft(classify({ body: "I'm not the right person.", org: 'Eastport University' }), { org: 'Eastport University', fromFirst: 'A' }, settings);
check('HE draft uses HE wording', /course materials/.test(heDraft) && !/career and technical/.test(heDraft), heDraft);

// Guardrail 3: do-not-contact never gets a reply.
const dnc = classify({ body: 'Stop emailing me.' });
check('DNC category', dnc.category === 'DO_NOT_CONTACT', dnc.category);
check('DNC has no draft', draft(dnc, {}, settings) === null);

// Guardrail 4: deterministic.
const a = JSON.stringify(classify(samples[0])), b = JSON.stringify(classify(samples[0]));
check('same input same output', a === b);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
