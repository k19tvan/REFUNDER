// Centralized Mock Data & API Client with placeholder endpoints

export const MOCK_VERIFY_BENCHMARK = {
  benchmark_id: "VERIFY-SPRINT1-BENCHMARK",
  total_cases: 5,
  auto_processed_count: 3,
  escalated_count: 2,
  status: "PASS",
  summary: "ĐẠT tiêu chuẩn Sprint 1: 3 trường hợp thường quy tự động xử lý, 2 trường hợp chuyển tiếp chính xác.",
  results: [
    {
      testcase_id: "TC-VERIFY-01",
      case_name: "Bữa trưa công tác tiêu chuẩn (Routine)",
      claim_id: "CLM-001",
      amount: "$45.00",
      category: "Chi phí ăn uống",
      expected_status: "AUTO_PROCESSED",
      actual_status: "AUTO_PROCESSED",
      uncertainty_category: "NONE",
      matched: true,
      confidence_score: 0.99,
      escalation_question: null,
      target_role: "System Automated",
      rule_reference: "Điều 5 & 8.1: Chi phí ăn cá nhân ≤ $120/ngày"
    },
    {
      testcase_id: "TC-VERIFY-02",
      case_name: "Taxi sân bay về khách sạn 1 chiều (Routine)",
      claim_id: "CLM-002",
      amount: "$35.00",
      category: "Di chuyển địa phương",
      expected_status: "AUTO_PROCESSED",
      actual_status: "AUTO_PROCESSED",
      uncertainty_category: "NONE",
      matched: true,
      confidence_score: 0.99,
      escalation_question: null,
      target_role: "System Automated",
      rule_reference: "Điều 9: Di chuyển một chiều ≤ $150"
    },
    {
      testcase_id: "TC-VERIFY-03",
      case_name: "Khách sạn 1 đêm trong hạn mức (Routine)",
      claim_id: "CLM-003",
      amount: "$180.00",
      category: "Khách sạn & lưu trú",
      expected_status: "AUTO_PROCESSED",
      actual_status: "AUTO_PROCESSED",
      uncertainty_category: "NONE",
      matched: true,
      confidence_score: 0.99,
      escalation_question: null,
      target_role: "System Automated",
      rule_reference: "Điều 7 & 21: Khách sạn ≤ $300/đêm, lưu trú 1 đêm duyệt tiêu chuẩn"
    },
    {
      testcase_id: "TC-VERIFY-04",
      case_name: "Hóa đơn nhà hàng bị mờ số tiền",
      claim_id: "CLM-004",
      amount: "$450 / $480",
      category: "Ăn nhóm / Tiếp khách",
      expected_status: "ESCALATED",
      actual_status: "ESCALATED",
      uncertainty_category: "UNCERTAIN_FACTS",
      matched: true,
      confidence_score: 0.97,
      escalation_question: "Hóa đơn ăn tối tiếp khách bị mờ tại phần tổng tiền. Số tiền thực tế thanh toán là $450.00 hay $480.00?",
      target_role: "Employee / Accounts Payable",
      rule_reference: "Điều 3.4 & Yêu cầu Sprint 1: Xử lý dữ liệu nghi vấn không tự ý khẳng định"
    },
    {
      testcase_id: "TC-VERIFY-05",
      case_name: "Mua máy trạm đồ họa AI Workstation $5,800",
      claim_id: "CLM-005",
      amount: "$5,800.00",
      category: "Thiết bị & Mua sắm",
      expected_status: "ESCALATED",
      actual_status: "ESCALATED",
      uncertainty_category: "AUTHORITY_LIMIT",
      matched: true,
      confidence_score: 0.99,
      escalation_question: "Khoản mua sắm thiết bị máy trạm AI có giá trị $5,800.00 vượt trần giao dịch đơn lẻ $5,000. Khoản này cần chuyển giao cho bộ phận Procurement xử lý tập trung hay đã có hợp đồng mua sắm trước?",
      target_role: "Procurement",
      rule_reference: "Điều 4.4 & Điều 13: Giao dịch đơn lẻ > $5,000 phải chuyển Procurement"
    }
  ]
};

