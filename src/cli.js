#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const jscodeshift = require('jscodeshift');

jscodeshift.ExpressionStatement;

const { pathRoot, regRules } = require(`${process.cwd()}/translate-cli.js`);

let isFirstImport = false;

const noIntl = ['Ctrl-Enter', 'Command-Enter', 'Metrics', 'Logs'];

/**
 * 插入国际化引入
 * @param {*} j
 */
const insertIntl = (j, ast) => {
  if (
    !ast
      .find(j.ImportDeclaration)
      .find(j.Identifier)
      .filter((item) => {
        return item.value.name === 't';
      }).length &&
    !isFirstImport
  ) {
    isFirstImport = true;
    ast.get().node.program.body.unshift("import { t } from '@lingui/macro';");
    console.log('import { t } from "@lingui/macro" 插入成功');
  }
};

/**
 * 当模板字符串时，返回国际化翻译
 * @param {*} p
 */
const templateTemplateLiteral = (p, j) => {
  let tel = '';
  const valueArr = []; // 记录国际化传值，以免冲突
  const templateElements = j(p).find(j.TemplateElement);
  const identifiers = j(p).find(j.Identifier);

  templateElements.forEach((templateElement, index) => {
    const value = identifiers.at(index).length
      ? identifiers.at(index).get().value.name
      : '';
    tel = `${tel}${templateElement.value.value.raw}${
      value ? ` \${${value}} ` : ''
    }`;
  });

  return templateScheme(tel);
};

/**
 * 根据值中有单引号，或者双引号返回不同的模板
 * @param {*} value
 */
const templateScheme = (value) => {
  return `t\`${value
    .replace(/`/g, '\\`')
    .replace(/{{/g, "'{{")
    .replace(/}}/g, "}}'")
    .replace(/{}/g, "'{}'")}\``;
};

/**
 * 国际化替换模板
 * @param {*} rule 根据规则返回模板
 * @param {*} value 值
 * @returns
 */
const template = (rule, p, j) => {
  const value = p?.value?.value?.replace(/\n/g, '').replace(/\r/g, '').trim();

  const { type } = p.parentPath.value;

  switch (type) {
    case 'JSXAttribute':
      return `{${templateScheme(value)}}`; //  <div rule='Demo' ></div>
  }
  switch (rule) {
    case 'JSXText': // <div>Dddddd</div>
      return `{${templateScheme(value)}}`;
    case 'ExpressionStatement:StringLiteral': // 函数中国际化
      return `${templateScheme(value)}`;
    case 'TemplateLiteral': // 字符串拼接
      return templateTemplateLiteral(p, j);
    case 'JSXElement:StringLiteral':
      return `${templateScheme(value)}`; // <div>{Demo}</div>
    case 'ClassProperty:Literal': // 函数中国际化
      return `${templateScheme(value)}`;
    case 'ObjectExpression:Literal':
      return `${templateScheme(value)}`;
  }
};

/**
 * 国际化匹配规则
 * @param {*} rule 根据规则返回模板
 * @param {*} value 值
 * @returns
 */
const replaceRule = (rule, item, j) => {
  const { value } = item.value;
  // 不需要翻译的信息直接返回
  console.log(rule, item?.parentPath?.value.type);
  if (
    noIntl.includes(value) ||
    item.name === 'key' ||
    item?.parentPath?.value.type === 'TaggedTemplateExpression' ||
    item?.parentPath?.parentPath?.value?.callee?.name === 'navigationLogger'
  ) {
    return false;
  }
  const reg =
    typeof value === 'string'
      ? /[A-Z]/.test(
          value.replace(/\n/g, '').replace(/\r/g, '').trim().slice(0, 1)
        )
      : false;
  switch (rule) {
    case 'JSXText':
      return reg;
    case 'ExpressionStatement:StringLiteral':
      return reg;
    case 'JSXElement:StringLiteral':
      return reg;
    case 'ClassProperty:Literal':
      return reg;
    case 'ObjectExpression:Literal':
      return reg;
    case 'TemplateLiteral':
      const { raw } = j(item).find(j.TemplateElement).at(0).get().value.value;
      console.log(rule, raw);

      return raw
        ? /[A-Z]/.test(
            raw.replace('\n', '').replace('\r', '').trim().slice(0, 1)
          )
        : false;
    default:
      return false;
  }
};

/**
 * 根据规则做国际化替换
 * @param {*} ast
 * @param {*} rule 规则
 */
const replaceIntl = (j, ast, rule) => {
  const ruleArr = rule.split(':');

  let imports = ast;
  ruleArr.forEach((value) => {
    imports = imports.find(j[value]);
  });

  const filterImports = imports.filter((item) => {
    return replaceRule(rule, item, j);
  });

  // 当文件需要国际化的时候，插入import引入国际化组件
  if (filterImports.length) {
    insertIntl(j, ast);
  }

  filterImports.replaceWith((p) => {
    return typeof p.value === 'string' && p.value.includes('t`')
      ? p.value
      : template(rule, p, j);
  });
};

const mapFiles = ({ reg, exten, rules }) => {
  const j = jscodeshift.withParser(exten);
  const files = glob.sync(path.join(process.cwd(), reg));
  for (value of files) {
    console.log(`${value}处理中。。。`);
    isFirstImport = false;
    const filedata = fs.readFileSync(value, 'utf-8');
    const ast = j(filedata);

    for (rule of rules) {
      replaceIntl(j, ast, rule);
    }

    fs.writeFileSync(value, ast.toSource());
    console.log(`${value}国际化规则替换成功`);
  }
};

for (value of regRules) {
  mapFiles(value);
}
