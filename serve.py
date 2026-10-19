"""开发服务器：禁用缓存，保证样式/脚本改动即刷即见。用法：python serve.py [端口]"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
