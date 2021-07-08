module.exports = {
  pathRoot: 'public',
  regRules: [
    {
      reg: 'public/**/*[!.test].tsx',
      exten: 'tsx',
      rules: [
        'ExpressionStatement:StringLiteral',
        'JSXElement:StringLiteral',
        'JSXText',
        'ClassProperty:Literal',
        'TemplateLiteral',
        'ObjectExpression:Literal'
      ],
    },
    {
      reg: 'public/**/*.ts',
      exten: 'ts',
      rules: [
        'ExpressionStatement:StringLiteral',
        'TemplateLiteral',
        'ObjectExpression:Literal'
      ],
    },
  ],
};
