# Thư mục tab Nghe

Tab Nghe có 2 mục: **`q/`** = Luyện nghe 5 phút (45 video) và **`t/`** = Luyện nghe sâu (47 video). Mỗi video trong playlist có một file nội dung: `q/NN.txt` hoặc `t/NN.txt`, trong đó **NN là thứ tự video trong playlist** (01 = video đầu tiên, 02 = video thứ hai…). App tự hiện nội dung tương ứng khi video chạy tới đó. Không có file thì app báo "Chưa có nội dung".

Định dạng `.txt` (UTF-8):
- Dòng trống = xuống đoạn mới.
- Xuống dòng đơn = giữ nguyên xuống dòng (hợp với hội thoại).
- Dòng bắt đầu bằng `# ` = tiêu đề nhỏ.
- Chạm vào một từ tiếng Anh trong nội dung để nghe phát âm.

Đổi PDF thành .txt: `python3 tools/pdf_to_txt.py <thư mục chứa PDF>` (đặt tên PDF theo thứ tự: 01.pdf, 02.pdf…). Chỉ commit các file `.txt` lên GitHub, đừng commit PDF.

## Đồng bộ với video (v3.3)
- Dòng có tiền tố `[m:ss]` hoặc `[h:mm:ss]` là dòng có **giờ chuẩn**: `[1:05] Hello there`. Dòng không có giờ được nội suy giữa hai dòng có giờ gần nhất (hoặc ước lượng theo độ dài video nếu không có dòng nào có giờ).
- Mỗi dòng (xuống dòng đơn) là một đơn vị đồng bộ; nên ~1 câu/dòng. Dòng trống chỉ để cách đoạn.
- Tạo giờ tự động: `python3 tools/align_yt.py`. Dựng lại file sạch từ phụ đề thô: `python3 tools/clean_subs.py <thư mục thô>`.

