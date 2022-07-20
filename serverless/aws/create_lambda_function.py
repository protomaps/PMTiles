import zipfile
import subprocess

sha = subprocess.check_output(["git", "describe", "--always"]).strip()

with zipfile.ZipFile("lambda_function.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.write("lambda_function.py")
    z.write("util.py")
    z.write("../../python/pmtiles/reader.py", "pmtiles/reader.py")
    z.writestr("version",sha)

print(f"created lambda_function.zip")
