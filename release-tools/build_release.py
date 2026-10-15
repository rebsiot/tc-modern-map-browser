#!/usr/bin/env python3
"""Create Foundry-compatible release assets from this GitHub repository.

Source/creator content is never downloaded or bundled here.
Only allowlisted module code, documentation and tests can enter the ZIP.
"""
from pathlib import Path
import json, os, zipfile

root=Path(__file__).resolve().parents[1]
m=json.loads((root/'module.json').read_text(encoding='utf-8'))
assert m['id']=='tc-modern-map-browser', 'Unexpected Foundry module ID'
assert m['version'].strip(), 'module.json version missing'
repo=os.getenv('GITHUB_REPOSITORY','rebsiot/tc-modern-map-browser')
if repo.count('/')!=1: raise SystemExit('Bad repository name')
tag=f"v{m['version']}"
manifest_url=f'https://github.com/{repo}/releases/latest/download/module.json'
download_url=f'https://github.com/{repo}/releases/download/{tag}/tc-modern-map-browser.zip'
m['url']=f'https://github.com/{repo}'
m['manifest']=manifest_url
m['download']=download_url

# Only package explicit module-owned files: no creator art, ZIPs, credentials or world data.
files=[root/'module.json']
# Public release: only explicitly reviewed docs; never auto-package newly added private notes.
allowed_docs = (
    'README.md', 'LICENSE.md', 'THIRD-PARTY-CONTENT.md', 'CHANGELOG.md', 'RELEASE-NOTES.md',
    'CATALOG-REVIEW-GUIDE.md', 'UPGRADE-0.2.8.md', 'UPGRADE-0.2.9.md', 'TEST-REPORT.md'
)
files += [root/name for name in allowed_docs if (root/name).is_file()]
files += sorted(p for p in (root/'scripts').rglob('*.mjs') if p.is_file())
files += sorted(p for p in (root/'styles').rglob('*.css') if p.is_file())
files += sorted(p for p in (root/'tests').rglob('*.mjs') if p.is_file())
# Security: exclude all other files from the release package.
for p in files:
    if not p.resolve().is_relative_to(root.resolve()):
        raise SystemExit(f'Escaping source path: {p}')
    if p.is_symlink(): raise SystemExit(f'Symlink refused: {p}')

out=root/'dist'
out.mkdir(exist_ok=True)
(out/'module.json').write_text(json.dumps(m,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
archive=out/'tc-modern-map-browser.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in files:
        filename=p.relative_to(root).as_posix()
        if p.name=='module.json':
            z.writestr(filename,(out/'module.json').read_bytes())
        else: z.write(p,filename)

with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert 'module.json' in z.namelist()
    assert all(not name.startswith('tc-modern-map-browser/') for name in z.namelist())
    packed=json.loads(z.read('module.json'))
    assert packed['download']==download_url and packed['manifest']==manifest_url
print('Foundry Release',tag,'for',repo)
print('  ZIP: ',archive,'size',archive.stat().st_size)
print('  Manifest:',out/'module.json')
