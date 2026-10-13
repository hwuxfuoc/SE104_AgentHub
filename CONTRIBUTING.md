# Quy ước branch và pull request

## Branch

- `main`: branch chính; đưa thay đổi vào qua pull request.
- Mỗi công việc dùng một branch riêng, tạo từ `main` mới nhất.
- Tên branch: `<type>/<short-description>`, dùng tiếng Anh, chữ thường và dấu `-`.
- Type: `feature`, `fix`, `docs`, `refactor`, `test`, `chore`.
- Ví dụ: `feature/user-login`, `fix/login-validation`, `docs/setup-guide`.

Tạo và đẩy branch (thay tên ví dụ bằng tên công việc của bạn):

```sh
git switch main
git pull --ff-only origin main
git switch -c feature/user-login
# Thực hiện thay đổi và commit trước khi push.
git push -u origin feature/user-login
```

## Pull request

Mở PR từ branch công việc vào `main`, đặt tiêu đề ngắn mô tả thay đổi và điền ba mục trong template:

- **What**: thay đổi gì.
- **Why**: lý do thay đổi, kèm issue nếu có.
- **Verify**: cách kiểm tra và kết quả; nếu chưa kiểm tra, ghi rõ lý do.

Giữ mỗi PR tập trung vào một công việc để dễ review.
