#!/usr/bin/env python3
"""Package up the QGIS plugin into a versioned zip file for release."""

import re
import shutil
import tempfile
import tomllib
import zipfile
from pathlib import Path

# Config
PYPROJECT = Path("pyproject.toml")
SRC_PLUGIN_DIR = Path("PMTiles")
FILES_TO_COPY = ["LICENSE", "CHANGELOG.md", "README.md"]
LOCAL_PMTILES_SRC = Path("../python/pmtiles/pmtiles")

# Read version from pyproject.toml
with PYPROJECT.open("rb") as f:
    version = tomllib.load(f)["project"]["version"]

PLUGIN_NAME = SRC_PLUGIN_DIR
OUTPUT_ZIP = Path(f"{PLUGIN_NAME}-{version}.zip")


def fix_pmtiles_imports(vendor_dir: Path):
    """Convert absolute pmtiles imports to relative imports in vendored code."""
    print("Fixing pmtiles imports to use relative imports...")
    fixed_count = 0

    for py_file in vendor_dir.rglob("*.py"):
        content = py_file.read_text(encoding="utf-8")
        original_content = content

        # Replace "from pmtiles.X import Y" with "from .X import Y"
        content = re.sub(r"\bfrom pmtiles\.", "from .", content)

        # Replace "import pmtiles.X" with "from . import X"
        content = re.sub(r"\bimport pmtiles\.(\w+)", r"from . import \1", content)

        if content != original_content:
            py_file.write_text(content, encoding="utf-8")
            fixed_count += 1
            print(f"  Fixed imports in {py_file.relative_to(vendor_dir)}")

    print(f"Fixed imports in {fixed_count} file(s)")


def main():
    """Package the plugin."""
    if not SRC_PLUGIN_DIR.exists():
        raise FileNotFoundError(f"Plugin directory '{SRC_PLUGIN_DIR}' not found")
    if not LOCAL_PMTILES_SRC.exists():
        raise FileNotFoundError(
            f"Local pmtiles package not found at '{LOCAL_PMTILES_SRC}'"
        )

    # Create a temp build dir
    temp_dir = Path(tempfile.mkdtemp(prefix="qgis_plugin_build_"))
    build_plugin_dir = temp_dir / PLUGIN_NAME
    print(f"Building in {temp_dir}")

    try:
        # Copy plugin source
        shutil.copytree(SRC_PLUGIN_DIR, build_plugin_dir)

        # Copy markdown files into the plugin directory
        for fname in FILES_TO_COPY:
            src = Path(fname)
            if src.exists():
                shutil.copy2(src, build_plugin_dir / src.name)
            else:
                print(f"⚠️  Skipping missing file: {fname}")

        # Bundle the local repo pmtiles package under vendor/
        vendor_dir = build_plugin_dir / "vendor" / "pmtiles"
        vendor_dir.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(LOCAL_PMTILES_SRC, vendor_dir)
        print(f"Bundled pmtiles package into {vendor_dir}")

        # Ensure vendor/ is a Python package
        init_file = vendor_dir.parent / "__init__.py"
        init_file.touch(exist_ok=True)
        print(f"Created {init_file} to make vendor/ a Python package")

        # Fix imports in vendored pmtiles to use relative imports
        fix_pmtiles_imports(vendor_dir)

        # Create ZIP archive
        with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
            for path in build_plugin_dir.rglob("*"):
                # Skip __pycache__ directories and their contents - important!
                if "__pycache__" in path.parts:
                    continue
                # Skip .pyc files
                if path.suffix == ".pyc":
                    continue
                
                arcname = path.relative_to(temp_dir)
                zipf.write(path, arcname)

        print(f"✅ Packaged plugin into {OUTPUT_ZIP}")

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        print(f"🧹 Cleaned up {temp_dir}")


if __name__ == "__main__":
    main()
