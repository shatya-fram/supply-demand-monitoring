#!/usr/bin/env python3
"""Pure-stdlib .xlsb reader (strings, numbers, formula results) shared by the catalogue builders.

    sheets = read_sheets(path)            # {sheet name: [ {col index: value}, ... ]}   (rows with at least one cell)
    rows = read_sheets(path, wanted)      # only the sheets whose name matches `wanted` (callable or set of upper-case names)

Cell values are str or float; booleans stay bool. Empty rows are skipped by the format, so row numbers are not
spreadsheet row numbers.
"""
import re
import struct
import zipfile


def _records(buf):
    pos, n = 0, len(buf)
    while pos < n:
        b = buf[pos]; rt = b & 0x7F; pos += 1
        if b & 0x80:
            rt |= (buf[pos] & 0x7F) << 7; pos += 1
        b = buf[pos]; ln = b & 0x7F; pos += 1; sh = 7
        while b & 0x80:
            b = buf[pos]; ln |= (b & 0x7F) << sh; pos += 1; sh += 7
        yield rt, buf[pos:pos + ln]
        pos += ln


def _rk(rk):
    is_int = bool(rk & 0x02)
    val = (rk >> 2) if is_int else struct.unpack('<d', struct.pack('<II', 0, rk & 0xFFFFFFFC))[0]
    return val / 100.0 if rk & 0x01 else val


def shared_strings(raw):
    out = []
    for rt, rec in _records(raw):
        if rt == 0x13:
            ln = struct.unpack('<I', rec[1:5])[0]
            out.append(rec[5:5 + ln * 2].decode('utf-16le', errors='ignore'))
    return out


def sheet_names(z):
    names = []
    for rt, rec in _records(z.read('xl/workbook.bin')):
        if rt == 156:
            n1 = struct.unpack('<I', rec[8:12])[0]
            p = 12 + n1 * 2
            n2 = struct.unpack('<I', rec[p:p + 4])[0]
            names.append(rec[p + 4:p + 4 + n2 * 2].decode('utf-16le', errors='ignore'))
    return names


def parse_rows(buf, sst):
    rows, cur = [], None
    U = struct.unpack_from
    for rt, rec in _records(buf):
        if rt == 0:
            if cur is not None:
                rows.append(cur)
            cur = {}
        elif cur is None:
            continue
        elif rt == 7:
            i = U('<I', rec, 8)[0]
            cur[U('<I', rec, 0)[0]] = sst[i] if i < len(sst) else None
        elif rt == 2:
            cur[U('<I', rec, 0)[0]] = _rk(U('<I', rec, 8)[0])
        elif rt in (5, 9):
            cur[U('<I', rec, 0)[0]] = U('<d', rec, 8)[0]
        elif rt in (6, 8):
            ln = U('<I', rec, 8)[0]
            cur[U('<I', rec, 0)[0]] = rec[12:12 + ln * 2].decode('utf-16le', 'ignore')
        elif rt in (4, 10):
            cur[U('<I', rec, 0)[0]] = bool(rec[8])
    if cur is not None:
        rows.append(cur)
    return rows


def read_sheets(path, wanted=None):
    out = {}
    with zipfile.ZipFile(path) as z:
        sst = shared_strings(z.read('xl/sharedStrings.bin')) if 'xl/sharedStrings.bin' in z.namelist() else []
        names = sheet_names(z)
        files = sorted([x for x in z.namelist() if re.match(r'xl/worksheets/sheet\d+\.bin$', x)], key=lambda x: int(re.findall(r'\d+', x)[0]))
        for i, fn in enumerate(files):
            nm = names[i] if i < len(names) else 'sheet%d' % (i + 1)
            if wanted is None or (wanted(nm) if callable(wanted) else nm.strip().upper() in wanted):
                out[nm] = parse_rows(z.read(fn), sst)
    return out


def cell(v):
    """Text of a cell: integers lose '.0', None becomes ''."""
    if v is None:
        return ''
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return str(v).strip()
