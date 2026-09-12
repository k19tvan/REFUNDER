# A. BỘ ĐIỀU PHỐI CHUYỂN TIẾP (THE ESCALATION REFEREE)

> **Mô tả:** Tác tử có năng lực xác định chính xác thời điểm cần dừng tự động hóa để xin ý kiến con người.

---

## Yêu cầu tối thiểu (Sprint 1)

* **Chọn quy trình & Xây dựng quy định:** Chọn một quy trình thường quy cụ thể (thanh toán hoàn ứng, phê duyệt nghỉ phép, phân loại yêu cầu hỗ trợ...) và xây dựng tài liệu quy định rõ ràng cho quy trình đó. Tự động xử lý các trường hợp thường quy.
* **Bộ dữ liệu kiểm thử:** Xây dựng tối thiểu 15 trường hợp, bao gồm các trường hợp không rõ ràng, trường hợp ngoài quy định và trường hợp vượt thẩm quyền xử lý.
* **Phân loại mức độ không chắc chắn:** Chia thành 3 nhóm rõ ràng:
1. Chưa xác định được thông tin thực tế.
2. Nằm ngoài phạm vi quy định.
3. Vượt thẩm quyền cần con người phê duyệt.


* **Tạo câu hỏi chuyển tiếp chất lượng:** Tạo câu hỏi cụ thể, rõ ràng để người xử lý có thể trả lời trực tiếp — tuyệt đối không dùng các yêu cầu chung chung như "yêu cầu xem xét lại".
* **Kiểm soát tỷ lệ chuyển tiếp:** Không chuyển tiếp quá mức; các trường hợp thường quy phải được xử lý tự động hoàn toàn. Tác tử chuyển tiếp mọi trường hợp sẽ không đáp ứng yêu cầu xử lý công việc.
* **Xử lý dữ liệu nghi vấn:** Tuyệt đối không đưa ra kết quả khẳng định đối với dữ liệu đầu vào đã bị gắn cờ nghi vấn.
* **Kịch bản kiểm thử (Verify):** Cung cấp 5 trường hợp kiểm thử chuyển tiếp (gồm 3 trường hợp thường quy và 2 trường hợp cần chuyển tiếp) có thể chạy trực tiếp từ bộ công cụ `Verify` bằng một thao tác. Hiển thị rõ trường hợp nào được chuyển tiếp, trường hợp nào được xử lý tự động và câu hỏi cụ thể tương ứng.

---

## Yêu cầu nâng cao (Sprint 2)

* **Tự động điều chỉnh:** Tự động điều chỉnh ngưỡng chuyển tiếp dựa trên phản hồi của người dùng trong quá trình vận hành.
* **Báo cáo độ chính xác:** Cung cấp số liệu cụ thể trên tập kiểm thử độc lập:
* Tỷ lệ trường hợp cần chuyển tiếp nhưng bị bỏ sót.
* Tỷ lệ trường hợp đơn giản bị chuyển tiếp không cần thiết.


* **Thử nghiệm thực tế:** Thử nghiệm với ít nhất 3 nhân sự trực tiếp xử lý quy trình này trong thực tế, chỉ ra ít nhất một điểm cải tiến trong hệ thống xuất phát từ phản hồi của họ.

---

## Phương thức đánh giá của Ban giám khảo

### Vòng Sơ loại - Kiểm tra nhanh 90 giây

Giám khảo chọn `Verify` → `Escalation`. Bộ công cụ kiểm thử tự động thực thi 5 trường hợp và hiển thị bảng kết quả. Sau đó, giám khảo nhập một trường hợp không rõ ràng mới dựa trên tài liệu quy định của đội thi.

* **ĐẠT:** 2 trường hợp được chuyển tiếp, 3 trường hợp được xử lý tự động, và trường hợp mới được xử lý hợp lý.
* **KHÔNG ĐẠT:** Hệ thống chuyển tiếp tất cả hoặc không chuyển tiếp trường hợp nào.

### Vòng Chung kết - Kiểm thử toàn diện (20 điểm)

Ban giám khảo đưa ra 5 trường hợp mới dựa trên tài liệu quy định của đội thi, trong đó có khoảng 2 trường hợp cần chuyển tiếp.

| Bài kiểm tra | Thao tác của Giám khảo và Thang điểm | Điểm |
| --- | --- | --- |
| **Phát hiện đúng trường hợp cần chuyển tiếp** | Giám khảo thực thi 5 trường hợp riêng.<br>

<br>• **8 điểm:** Chuyển tiếp đúng cả 2 trường hợp và phân loại chính xác.<br>

<br>• **4 điểm:** Phát hiện đúng 1 trong 2 trường hợp.<br>

<br>• **0 điểm:** Không phát hiện được trường hợp nào. | **8** |
| **Không can thiệp các trường hợp đơn giản** | 3 trường hợp thường quy phải được xử lý tự động hoàn toàn.<br>

<br>• **6 điểm:** Không có trường hợp chuyển tiếp sai.<br>

<br>• **3 điểm:** Có 1 trường hợp chuyển tiếp sai.<br>

<br>• **0 điểm:** Từ 2 trường hợp chuyển tiếp sai trở lên. | **6** |
| **Chất lượng câu hỏi chuyển tiếp** | Giám khảo đánh giá nội dung câu hỏi do hệ thống tạo ra.<br>

<br>• **6 điểm:** Câu hỏi cụ thể, người xử lý có thể quyết định ngay trong một câu trả lời mà không cần tra cứu lại hồ sơ gốc.<br>

<br>• **3 điểm:** Câu hỏi cụ thể nhưng vẫn cần tra cứu thêm.<br>

<br>• **0 điểm:** Câu hỏi chung chung, dạng yêu cầu xem xét lại. | **6** |

---

> **Ví dụ minh họa:**
> Tác tử hỗ trợ thủ quỹ câu lạc bộ xử lý hồ sơ hoàn ứng. Phần lớn hồ sơ hợp lệ được xử lý tự động:
> * **Hóa đơn bị mờ:** Tác tử hỏi rõ: *"Số tiền là 450.000₫ hay 480.000₫?"*
> * **Hóa đơn đồ uống có cồn:** Tác tử thông báo: *"Khoản chi này có thể ngoài quy định của câu lạc bộ, bạn có xác nhận phê duyệt không?"*
> * **Hóa đơn trên 5.000.000₫:** Tác tử nêu rõ: *"Khoản này cần chữ ký của Chủ tịch câu lạc bộ phê duyệt."*
> 
> 
> ➔ Ba yêu cầu xử lý khác nhau tương ứng với ba phương thức chuyển tiếp khác nhau.