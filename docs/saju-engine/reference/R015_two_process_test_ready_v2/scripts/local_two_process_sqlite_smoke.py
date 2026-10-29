#!/usr/bin/env python3
"""Offline two-process atomic quota smoke test; NOT Supabase/PostgreSQL proof.

Uses SQLite WAL as a deterministic, disposable local replacement for the R015
PostgreSQL counter. Runs two separate OS server processes, sends HTTP requests
across them, tests concurrent atomic counting, cleans up all local resources.
Only localhost ports; no credentials or real data.
"""
from __future__ import annotations
import json
import multiprocessing as mp
import os
import secrets
import sqlite3
import tempfile
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

MAX_PER_BUCKET = 10


def initialize_db(db_path):
    with sqlite3.connect(db_path, timeout=20) as conn:
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('CREATE TABLE quota (bucket TEXT PRIMARY KEY, n INTEGER NOT NULL CHECK (n >= 0))')


def run_worker(db_path, token, channel):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Never log tokens, IPs or user input.

        def reply(self, status, body):
            data = json.dumps(body, separators=(',', ':')).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('X-R015-Offline', 'true')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_POST(self):
            if self.path != '/probe':
                return self.reply(404, {'error': 'not_found'})
            if not secrets.compare_digest(self.headers.get('X-Test-Token', ''), token):
                return self.reply(403, {'allowed': False, 'reason': 'forbidden'})
            try:
                nbytes = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                return self.reply(400, {'allowed': False})
            if nbytes > 1024:
                return self.reply(413, {'allowed': False})
            self.rfile.read(nbytes)
            try:
                with sqlite3.connect(db_path, timeout=20, isolation_level='IMMEDIATE') as db:
                    # Fixed offline shared bucket; no user-supplied bucket/header affects identity.
                    count = db.execute('''INSERT INTO quota(bucket,n) VALUES('unknown',1)
                        ON CONFLICT(bucket) DO UPDATE SET n=n+1 RETURNING n''').fetchone()[0]
            except sqlite3.Error:
                return self.reply(503, {'allowed': False, 'reason': 'unavailable'})
            allowed = count <= MAX_PER_BUCKET
            return self.reply(200 if allowed else 429,
                              {'allowed': allowed} if allowed else {'allowed': False, 'reason': 'limited'})

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    server.daemon_threads = True
    channel.send((server.server_address[1], os.getpid()))
    channel.close()
    server.serve_forever(poll_interval=0.05)


def send(port, token, spoof=False):
    headers = {'X-Test-Token': token, 'Content-Length': '0'}
    if spoof:
        headers.update({'X-Forwarded-For': '198.51.100.4', 'CF-Connecting-IP': '203.0.113.7'})
    req = urllib.request.Request(f'http://127.0.0.1:{port}/probe', data=b'', headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            body = json.loads(response.read(256))
            assert response.headers.get('X-R015-Offline') == 'true'
            assert body.get('allowed') is True
            return response.status
    except urllib.error.HTTPError as e:
        body = json.loads(e.read(256))
        assert e.headers.get('X-R015-Offline') == 'true'
        assert e.code == 429 and body == {'allowed': False, 'reason': 'limited'}, (e.code, body)
        return e.code


def db_counts(db_path):
    with sqlite3.connect(db_path) as db:
        return db.execute('SELECT COUNT(*), COALESCE(MAX(n), 0) FROM quota').fetchone()


def main():
    mp.set_start_method('spawn', force=True)
    token = secrets.token_urlsafe(48)
    with tempfile.TemporaryDirectory(prefix='r015_local_') as folder:
        db_path = str(Path(folder) / 'quota.sqlite')
        initialize_db(db_path)
        children, ports, pids = [], [], []
        try:
            for _ in range(2):
                recv, send_pipe = mp.Pipe(duplex=False)
                child = mp.Process(target=run_worker, args=(db_path, token, send_pipe))
                child.start()
                send_pipe.close()
                assert recv.poll(10), 'Timed out awaiting worker start'
                port, pid = recv.recv()
                assert pid == child.pid and child.is_alive()
                children.append(child)
                ports.append(port)
                pids.append(pid)
            assert len(set(pids)) == 2 and len(set(ports)) == 2
            print('PASS: two different OS processes / two distinct loopback HTTP ports')

            one = [send(ports[i % 2], token, spoof=(i % 3 == 0)) for i in range(11)]
            assert one == [200] * 10 + [429], one
            assert db_counts(db_path) == (1, 11), db_counts(db_path)
            print('PASS: alternating two processes, 10 HTTP200 and 11th HTTP429; shared counter 11')

            # Reset only the disposable LOCAL SQLITE fixture, not the staging or production DB.
            with sqlite3.connect(db_path) as db:
                db.execute('DELETE FROM quota')
            nine = [send(ports[i % 2], token) for i in range(9)]
            assert nine == [200] * 9
            with ThreadPoolExecutor(max_workers=10) as pool:
                status = list(pool.map(lambda i: send(ports[i % 2], token, spoof=i % 3 == 0), range(10)))
            assert status.count(200) == 1 and status.count(429) == 9, status
            assert db_counts(db_path) == (1, 19), db_counts(db_path)
            print('PASS: seed 9 + 10 concurrent across two processes => 1 HTTP200 / 9 HTTP429; counter 19')
            print('PASS: spoofed client IP headers do not affect shared offline identity')
            print('LIMITATION: SQLite local test fixture only; NOT a stage Supabase RPC, Postgres, hosted, or production test')
        finally:
            for child in children:
                if child.is_alive():
                    child.terminate()
            for child in children:
                child.join(timeout=4)
                if child.is_alive():
                    child.kill()
                    child.join(timeout=4)
            assert not any(c.is_alive() for c in children), 'Child cleanup failed'
    print('PASS: all local processes stopped and disposable SQLite database removed')


if __name__ == '__main__':
    main()
