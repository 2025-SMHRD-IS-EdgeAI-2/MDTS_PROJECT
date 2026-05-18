import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from PyQt5.QtWidgets import QApplication
from PyQt5.QtCore import QTimer

# main.py의 앱 구성 임포트
exec(open(os.path.join(os.path.dirname(__file__), "main.py"), encoding="utf-8").read())

app = QApplication.instance() or QApplication(sys.argv)
app.setStyleSheet(GLOBAL_SS)
win = MainWindow()
win.show()

def capture():
    pixmap = win.grab()
    save_path = os.path.join(os.path.dirname(__file__), "screenshot_black_bg.png")
    pixmap.save(save_path)
    print(f"Screenshot saved: {save_path}")
    app.quit()

QTimer.singleShot(2000, capture)
app.exec_()
