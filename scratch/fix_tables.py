import os
import re
import subprocess

html_dir = r"assets\docs\tc-ca-new\html"
pdf_dir = r"assets\docs\tc-ca-new"
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

for fn in os.listdir(html_dir):
    if not fn.endswith('.html'):
        continue
    path = os.path.join(html_dir, fn)
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    if '<div class="table-data">' in c:
        c = c.replace('<div class="table-data">', '<table class="table-data">')
        c = re.sub(r'(</tr>\s*)</div>', r'\1</table>', c)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        print('Fixed HTML table in:', fn)
        pdf_name = fn.replace('.html', '.pdf')
        pdf_file = os.path.join(pdf_dir, pdf_name)
        subprocess.run([edge_path, '--headless', '--disable-gpu', f'--print-to-pdf={pdf_file}', f'file:///{os.path.abspath(path).replace("\\", "/")}'])
        print('Re-rendered PDF:', pdf_name)
