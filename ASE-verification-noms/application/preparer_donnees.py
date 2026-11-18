"""Build offline browser data from the unchanged benchmark files."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
titles = ['Lettre de Denver', 'Manuscrit allemand', 'Testament · AD78 0066', 'Testament · AN 0241',
          'Testament · AD78 0030', 'Testament · AN 0199', 'Testament · AN 0240',
          'Lettre de Hooker · 1', 'Lettre de Hooker · 2', 'Français médiéval']
pages = []
for i, m in enumerate(json.loads((ROOT / 'sources/selection.json').read_text())):
    folder = ROOT / m['dossier']
    ref = (folder / '2_REPONSE_ATTENDUE.txt').read_text().rstrip('\n')
    preds = {model: json.loads((folder / f'{model}-original.json').read_text())['text']
             for model in ['qwen3.5-9b', 'churro-3b']}
    assert (ROOT / m['dossier'] / m['image_locale']).is_file()
    assert ref and all(preds.values())
    pages.append({'id': m['page_id'], 'folder': m['dossier'], 'title': titles[i], 'language': m['metadata']['language'],
                  'image': m['dossier'] + '/' + m['image_locale'], 'ref': ref, 'predictions': preds})
payload = {'commit': '8270b54d4d06cc4593d922e825e105c5b96a9e81', 'pages': pages}
(ROOT / 'application/data.js').write_text('window.ASE_DATA = ' + json.dumps(payload, ensure_ascii=False) + ';\n', encoding='utf-8')
print(f'{len(pages)} pages, 20 transcriptions complètes ; sources conservées.')
