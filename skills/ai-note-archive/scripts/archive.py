#!/usr/bin/env python3
"""Portable client for the AI note archive endpoint. Python standard library only."""
import argparse
import getpass
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request
import uuid

CONFIG = Path(os.environ.get('AI_NOTE_ARCHIVE_CONFIG', '~/.config/ai-note-archive/connections.json')).expanduser()


def load():
    if not CONFIG.exists():
        return {}
    data = json.loads(CONFIG.read_text(encoding='utf-8'))
    if not isinstance(data, dict):
        raise ValueError('连接配置格式无效')
    return data


def save(data):
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    os.chmod(CONFIG.parent, 0o700)
    temp = CONFIG.with_name(CONFIG.name + '.tmp')
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as output:
            json.dump(data, output, ensure_ascii=False, indent=2)
            output.write('\n')
        os.replace(temp, CONFIG)
    finally:
        if temp.exists():
            temp.unlink()
    os.chmod(CONFIG, 0o600)


def link(args):
    if not args.url.startswith('https://'):
        raise ValueError('归档接口必须是 HTTPS 地址')
    profiles = load()
    if args.name in profiles and not args.replace:
        raise ValueError('连接名称已存在；更新密钥请加 --replace')
    secret = sys.stdin.readline().strip() if args.key_stdin else getpass.getpass('归档密钥（输入不显示）：').strip()
    if not secret.startswith('an_') or len(secret) != 46:
        raise ValueError('归档密钥格式无效')
    profiles[args.name] = {'url': args.url, 'key': secret}
    save(profiles)
    print(f'已保存连接：{args.name}（密钥末尾 {secret[-4:]}）')


def list_profiles(_args):
    profiles = load()
    if not profiles:
        print('尚未关联连接')
    for name, profile in sorted(profiles.items()):
        print(f'{name}  密钥末尾 {profile["key"][-4:]}  {profile["url"]}')


def unlink(args):
    profiles = load()
    if args.name not in profiles:
        raise ValueError('连接不存在')
    del profiles[args.name]
    save(profiles)
    print(f'已删除本机连接：{args.name}（小程序中的密钥仍然有效）')


def archive(args):
    profiles = load()
    if args.name not in profiles:
        raise ValueError('连接不存在；请先运行 list 查看名称')
    if not args.title or len(args.title.strip()) > 120:
        raise ValueError('标题需为 1-120 个字符')
    content = Path(args.file).read_text(encoding='utf-8') if args.file else sys.stdin.read()
    if not content.strip() or len(content) > 60000:
        raise ValueError('正文需为 1-60000 个字符')
    request_id = args.request_id or uuid.uuid4().hex
    profile = profiles[args.name]
    payload = json.dumps({'title': args.title.strip(), 'content': content, 'requestId': request_id}, ensure_ascii=False).encode('utf-8')
    request = urllib.request.Request(profile['url'], data=payload,
        headers={'Authorization': 'Bearer ' + profile['key'], 'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        try:
            message = json.load(error).get('message', '归档失败')
        except (ValueError, OSError):
            message = '归档失败'
        raise ValueError(f'{message}（请求标识 {request_id}）') from None
    except urllib.error.URLError:
        raise ValueError(f'网络请求未确认成功；重试时使用同一请求标识 {request_id}') from None
    if result.get('code') != 0:
        raise ValueError(f'{result.get("message", "归档失败")}（请求标识 {request_id}）')
    info = result.get('data') or {}
    print(f'已归档到「{args.name}」：笔记 {info.get("recordId", "")}' + ('（此前已归档）' if info.get('existing') else ''))


def main(argv=None):
    parser = argparse.ArgumentParser(description='AI 对话归档连接与写入工具')
    commands = parser.add_subparsers(dest='command', required=True)
    p = commands.add_parser('link', help='保存具名连接')
    p.add_argument('--name', required=True)
    p.add_argument('--url', required=True)
    p.add_argument('--key-stdin', action='store_true', help='从标准输入读取密钥，避免命令行参数泄漏')
    p.add_argument('--replace', action='store_true')
    p.set_defaults(run=link)
    p = commands.add_parser('list', help='列出连接，不显示完整密钥')
    p.set_defaults(run=list_profiles)
    p = commands.add_parser('unlink', help='删除本机连接')
    p.add_argument('--name', required=True)
    p.set_defaults(run=unlink)
    p = commands.add_parser('archive', help='向选择的连接新增笔记')
    p.add_argument('--name', required=True)
    p.add_argument('--title', required=True)
    p.add_argument('--file', help='Markdown 文件路径；省略时读取标准输入')
    p.add_argument('--request-id', help='重试同一次归档时沿用的请求标识')
    p.set_defaults(run=archive)
    args = parser.parse_args(argv)
    try:
        args.run(args)
    except (ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
