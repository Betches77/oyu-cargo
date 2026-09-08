import qrcode
from qrcode.constants import ERROR_CORRECT_M
from PIL import Image

URL = "https://oyu-cargo.onrender.com/"
OUTPUT_FILE = "my_qr_code_50_exact.png"
TARGET_SIZE = 50
BORDER = 2

qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=2, border=BORDER)
qr.add_data(URL)
qr.make(fit=True)
img = qr.make_image(fill_color="black", back_color="white").convert("L")

# NEAREST ашиглан тодрол алдагдуулахгүйгээр яг 50x50 болгоно
img_resized = img.resize((TARGET_SIZE, TARGET_SIZE), Image.NEAREST)
img_resized.save(OUTPUT_FILE)

print(f"Амжилттай! '{OUTPUT_FILE}' файлд хадгалагдлаа.")
print(f"Хэмжээ: {img_resized.size[0]}x{img_resized.size[1]}px (яг таг)")