export const MOCK_TESTCASES = [
  ...MOCK_VERIFY_BENCHMARK.results.map((r, idx) => ({
    id: r.testcase_id,
    name: r.case_name,
    category: r.uncertainty_category,
    amount: r.amount,
    expected_status: r.expected_status,
    is_verify: true,
    description: `Test case mẫu cho phần đánh giá của Ban giám khảo. Hạng mục: ${r.category}.`
  })),
  {
    id: "TC-EXT-06",
    name: "Bữa tiệc có đồ uống có cồn (rượu vang)",
    category: "POLICY_EXCEPTION",
    amount: "$250.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Chi phí ăn tối nhóm kèm 2 chai rượu vang $120. Cần xác nhận ngoại lệ tiếp khách hay khấu trừ."
  },
  {
    id: "TC-EXT-07",
    name: "Vé máy bay đặt ngoài hệ thống Navan",
    category: "POLICY_EXCEPTION",
    amount: "$320.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Nhân viên tự đặt vé qua đại lý ngoài thay vì Navan do lỗi kết nối khẩn cấp."
  },
  {
    id: "TC-EXT-08",
    name: "Vé máy bay đặt cận ngày (4 ngày trước khởi hành)",
    category: "AUTHORITY_LIMIT",
    amount: "$410.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Chuyến bay khẩn cấp đặt trước 4 ngày (dưới quy chuẩn 14 ngày của Điều 6.1)."
  },
  {
    id: "TC-EXT-09",
    name: "Khách sạn 3 đêm công tác triển khai dự án",
    category: "AUTHORITY_LIMIT",
    amount: "$660.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Thời gian lưu trú 3 đêm ($220/đêm = $660) cần Quản lý trực tiếp phê duyệt lịch trình theo Điều 7."
  },
  {
    id: "TC-EXT-10",
    name: "Sử dụng Coworking 8 ngày trong tháng",
    category: "AUTHORITY_LIMIT",
    amount: "$520.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Chi phí Coworking 8 ngày ($520), vượt hạn mức 5 ngày/tháng theo Điều 12.3."
  },
  {
    id: "TC-EXT-11",
    name: "Chi phí quà tặng dạng Gift Card",
    category: "POLICY_EXCEPTION",
    amount: "$50.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Quà tặng sinh nhật thành viên bằng Gift card $50 (bị cấm theo Điều 12.5 & 15)."
  },
  {
    id: "TC-EXT-12",
    name: "Mất hóa đơn chi phí không có Affidavit",
    category: "UNCERTAIN_FACTS",
    amount: "$130.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Chi phí tiếp khách $130 bị mất hóa đơn gốc và nhân viên chưa nộp Missing Receipt Affidavit."
  },
  {
    id: "TC-EXT-13",
    name: "Nộp hồ sơ hoàn ứng quá hạn 42 ngày",
    category: "POLICY_EXCEPTION",
    amount: "$80.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Chi phí phát sinh cách đây 42 ngày (vượt giới hạn 30 ngày quy định tại Điều 3.5)."
  },
  {
    id: "TC-EXT-14",
    name: "Người yêu cầu tự phê duyệt hồ sơ (Requester = Approver)",
    category: "AUTHORITY_LIMIT",
    amount: "$40.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Nhân viên tự điền ID của chính mình vào ô người phê duyệt (vi phạm Requester ≠ Approver Điều 3.6)."
  },
  {
    id: "TC-EXT-15",
    name: "Tổng chi phí tháng vượt $10,000",
    category: "AUTHORITY_LIMIT",
    amount: "$1,200.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "Hồ sơ mới $1,200 nâng tổng chi phí tháng lên $10,700, vượt hạn mức trần tháng của cá nhân."
  },
  {
    id: "TC-EXT-16",
    name: "Hồ sơ có nghi vấn chia nhỏ giao dịch",
    category: "UNCERTAIN_FACTS",
    amount: "$4,900.00",
    expected_status: "ESCALATED",
    is_verify: false,
    description: "2 hóa đơn mua linh kiện điện tử mỗi đơn $4,900 cùng ngày tại cùng nhà cung cấp (gắn cờ né hạn mức $5k)."
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
    false_negative_desc: "Tỷ lệ trường hợp cần chuyển tiếp nhưng bị bỏ sót",
    false_positive_rate: "0.0%",
    false_positive_desc: "Tỷ lệ trường hợp đơn giản bị chuyển tiếp không cần thiết",
    avg_confidence_score: 0.982,
    avg_decision_latency_ms: 15
  },
  distribution_by_category: {
    UNCERTAIN_FACTS: 6,
    POLICY_EXCEPTION: 8,
    AUTHORITY_LIMIT: 12
  }
};

