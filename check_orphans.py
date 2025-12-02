#!/usr/bin/env python3
"""
找出 frontend/src 中所有沒被 import 的孤兒檔案
"""

import os
import re
from pathlib import Path
from collections import defaultdict

# 配置
SRC_DIR = Path("c:/Users/Tim/Desktop/python/64web/frontend/src")

# 特殊檔案：不需要被 import
SPECIAL_FILES = {
    "main.tsx",  # 入口
    "App.tsx",   # 根元件
    "vite-env.d.ts",  # 型別定義
    "setup.ts",  # 測試設定
}

# 特殊目錄：檔案不需要被 import
SPECIAL_DIRS = {
    "__tests__",  # 測試檔案
    "pages",      # 頁面由路由載入
}

def should_skip(filepath: Path) -> tuple[bool, str]:
    """檢查檔案是否應該跳過"""
    # 測試檔案
    if filepath.name.endswith('.test.ts') or filepath.name.endswith('.test.tsx'):
        return True, "測試檔案"

    # .d.ts 檔案
    if filepath.name.endswith('.d.ts'):
        return True, "型別定義"

    # 特殊檔案
    if filepath.name in SPECIAL_FILES:
        return True, "特殊檔案（入口/根元件）"

    # 檢查是否在特殊目錄
    parts = filepath.parts
    if '__tests__' in parts:
        return True, "測試目錄"

    # 頁面檔案（在 pages/ 下，由路由載入）
    if 'pages' in parts and filepath.name.endswith('Page.tsx'):
        return True, "頁面元件（路由載入）"

    return False, ""

def get_all_ts_files():
    """取得所有 .ts 和 .tsx 檔案"""
    files = []
    for ext in ['**/*.ts', '**/*.tsx']:
        files.extend(SRC_DIR.glob(ext))
    return [f for f in files if f.is_file()]

def extract_filename_patterns(filepath: Path) -> list[str]:
    """提取檔案可能被 import 的模式"""
    # 去掉副檔名
    stem = filepath.stem

    # 相對於 src 的路徑
    try:
        rel_path = filepath.relative_to(SRC_DIR)
        rel_path_no_ext = str(rel_path).replace('\\', '/').rsplit('.', 1)[0]
    except ValueError:
        rel_path_no_ext = stem

    patterns = [
        stem,  # 檔名
        f"./{stem}",  # 相對路徑
        f"/{stem}",  # 絕對路徑
        rel_path_no_ext,  # 完整相對路徑（無副檔名）
    ]

    # 如果是 index，也檢查目錄名
    if stem == 'index':
        parent = filepath.parent.name
        patterns.extend([parent, f"./{parent}", f"/{parent}"])

    return patterns

def search_imports_in_file(filepath: Path, target_patterns: list[str]) -> bool:
    """檢查檔案中是否有 import 目標"""
    try:
        content = filepath.read_text(encoding='utf-8')
    except Exception:
        return False

    # 檢查 import 語句
    for pattern in target_patterns:
        # import ... from '...'
        if re.search(rf"import\s+.*from\s+['\"].*{re.escape(pattern)}", content):
            return True
        # import('...')
        if re.search(rf"import\s*\(['\"].*{re.escape(pattern)}", content):
            return True
        # export * from '...' or export * as ... from '...'
        if re.search(rf"export\s+\*.*from\s+['\"].*{re.escape(pattern)}", content):
            return True

    return False

def main():
    print("掃描孤兒檔案...")
    print(f"目錄: {SRC_DIR}\n")

    all_files = get_all_ts_files()
    print(f"總檔案數: {len(all_files)}\n")

    # 分類
    skipped = []
    orphans = []
    used = []

    for filepath in all_files:
        # 檢查是否應跳過
        skip, reason = should_skip(filepath)
        if skip:
            skipped.append((filepath, reason))
            continue

        # 取得檔名模式
        patterns = extract_filename_patterns(filepath)

        # 在所有其他檔案中搜尋 import
        found = False
        for other_file in all_files:
            if other_file == filepath:
                continue
            if search_imports_in_file(other_file, patterns):
                found = True
                break

        if found:
            used.append(filepath)
        else:
            orphans.append(filepath)

    # 輸出結果
    print("=" * 80)
    print("[ORPHAN FILES]")
    print("=" * 80)

    if orphans:
        print(f"\n[RED] 100% orphans (no imports, safe to delete): {len(orphans)}\n")

        # 按大小排序
        orphans_with_size = [(f, f.stat().st_size) for f in orphans]
        orphans_with_size.sort(key=lambda x: x[1], reverse=True)

        for filepath, size in orphans_with_size:
            rel_path = filepath.relative_to(SRC_DIR)
            print(f"  - {rel_path} ({size:,} bytes)")
    else:
        print("\n[OK] No orphan files!")

    print(f"\n{'=' * 80}")
    print("[STATISTICS]")
    print(f"{'=' * 80}")
    print(f"Total files: {len(all_files)}")
    print(f"Skipped (special/test/pages): {len(skipped)}")
    print(f"Used: {len(used)}")
    print(f"Orphans: {len(orphans)} ({len(orphans) * 100 // len(all_files) if all_files else 0}%)")

    # 顯示跳過的檔案（前 10 個）
    if skipped:
        print(f"\n{'=' * 80}")
        print("[SKIPPED FILES] (first 10)")
        print(f"{'=' * 80}")
        for filepath, reason in skipped[:10]:
            rel_path = filepath.relative_to(SRC_DIR)
            print(f"  - {rel_path} ({reason})")
        if len(skipped) > 10:
            print(f"  ... and {len(skipped) - 10} more")

if __name__ == "__main__":
    main()
