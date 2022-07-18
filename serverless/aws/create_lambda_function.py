import zipfile

with zipfile.ZipFile("lambda_function.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.write("lambda_function.py")
    z.write("../../python/pmtiles/reader.py", "pmtiles/reader.py")

print(f"created lambda_function.zip")