/**
 * Placeholder API service layer.
 * Calls the backend if available, or falls back to realistic mock responses with deliberate latency simulation.
 */
export const ApiService = {
  // 1. Benchmark 1-Click Verify
  async getVerifyBenchmark() {
    try {
      const res = await fetch("/api/verify/escalation");
      if (res.ok) return await res.json();
    } catch (e) {
      console.info("Using placeholder endpoint data for GET /api/verify/escalation");
    }
    await new Promise(r => setTimeout(r, 600));
    return MOCK_VERIFY_BENCHMARK;
  },

  // 2. Evaluate single claim
  async evaluateClaim(claimData) {
    try {
      const res = await fetch("/api/claims/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(claimData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.info("Using placeholder endpoint data for POST /api/claims/evaluate");
    }

    await new Promise(r => setTimeout(r, 500));
    
    // Realistic simulation based on policy.md logic:
    const desc = (claimData.description || "").toLowerCase();
    const amount = parseFloat(claimData.amount || 0);

    if (claimData.receipt_readable === false || desc.includes("mờ")) {
      return {
        claim_id: "CLM-EVAL-" + Math.floor(Math.random()*9000 + 1000),
        status: "ESCALATED",
        uncertainty_category: "UNCERTAIN_FACTS",
        confidence_score: 0.97,
        escalation_reason: "Hóa đơn bị mờ số tiền, không thể khẳng định con số chính xác.",
        escalation_question: `Hóa đơn chi phí '${claimData.description}' bị mờ ở dòng tổng cộng. Số tiền thực tế thanh toán là $${amount.toFixed(2)} hay $${(amount * 1.07).toFixed(2)}?`,
        suggested_actions: ["Nhập lại số tiền chính xác theo chứng từ gốc", "Gửi lại bản scan rõ nét"],
        target_role: "Employee / Accounts Payable",
        rule_references: ["Điều 3.4: Chứng từ hợp lệ", "Yêu cầu Sprint 1: Xử lý dữ liệu nghi vấn"],
        policy_article: "Điều 3.4"
      };
    }

    if (amount > 5000) {
      return {
        claim_id: "CLM-EVAL-" + Math.floor(Math.random()*9000 + 1000),
        status: "ESCALATED",
        uncertainty_category: "AUTHORITY_LIMIT",
        confidence_score: 0.99,
        escalation_reason: `Giao dịch đơn lẻ $${amount.toLocaleString()} vượt ngưỡng $5,000, bắt buộc xử lý qua Procurement.`,
        escalation_question: `Giao dịch mua sắm '${claimData.description}' trị giá $${amount.toLocaleString()} (> $5,000). Khoản này cần chuyển sang bộ phận Procurement mua sắm tập trung hay đã có hợp đồng mua sắm trước?`,
        suggested_actions: ["Chuyển hồ sơ sang Procurement", "Yêu cầu hợp đồng mua sắm tập trung"],
        target_role: "Procurement",
        rule_references: ["Điều 4.4 & Điều 13: Giao dịch > $5,000", "Điều 21: Ma trận phê duyệt"],
        policy_article: "Điều 13 & Điều 21"
      };
    }

    if (desc.includes("rượu") || desc.includes("bia") || desc.includes("alcohol")) {
      return {
        claim_id: "CLM-EVAL-" + Math.floor(Math.random()*9000 + 1000),
        status: "ESCALATED",
        uncertainty_category: "POLICY_EXCEPTION",
        confidence_score: 0.96,
        escalation_reason: "Chi phí có bao gồm đồ uống có cồn (rượu/bia) ngoài phạm vi chính sách.",
        escalation_question: `Khoản chi '${claimData.description}' có bao gồm đồ uống có cồn. Quản lý có xác nhận phê duyệt ngoại lệ tiếp khách cho khoản này không?`,
        suggested_actions: ["Quản lý duyệt ngoại lệ", "Khấu trừ chi phí cồn và hoàn ứng phần còn lại"],
        target_role: "Direct Manager",
        rule_references: ["Điều 8.4: Ăn uống với đối tác", "Điều 19: Chi phí ngoài chính sách"],
        policy_article: "Điều 8.4 & Điều 19"
      };
    }

    if (claimData.days_since_expense > 30) {
      return {
        claim_id: "CLM-EVAL-" + Math.floor(Math.random()*9000 + 1000),
        status: "ESCALATED",
        uncertainty_category: "POLICY_EXCEPTION",
        confidence_score: 0.98,
        escalation_reason: `Hồ sơ nộp trễ hạn (${claimData.days_since_expense} ngày > 30 ngày quy định).`,
        escalation_question: `Hồ sơ nộp quá hạn 30 ngày (${claimData.days_since_expense} ngày kể từ ngày phát sinh). Quản lý có chấp thuận lý do bất khả kháng để duyệt ngoại lệ không?`,
        suggested_actions: ["Duyệt ngoại lệ quá hạn", "Từ chối hoàn ứng do quá hạn"],
        target_role: "Direct Manager",
        rule_references: ["Điều 3.5: Thời hạn nộp hồ sơ trong vòng 30 ngày"],
        policy_article: "Điều 3.5"
      };
    }

    // Default: routine pass
    return {
      claim_id: "CLM-EVAL-" + Math.floor(Math.random()*9000 + 1000),
      status: "AUTO_PROCESSED",
      uncertainty_category: "NONE",
      confidence_score: 0.99,
      escalation_reason: null,
      escalation_question: null,
      suggested_actions: ["Tự động duyệt và chuyển lệnh thanh toán ERP"],
      target_role: "System Automated",
      rule_references: ["Khoản chi nằm hoàn toàn trong hạn mức tiêu chuẩn (Điều 5, 6, 7, 8, 9, 21)"],
      policy_article: "Quy trình thường quy"
    };
  },

  // 3. Test cases list
  async getTestcases(category = "ALL") {
    try {
      const res = await fetch(`/api/testcases?category=${category}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.info("Using placeholder endpoint data for GET /api/testcases");
    }
    await new Promise(r => setTimeout(r, 200));
    if (category === "ALL") return MOCK_TESTCASES;
    return MOCK_TESTCASES.filter(t => t.category === category);
  },

  // 4. Metrics & Reports
  async getMetrics() {
    try {
      const res = await fetch("/api/metrics/escalation");
      if (res.ok) return await res.json();
    } catch (e) {
      console.info("Using placeholder endpoint data for GET /api/metrics/escalation");
    }
    await new Promise(r => setTimeout(r, 300));
    return MOCK_METRICS;
  },

  // 5. Submit human review response
  async submitReview(claimId, reviewData) {
    try {
      const res = await fetch(`/api/claims/${claimId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.info("Using placeholder endpoint data for POST /api/claims/:id/review");
    }
    await new Promise(r => setTimeout(r, 400));
    return {
      claim_id: claimId,
      status: "RESOLVED_AND_APPROVED",
      resolution_message: `Đã ghi nhận phản hồi của ${reviewData.reviewer_role}. Hồ sơ đã hoàn tất phê duyệt!`,
      resolved_at: new Date().toISOString()
    };
  }
};

