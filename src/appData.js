export const STORAGE_KEY = "reclaim-desktop-report-summaries";

export const reportTemplates = [
  {
    id: "ops",
    name: "Weekly ops",
    category: "Operations",
    text: `Weekly operations report

The onboarding team closed 48 customer setups this week, up 18% from last week. Average time to first value dropped from 6.2 days to 4.8 days after the new kickoff checklist was introduced.

Two risks remain visible. The CRM migration is delayed because one integration partner has not approved the new webhook format, and this could push the rollout by up to 10 days. Support volume also increased by 14% after the billing update, mainly from enterprise accounts.

Next steps:
- Product should confirm the webhook contract by Thursday.
- Finance must publish the revised billing FAQ before the next release window.
- Customer success needs one shared escalation owner for high-value renewals.

Overall, the team is moving faster, but cross-functional dependencies still need tighter ownership to keep the momentum.`
  },
  {
    id: "client",
    name: "Client status",
    category: "Client",
    text: `Client delivery update

Implementation is now 72% complete. Design approval was finalized on Tuesday and the engineering team completed the new reporting dashboard for staging review. UAT is scheduled to start next Monday.

There is one material risk. The API credentials for the billing connector are still pending from the client IT team, which could delay final validation by 5 business days.

Recommended next steps:
- Confirm API handoff owner today.
- Lock the UAT participant list before Friday.
- Share the launch checklist with stakeholders in advance.`
  },
  {
    id: "board",
    name: "Board brief",
    category: "Leadership",
    text: `Board update

ARR increased 9% quarter-over-quarter and gross retention held at 94%. New pipeline creation improved 17% after the outbound messaging refresh, while sales cycle length dropped from 49 to 43 days.

The main concern is margin pressure in the services line. Delivery costs rose 11% because two enterprise launches required more custom support than expected.

Management should review pricing guardrails, finalize the implementation playbook, and assign one executive sponsor to the enterprise expansion plan.`
  }
];

export const audienceOptions = [
  { value: "leadership", label: "Leadership" },
  { value: "client", label: "Client" },
  { value: "team", label: "Team" }
];

export const lengthOptions = [
  { value: "short", label: "Short" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" }
];

export const workflowCards = [
  {
    title: "Report Summarizer",
    copy: "Condense technical reports into the decisions, risks, and next steps teams actually need."
  },
  {
    title: "Presentation Generator",
    copy: "Turn source material into structured presentations for internal reviews and client updates."
  },
  {
    title: "Project Update Generator",
    copy: "Create concise stakeholder-ready progress updates without rewriting the same project story every week."
  }
];
