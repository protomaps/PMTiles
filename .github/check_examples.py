import json
import glob
import re

fail = 0

for package in glob.glob("**/package.json",recursive=True):
	if "node_modules" in package:
		continue

	with open(package,"r") as f:
		j = json.loads(f.read())
		name = j["name"]
		version = j["version"]

	for html in glob.glob("**/*.html",recursive=True):
		if "node_modules" in html:
			continue

		with open(html,"r") as f:
			matches = re.findall("https://unpkg.com/" + name + r"@(\d+\.\d+\.\d+|latest)/",f.read())
			for match in matches:
				if matches[0] == "latest" or matches[0] != version:
					print(html,"should be",version,"was",matches)
					fail = 1

exit(fail)
