export const MOCK_VERIFY_BENCHMARK = {
  benchmark_id: "VERIFY-SPRINT1-BENCHMARK",
  total_cases: 5,
  auto_processed_count: 3,
  escalated_count: 2,
  status: "PASS",
  summary: "Standard Sprint 1 criteria met: 3 routine claims auto-processed, 2 edge-cases escalated accurately.",
  results: [
    {
      testcase_id: "TC-VERIFY-01",
      case_name: "Standard business lunch (Routine)",
      claim_id: "CLM-001",
      amount: "$45.00",
      category: "Meals & Entertainment",
      expected_status: "AUTO_PROCESSED",
      actual_status: "AUTO_PROCESSED",
      uncertainty_category: "NONE",
      matched: true,
      confidence_score: 0.99,
      escalation_question: null,
      target_role: "System Automated (ERP Accounting)",
      rule_reference: "Article 5 & 8.1: Individual meals ≤ $120/day"
    },
    {
      testcase_id: "TC-VERIFY-02",
      case_name: "One-way airport taxi (Routine)",
      claim_id: "CLM-002",
      amount: "$35.00",
      category: "Local Transportation",
      expected_status: "AUTO_PROCESSED",
      actual_status: "AUTO_PROCESSED",
      uncertainty_category: "NONE",
      matched: true,
      confidence_score: 0.99,
      escalation_question: null,
      target_role: "System Automated (ERP Accounting)",
      rule_reference: "Article 9: One-way local transportation ≤ $150"
    },
    {
      testcase_id: "TC-VERIFY-03",
      case_name: "Hotel stay 1 night within cap (Routine)",
      claim_id: "CLM-003",
      amount: "$180.00",
      category: "Hotel & Lodging",
      expected_status: "AUTO_PROCESSED",
      actual_status: "AUTO_PROCESSED",
      uncertainty_category: "NONE",
      matched: true,
      confidence_score: 0.99,
      escalation_question: null,
      target_role: "System Automated (ERP Accounting)",
      rule_reference: "Article 7 & 21: Hotel ≤ $300/night, 1-night standard approval"
    },
    {
      testcase_id: "TC-VERIFY-04",
      case_name: "Restaurant receipt with blurry total amount",
      claim_id: "CLM-004",
      amount: "$450 / $480",
      category: "Meals & Entertainment",
      expected_status: "ESCALATED",
      actual_status: "ESCALATED",
      uncertainty_category: "UNCERTAIN_FACTS",
      matched: true,
      confidence_score: 0.97,
      escalation_question: "The receipt total is unreadable/blurry. Is the actual paid total $450.00 or $480.00?",
      target_role: "Employee / Accounts Payable",
      rule_reference: "Article 3.4: Questionable data handling - no arbitrary affirmation"
    },
    {
      testcase_id: "TC-VERIFY-05",
      case_name: "AI Workstation hardware purchase ($5,800)",
      claim_id: "CLM-005",
      amount: "$5,800.00",
      category: "Equipment & Hardware",
      expected_status: "ESCALATED",
      actual_status: "ESCALATED",
      uncertainty_category: "AUTHORITY_LIMIT",
      matched: true,
      confidence_score: 0.99,
      escalation_question: "Single purchase of $5,800 exceeds the $5,000 threshold. Should this be routed to Procurement or has prior contract approval been obtained?",
      target_role: "Procurement",
      rule_reference: "Article 4.4 & Article 13: Transactions > $5,000 must be handled via Procurement"
    }
  ]
};

export const MOCK_TESTCASES = [
  ...MOCK_VERIFY_BENCHMARK.results.map((r) => ({
    id: r.testcase_id,
    name: r.case_name,
    category: r.uncertainty_category,
    amount: r.amount,
    expected_status: r.expected_status,
    is_verify: true,
    description: `Official judge evaluation case. Category: ${r.category}.`
  })),
  {
    id: "TC-EXT-06",
    name: "Team dinner with alcoholic beverages (wine)",
    category: "POLICY_EXCEPTION",
    amount: "$250.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Dinner expense includes $120 of alcoholic beverages. Requires manager exception confirmation."
  },
  {
    id: "TC-EXT-07",
    name: "Airfare booked outside corporate travel platform",
    category: "POLICY_EXCEPTION",
    amount: "$320.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Employee booked emergency flight through external agency due to connectivity issues."
  },
  {
    id: "TC-EXT-08",
    name: "Last-minute flight booked 4 days prior to departure",
    category: "AUTHORITY_LIMIT",
    amount: "$410.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Urgent business travel booked 4 days ahead (under the 14-day policy requirement in Article 6.1)."
  },
  {
    id: "TC-EXT-09",
    name: "Project deployment hotel stay for 3 nights",
    category: "AUTHORITY_LIMIT",
    amount: "$660.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Multi-night hotel stay ($220/night = $660) requires direct manager itinerary review per Article 7."
  },
  {
    id: "TC-EXT-10",
    name: "Coworking space usage for 8 days in a month",
    category: "AUTHORITY_LIMIT",
    amount: "$520.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Coworking expense ($520) exceeds the 5 days per month allowance in Article 12.3."
  },
  {
    id: "TC-EXT-11",
    name: "Staff birthday gift card reimbursement",
    category: "POLICY_EXCEPTION",
    amount: "$50.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Birthday gift card $50 (gift cards are prohibited as per Article 12.5 & Article 15)."
  },
  {
    id: "TC-EXT-12",
    name: "Missing receipt without Affidavit form",
    category: "UNCERTAIN_FACTS",
    amount: "$130.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Receipt is missing and employee has not attached an authorized Missing Receipt Affidavit."
  },
  {
    id: "TC-EXT-13",
    name: "Expense claim submitted overdue (42 days ago)",
    category: "POLICY_EXCEPTION",
    amount: "$80.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Expense occurred 42 days ago (exceeds the 30-day deadline specified in Article 3.5)."
  },
  {
    id: "TC-EXT-14",
    name: "Self-approval attempt (Requester == Approver)",
    category: "AUTHORITY_LIMIT",
    amount: "$40.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Employee listed their own ID as designated approver (violating Requester != Approver rule)."
  },
  {
    id: "TC-EXT-15",
    name: "Monthly cumulative expenses exceed $10,000",
    category: "AUTHORITY_LIMIT",
    amount: "$1,200.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Claim of $1,200 raises monthly expense sum to $10,700, surpassing monthly threshold."
  },
  {
    id: "TC-EXT-16",
    name: "Suspected transaction splitting (smurfing)",
    category: "UNCERTAIN_FACTS",
    amount: "$4,900.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Two electronic component invoices of $4,900 on the same date to circumvent the $5,000 limit."
  }
];

export const MOCK_METRICS = {
  total_claims_processed: 120,
  escalated_count: 26,
  auto_processed_count: 94,
  escalation_rate: "21.6%",
  benchmark_accuracy: "100.0%",
  metrics: {
    false_negative_rate: "0.0%",
    false_negative_desc: "Missed escalation rate (routine mistakenly approved)",
    false_positive_rate: "0.0%",
    false_positive_desc: "Unnecessary escalation rate (simple claims escalated)",
    avg_confidence_score: 0.982,
    avg_decision_latency_ms: 15
  },
  distribution_by_category: {
    UNCERTAIN_FACTS: 6,
    POLICY_EXCEPTION: 8,
    AUTHORITY_LIMIT: 12
  }
};

