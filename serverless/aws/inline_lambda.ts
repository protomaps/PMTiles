import { yamlParse, yamlDump } from 'yaml-cfn';
import fs from 'fs';

const template = yamlParse(fs.readFileSync('protomaps-template.yaml','utf-8'));
const code = fs.readFileSync('dist/index.js','utf8');
template.Resources.LambdaFunction.Properties.Code = {ZipFile:code};
fs.writeFileSync('dist/cloudformation-stack.yaml', yamlDump(template));
