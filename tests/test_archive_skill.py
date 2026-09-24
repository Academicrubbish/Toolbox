import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).parents[1] / 'skills' / 'ai-note-archive' / 'scripts' / 'archive.py'
spec = importlib.util.spec_from_file_location('archive_skill', SCRIPT)
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)


class ArchiveSkillTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.original = archive.CONFIG
        archive.CONFIG = Path(self.temp.name) / 'connections.json'
        self.addCleanup(lambda: setattr(archive, 'CONFIG', self.original))
        self.secret = 'an_' + 'a' * 43

    def test_multiple_named_connections_and_private_config(self):
        for name in ('个人笔记', '工作笔记'):
            with patch('sys.stdin', io.StringIO(self.secret + '\n')):
                self.assertEqual(archive.main(['link', '--name', name, '--url', 'https://notes.example/archive', '--key-stdin']), 0)
        self.assertEqual(set(archive.load()), {'个人笔记', '工作笔记'})
        self.assertEqual(os.stat(archive.CONFIG).st_mode & 0o777, 0o600)
        with patch('sys.stdout', new_callable=io.StringIO) as output:
            archive.main(['list'])
        self.assertNotIn(self.secret, output.getvalue())

    def test_archive_requires_explicit_name_and_sends_selected_key(self):
        archive.save({'个人': {'key': self.secret, 'url': 'https://notes.example/archive'},
                      '工作': {'key': 'an_' + 'b' * 43, 'url': 'https://work.example/archive'}})
        with self.assertRaises(SystemExit):
            archive.main(['archive', '--title', '标题'])
        captured = {}
        class Reply:
            def __enter__(self): return self
            def __exit__(self, *_): pass
            def read(self): return b'{"code":0,"data":{"recordId":"id-1"}}'
        def fake_urlopen(request, timeout):
            captured['url'] = request.full_url
            captured['key'] = request.get_header('Authorization')
            captured['body'] = json.loads(request.data)
            return Reply()
        with patch('sys.stdin', io.StringIO('# 内容')), patch.object(archive.urllib.request, 'urlopen', fake_urlopen):
            self.assertEqual(archive.main(['archive', '--name', '工作', '--title', '标题']), 0)
        self.assertEqual(captured['url'], 'https://work.example/archive')
        self.assertEqual(captured['key'], 'Bearer ' + 'an_' + 'b' * 43)
        self.assertEqual(captured['body']['content'], '# 内容')


if __name__ == '__main__':
    unittest.main()
