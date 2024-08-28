import { yamlParse, yamlDump } from 'yaml-cfn';
import fs from 'fs';

const template = yamlParse(fs.readFileSync('protomaps-template.yaml'));
const code = fs.readFileSync('dist/index.js','utf8');
template.Resources.LambdaFunction.Properties.Code = {ZipFile:code};
fs.writeFileSync('out.yaml', yamlDump(template));
