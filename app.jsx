import { ApiService, MOCK_VERIFY_BENCHMARK } from './api_client.js';

const { useState, useEffect } = React;

function App() {
  const [activeTab, setActiveTab] = useState('verify'); // 'verify' | 'sandbox' | 'testcases' | 'metrics' | 'api'
  const [verifyData, setVerifyData] = useState(null);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [testcases, setTestcases] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [metrics, setMetrics] = useState(null);

  // Sandbox state
  const [sandboxForm, setSandboxForm] = useState({
    employee_name: "Nguyễn Văn Tuấn",
    employee_id: "EMP-1099",
    approver_id: "MGR-2005",
    category: "meal",
    amount: "450.00",
    description: "Hóa đơn ăn tối tiếp khách bị mờ phần tổng tiền",
    receipt_attached: true,
    receipt_readable: false,
    days_since_expense: 4
  });
  const [evalResult, setEvalResult] = useState(null);
  const [evalLoading, setEvalLoading] = useState(false);

  // Review Modal state
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    // Load default verify benchmark and metrics on mount
    handleRunVerify();
    loadMetrics();
    loadTestcases('ALL');
  }, []);

  const handleRunVerify = async () => {
    setLoadingVerify(true);
    try {
      const data = await ApiService.getVerifyBenchmark();
      setVerifyData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVerify(false);
    }
  };

  const loadMetrics = async () => {
    const data = await ApiService.getMetrics();
    setMetrics(data);
  };

  const loadTestcases = async (cat) => {
    setSelectedFilter(cat);
    const data = await ApiService.getTestcases(cat);
    setTestcases(data);
  };

  const handleEvaluateSandbox = async (e) => {
    if (e) e.preventDefault();
    setEvalLoading(true);
    setEvalResult(null);
    try {
      const res = await ApiService.evaluateClaim(sandboxForm);
      setEvalResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setEvalLoading(false);
    }
  };

  const handleSelectPreloadCase = (tc) => {
    setSandboxForm({
      employee_name: "Lê Minh Trí",
      employee_id: "EMP-1088",
      approver_id: "MGR-2001",
      category: tc.category.toLowerCase().includes("meal") ? "meal" : "general",
      amount: tc.amount.replace(/[^0-9.]/g, '') || "120",
      description: tc.name,
      receipt_attached: !tc.name.includes("Mất hóa đơn"),
      receipt_readable: !tc.name.includes("mờ"),
      days_since_expense: tc.name.includes("quá hạn") ? 42 : 5
    });
    setActiveTab('sandbox');
  };

  const handleSubmitReview = async () => {
    if (!reviewModal || !reviewAnswer.trim()) return;
    await ApiService.submitReview(reviewModal.claim_id, {
      reviewer_role: reviewModal.target_role || "Manager",
      answer_text: reviewAnswer
    });
    setReviewSubmitted(true);
    setTimeout(() => {
      setReviewModal(null);
      setReviewSubmitted(false);
      setReviewAnswer("");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <i className="fa-solid fa-scale-balanced text-xl text-white"></i>
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-white flex items-center gap-2">
                THE ESCALATION REFEREE
                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full">
                  Track AI Agent
                </span>
              </div>
              <p className="text-xs text-slate-400">Bộ điều phối chuyển tiếp thông minh • Sprint 1 & 2</p>
            </div>
          </div>

          <nav className="flex space-x-1 sm:space-x-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('verify')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'verify' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-circle-check"></i>
              <span>Verify (90s BGK)</span>
            </button>
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'sandbox' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-vial"></i>
              <span>Sandbox Thẩm Định</span>
            </button>
            <button
              onClick={() => setActiveTab('testcases')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'testcases' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-list-check"></i>
              <span>Tập 16 Test Cases</span>
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'metrics' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-chart-pie"></i>
              <span>Dashboard & Metrics</span>
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'api' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-code"></i>
              <span>API Specs</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* TAB 1: VERIFY BENCHMARK (Sprint 1 Judge Fast-Check) */}
        {activeTab === 'verify' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <i className="fa-solid fa-bolt mr-1.5"></i> Vòng Sơ loại 90 Giây
                    </span>
                    <span className="text-xs text-slate-400">Tiêu chuẩn: 3 Auto Processed • 2 Escalated</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    Kiểm tra nhanh Verify → Escalation
                  </h1>
                  <p className="text-sm text-slate-400 max-w-2xl">
                    Thực thi 5 trường hợp kiểm thử chuyển tiếp tiêu chuẩn bằng một thao tác duy nhất. Đảm bảo tác tử không chuyển tiếp bừa bãi và xử lý tự động toàn diện các ca thường quy.
                  </p>
                </div>
                <button
                  onClick={handleRunVerify}
                  disabled={loadingVerify}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition disabled:opacity-50"
                >
                  <i className={`fa-solid fa-rotate ${loadingVerify ? 'fa-spin' : ''}`}></i>
                  <span>{loadingVerify ? 'Đang thẩm định...' : 'Run Verify Benchmark'}</span>
                </button>
              </div>

              {/* Status summary cards */}
              {verifyData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Tổng trường hợp</span>
                    <div className="text-2xl font-bold text-white mt-0.5">{verifyData.total_cases} Cases</div>
                  </div>
                  <div className="bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-800/40">
                    <span className="text-xs text-emerald-400 font-medium">Tự động xử lý (Routine)</span>
                    <div className="text-2xl font-bold text-emerald-400 mt-0.5">{verifyData.auto_processed_count} Cases</div>
                  </div>
                  <div className="bg-amber-950/30 p-3.5 rounded-xl border border-amber-800/40">
                    <span className="text-xs text-amber-400 font-medium">Chuyển tiếp con người</span>
                    <div className="text-2xl font-bold text-amber-400 mt-0.5">{verifyData.escalated_count} Cases</div>
                  </div>
                  <div className="bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-800/40">
                    <span className="text-xs text-indigo-300 font-medium">Đánh giá BGK</span>
                    <div className="text-2xl font-bold text-indigo-400 mt-0.5 flex items-center gap-2">
                      <span>{verifyData.status}</span>
                      <i className="fa-solid fa-circle-check text-emerald-400 text-lg"></i>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <i className="fa-solid fa-table-list text-indigo-400"></i>
                  Bảng kết quả đối soát tiêu chí (Sprint 1)
                </h2>
                <span className="text-xs text-slate-400">Endpoint: <code className="text-indigo-300 bg-slate-800 px-2 py-0.5 rounded">GET /api/verify/escalation</code></span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Test Case & Mô tả</th>
                      <th className="py-3.5 px-4 font-semibold">Số tiền / Hạng mục</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Trạng thái quyết định</th>
                      <th className="py-3.5 px-4 font-semibold">Phân loại & Căn cứ</th>
                      <th className="py-3.5 px-4 font-semibold">Câu hỏi chuyển tiếp (Non-generic)</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {verifyData?.results.map((r) => (
                      <tr key={r.testcase_id} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4 align-top">
                          <div className="font-semibold text-white">{r.case_name}</div>
                          <div className="text-xs text-slate-400 mt-0.5 font-mono">{r.testcase_id} • {r.claim_id}</div>
                        </td>
                        <td className="py-4 px-4 align-top">
                          <div className="font-bold text-slate-100">{r.amount}</div>
                          <div className="text-xs text-slate-400">{r.category}</div>
                        </td>
                        <td className="py-4 px-4 align-top text-center">
                          {r.actual_status === 'AUTO_PROCESSED' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <i className="fa-solid fa-robot mr-1.5"></i> AUTO PROCESSED
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <i className="fa-solid fa-hand mr-1.5"></i> ESCALATED
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 align-top">
                          {r.uncertainty_category === 'NONE' ? (
                            <span className="text-xs text-emerald-400 font-medium">Quy trình thường quy</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-1">
                              {r.uncertainty_category}
                            </span>
                          )}
                          <p className="text-xs text-slate-400 mt-1">{r.rule_reference}</p>
                        </td>
                        <td className="py-4 px-4 align-top max-w-sm">
                          {r.escalation_question ? (
                            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-amber-500/20 text-xs text-amber-200">
                              <i className="fa-solid fa-circle-question mr-1 text-amber-400"></i>
                              <span className="font-medium">{r.escalation_question}</span>
                              <div className="mt-1 text-[11px] text-slate-400">Người nhận: <strong className="text-slate-300">{r.target_role}</strong></div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Không yêu cầu (Đã tự động duyệt)</span>
                          )}
                        </td>
                        <td className="py-4 px-4 align-top text-right">
                          {r.escalation_question ? (
                            <button
                              onClick={() => {
                                setReviewModal(r);
                                setReviewAnswer("");
                              }}
                              className="px-3 py-1.5 text-xs font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg transition"
                            >
                              Trả lời & Phê duyệt
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">Hoàn tất</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SANDBOX THẨM ĐỊNH (Giám khảo tự nhập hồ sơ mới) */}
        {activeTab === 'sandbox' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Input */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-flask text-indigo-400"></i>
                    Sandbox Thẩm Định Hồ Sơ Mới
                  </h2>
                  <p className="text-xs text-slate-400">Giám khảo nhập trường hợp mới để đánh giá phản xạ của AI Agent</p>
                </div>
                <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-800 px-2 py-1 rounded">
                  POST /api/claims/evaluate
                </span>
              </div>

              <form onSubmit={handleEvaluateSandbox} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Tên nhân viên</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      value={sandboxForm.employee_name}
                      onChange={e => setSandboxForm({...sandboxForm, employee_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Mã nhân viên (Requester)</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      value={sandboxForm.employee_id}
                      onChange={e => setSandboxForm({...sandboxForm, employee_id: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Mã người phê duyệt (Approver)</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      value={sandboxForm.approver_id}
                      onChange={e => setSandboxForm({...sandboxForm, approver_id: e.target.value})}
                    />
                    <span className="text-[11px] text-slate-500">Đặt trùng mã nhân viên để thử nghiệm vi phạm Điều 3.6</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Số ngày phát sinh</label>
                    <input
                      type="number"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      value={sandboxForm.days_since_expense}
                      onChange={e => setSandboxForm({...sandboxForm, days_since_expense: parseInt(e.target.value) || 0})}
                    />
                    <span className="text-[11px] text-slate-500">{'>'} 30 ngày sẽ bị gắn cờ quá hạn (Điều 3.5)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Hạng mục chi phí</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      value={sandboxForm.category}
                      onChange={e => setSandboxForm({...sandboxForm, category: e.target.value})}
                    >
                      <option value="meal">Ăn uống / Tiếp khách</option>
                      <option value="flight">Vé máy bay</option>
                      <option value="hotel">Khách sạn lưu trú</option>
                      <option value="ride">Di chuyển / Taxi</option>
                      <option value="equipment">Thiết bị / Mua sắm</option>
                      <option value="coworking">Coworking Space</option>
                      <option value="gift">Quà tặng nội bộ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Số tiền (USD)</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      value={sandboxForm.amount}
                      onChange={e => setSandboxForm({...sandboxForm, amount: e.target.value})}
                    />
                    <span className="text-[11px] text-slate-500">{'>'} $5,000 sẽ kích hoạt chuyển tiếp Procurement</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mô tả nội dung chi phí</label>
                  <textarea
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    value={sandboxForm.description}
                    onChange={e => setSandboxForm({...sandboxForm, description: e.target.value})}
                    placeholder="VD: Ăn tối tiếp khách có rượu vang, hoặc hóa đơn bị mờ..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sandboxForm.receipt_attached}
                      onChange={e => setSandboxForm({...sandboxForm, receipt_attached: e.target.checked})}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-300">Có đính kèm hóa đơn</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sandboxForm.receipt_readable}
                      onChange={e => setSandboxForm({...sandboxForm, receipt_readable: e.target.checked})}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-300">Hóa đơn rõ nét (Không bị mờ)</span>
                  </label>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={evalLoading}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    <i className={`fa-solid fa-wand-magic-sparkles ${evalLoading ? 'fa-spin' : ''}`}></i>
                    <span>{evalLoading ? 'Đang phân tích...' : 'Thẩm định hồ sơ tức thì'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSandboxForm({
                      employee_name: "Nguyễn Văn Tuấn",
                      employee_id: "EMP-1099",
                      approver_id: "MGR-2005",
                      category: "meal",
                      amount: "45.00",
                      description: "Bữa trưa tiếp đối tác tiêu chuẩn",
                      receipt_attached: true,
                      receipt_readable: true,
                      days_since_expense: 3
                    })}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
                  >
                    Reset mẫu thường quy
                  </button>
                </div>
              </form>
            </div>

            {/* Evaluation Result Display */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl min-h-[460px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <i className="fa-solid fa-microchip text-indigo-400"></i>
                      Quyết định của Escalation Referee
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">Status: {evalResult ? evalResult.status : "Chờ thẩm định"}</span>
                  </div>

                  {!evalResult ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                      <i className="fa-solid fa-clipboard-question text-4xl mb-3 text-slate-600"></i>
                      <p className="text-sm">Nhập thông tin hồ sơ bên trái và bấm <strong>"Thẩm định hồ sơ tức thì"</strong></p>
                      <p className="text-xs text-slate-600 mt-1">Hệ thống sẽ áp dụng ma trận phê duyệt và sinh câu hỏi chuyển tiếp tương ứng</p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {/* Decision Badge */}
                      <div className="flex items-center justify-between p-4 rounded-xl border" style={{
                        backgroundColor: evalResult.status === 'AUTO_PROCESSED' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                        borderColor: evalResult.status === 'AUTO_PROCESSED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'
                      }}>
                        <div>
                          <span className="text-xs text-slate-400 uppercase font-semibold">Quyết định xử lý:</span>
                          <div className="text-xl font-black mt-0.5" style={{
                            color: evalResult.status === 'AUTO_PROCESSED' ? '#34d399' : '#fbbf24'
                          }}>
                            {evalResult.status === 'AUTO_PROCESSED' ? '✓ TỰ ĐỘNG XỬ LÝ (AUTO PROCESSED)' : '⚠ CHUYỂN TIẾP CON NGƯỜI (ESCALATED)'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400">Độ tin cậy:</span>
                          <div className="text-lg font-mono font-bold text-white">{(evalResult.confidence_score * 100).toFixed(1)}%</div>
                        </div>
                      </div>

                      {/* Uncertainty Category */}
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-xs text-slate-400">Phân loại theo 3 nhóm không chắc chắn (statement.md):</span>
                        <div className="text-sm font-semibold text-indigo-300">
                          {evalResult.uncertainty_category === 'UNCERTAIN_FACTS' && 'Nhóm 1: Chưa xác định được thông tin thực tế'}
                          {evalResult.uncertainty_category === 'POLICY_EXCEPTION' && 'Nhóm 2: Nằm ngoài phạm vi quy định'}
                          {evalResult.uncertainty_category === 'AUTHORITY_LIMIT' && 'Nhóm 3: Vượt thẩm quyền cần con người phê duyệt'}
                          {evalResult.uncertainty_category === 'NONE' && 'Không có sự không chắc chắn (Đủ điều kiện tự động duyệt)'}
                        </div>
                        {evalResult.escalation_reason && (
                          <div className="text-xs text-slate-300 mt-1">Lý do: <em>{evalResult.escalation_reason}</em></div>
                        )}
                      </div>

                      {/* Escalation Question Box (Quality Criteria) */}
                      {evalResult.escalation_question && (
                        <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
                            <span className="flex items-center gap-1.5">
                              <i className="fa-solid fa-message-question"></i> Câu hỏi chuyển tiếp chất lượng (Non-generic)
                            </span>
                            <span className="px-2 py-0.5 bg-amber-500/20 rounded text-[11px]">Gửi đến: {evalResult.target_role}</span>
                          </div>
                          <p className="text-sm font-medium text-amber-100 bg-slate-950/60 p-3 rounded-lg border border-amber-500/20">
                            "{evalResult.escalation_question}"
                          </p>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <i className="fa-solid fa-circle-info text-indigo-400"></i>
                            Người xử lý có thể trả lời trực tiếp trong 1 câu mà không cần tra cứu lại hồ sơ gốc.
                          </div>
                        </div>
                      )}

                      {/* Rule references */}
                      <div className="text-xs text-slate-400 space-y-1">
                        <span className="font-semibold text-slate-300">Điều khoản chính sách áp dụng:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-400 font-mono text-[11px]">
                          {evalResult.rule_references?.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {evalResult && evalResult.escalation_question && (
                  <div className="pt-4 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setReviewModal(evalResult);
                        setReviewAnswer("");
                      }}
                      className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-reply"></i>
                      <span>Mở giao diện Trả lời chuyển tiếp (Human Review)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TẬP 16 TEST CASES ĐẦY ĐỦ */}
        {activeTab === 'testcases' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-folder-open text-indigo-400"></i>
                  Bộ dữ liệu 16 Test Cases Độc Lập
                </h2>
                <p className="text-xs text-slate-400">Bao quát mọi tình huống quy định tại policy.md (Sprint 1: tối thiểu 15 trường hợp)</p>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'Tất cả (16)' },
                  { id: 'UNCERTAIN_FACTS', label: '1. Thông tin mờ/thiếu' },
                  { id: 'POLICY_EXCEPTION', label: '2. Ngoài quy định' },
                  { id: 'AUTHORITY_LIMIT', label: '3. Vượt thẩm quyền' },
                  { id: 'NONE', label: 'Thường quy (Routine)' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => loadTestcases(f.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                      selectedFilter === f.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Test cases grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testcases.map(tc => (
                <div key={tc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 transition flex flex-col justify-between shadow-lg">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-semibold text-indigo-400">{tc.id}</span>
                      {tc.expected_status === 'AUTO_PROCESSED' ? (
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                          AUTO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                          ESCALATE
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm mb-1">{tc.name}</h3>
                    <p className="text-xs text-slate-400 mb-3">{tc.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Số tiền</span>
                      <span className="font-bold text-slate-200 text-sm">{tc.amount}</span>
                    </div>
                    <button
                      onClick={() => handleSelectPreloadCase(tc)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-play text-[10px]"></i>
                      Nạp vào Sandbox
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DASHBOARD & METRICS (Sprint 2) */}
        {activeTab === 'metrics' && metrics && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-xs font-semibold">
                    Yêu cầu nâng cao Sprint 2
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">Báo cáo độ chính xác & Tỷ lệ chuyển tiếp</h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">GET /api/metrics/escalation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6">
                <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Tỷ lệ chuyển tiếp tổng thể</span>
                  <div className="text-3xl font-black text-indigo-400 mt-1">{metrics.escalation_rate}</div>
                  <p className="text-xs text-slate-500 mt-2">Đạt tiêu chí: kiểm soát tỷ lệ chuyển tiếp hợp lý, không chuyển tiếp mọi trường hợp.</p>
                </div>
                <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-xs text-emerald-400 font-medium">Trường hợp cần chuyển tiếp bị bỏ sót (False Negative)</span>
                  <div className="text-3xl font-black text-emerald-400 mt-1">{metrics.metrics.false_negative_rate}</div>
                  <p className="text-xs text-slate-500 mt-2">0% bỏ sót các vi phạm chính sách hoặc thiếu chứng từ.</p>
                </div>
                <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-xs text-emerald-400 font-medium">Trường hợp đơn giản bị chuyển tiếp sai (False Positive)</span>
                  <div className="text-3xl font-black text-emerald-400 mt-1">{metrics.metrics.false_positive_rate}</div>
                  <p className="text-xs text-slate-500 mt-2">0% quấy rầy con người với các chi phí thường quy chuẩn.</p>
                </div>
              </div>

              {/* Distribution */}
              <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-semibold mb-1">Nhóm 1: Chưa xác định sự kiện</div>
                  <div className="text-xl font-bold text-white">{metrics.distribution_by_category.UNCERTAIN_FACTS} hồ sơ</div>
                  <div className="text-xs text-slate-500 mt-1">Hóa đơn mờ, mất chứng từ, nghi vấn chia nhỏ</div>
                </div>
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-semibold mb-1">Nhóm 2: Nằm ngoài quy định</div>
                  <div className="text-xl font-bold text-white">{metrics.distribution_by_category.POLICY_EXCEPTION} hồ sơ</div>
                  <div className="text-xs text-slate-500 mt-1">Đồ uống cồn, gift card, đặt ngoài Navan, quá hạn 30d</div>
                </div>
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-semibold mb-1">Nhóm 3: Vượt thẩm quyền</div>
                  <div className="text-xl font-bold text-white">{metrics.distribution_by_category.AUTHORITY_LIMIT} hồ sơ</div>
                  <div className="text-xs text-slate-500 mt-1">Đơn {'>'} $5k, khách sạn {'>'} 1 đêm, tháng {'>'} $10k</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: API SPECS VIEWER */}
        {activeTab === 'api' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">Đặc Tả Endpoints & Kiến Trúc API</h2>
                <p className="text-xs text-slate-400 mt-0.5">Tài liệu chi tiết lưu trữ tại <code className="text-indigo-400">api_design.md</code></p>
              </div>
              <a
                href="./api_design.md"
                target="_blank"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs rounded-lg font-mono flex items-center gap-1.5"
              >
                <i className="fa-solid fa-file-lines"></i>
                Xem api_design.md
              </a>
            </div>

            <div className="space-y-4">
              {[
                { method: "GET", path: "/api/verify/escalation", desc: "1-Click Benchmark 5 trường hợp phục vụ BGK sơ loại (90s)" },
                { method: "POST", path: "/api/claims/evaluate", desc: "Thẩm định hồ sơ, phân loại 3 nhóm không chắc chắn & sinh câu hỏi" },
                { method: "GET", path: "/api/testcases", desc: "Lấy danh sách 16 test cases phân loại theo nhóm chính sách" },
                { method: "GET", path: "/api/testcases/:id", desc: "Lấy chi tiết một test case để nạp vào Sandbox" },
                { method: "POST", path: "/api/claims/submit", desc: "Nộp hồ sơ hoàn ứng mới vào hệ thống" },
                { method: "GET", path: "/api/claims/:id", desc: "Xem chi tiết hồ sơ và câu hỏi chuyển tiếp đang chờ" },
                { method: "POST", path: "/api/claims/:id/review", desc: "Gửi phản hồi của con người (Manager/AP) cho câu hỏi chuyển tiếp" },
                { method: "GET", path: "/api/metrics/escalation", desc: "Báo cáo thống kê độ chính xác & tỷ lệ chuyển tiếp (Sprint 2)" },
                { method: "POST", path: "/api/rules/threshold", desc: "Tự động điều chỉnh ngưỡng chuyển tiếp theo phản hồi" }
              ].map((ep, idx) => (
                <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded ${
                      ep.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    }`}>
                      {ep.method}
                    </span>
                    <span className="font-mono text-sm font-semibold text-slate-200">{ep.path}</span>
                  </div>
                  <span className="text-xs text-slate-400">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* HUMAN REVIEW MODAL */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-user-check text-indigo-400"></i>
                Phản Hồi Chuyển Tiếp (Human-in-the-loop)
              </h3>
              <button onClick={() => setReviewModal(null)} className="text-slate-400 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl">
              <span className="text-xs font-semibold text-amber-400 uppercase">Câu hỏi từ Tác tử:</span>
              <p className="text-sm font-medium text-amber-100 mt-1">
                "{reviewModal.escalation_question}"
              </p>
              <div className="text-[11px] text-slate-400 mt-2">
                Thẩm quyền trả lời: <strong className="text-slate-200">{reviewModal.target_role}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Câu trả lời của bạn (Người xử lý):
              </label>
              <textarea
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                placeholder="VD: Xác nhận số tiền thực tế là $450 theo hóa đơn giấy lưu..."
                value={reviewAnswer}
                onChange={e => setReviewAnswer(e.target.value)}
              />
            </div>

            {reviewSubmitted && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-emerald-400"></i>
                Đã gửi phản hồi thành công qua POST /api/claims/:id/review!
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={!reviewAnswer.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2"
              >
                <i className="fa-solid fa-paper-plane"></i>
                Gửi phản hồi cho AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-500">
        The Escalation Referee Agent • AI Contest 2026 • FIN-EXP-001 Policy Engine
      </footer>
    </div>
  );
}

// Render React application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

