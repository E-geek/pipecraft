const stylusLoaderConf = {
  "loader": "stylus-loader",
  "options": {
    "sourceMap": true,
  }
};

// RegExps for Syntactically Awesome Style Sheets
// const regexStylGlobal = /(?<!\.module)\.styl$/
const regexStylModules = /\.module\.styl$/

const isSassRule = (rule) => {
  return rule.test && rule.test.toString().includes('\\.module\\.(scss|sass)$')
}

const markRemovable = r => {
  Object.defineProperty(r, Symbol.for('__next_css_remove'), {
    enumerable: false,
    value: true,
  })
  return r
};

export default function (config) {
  const cssScope = config.module.rules.find((rule) => {
    if (rule.test) {
      return isSassRule(rule);
    }
    if (rule.oneOf) {
      return rule.oneOf.some((subRule) => {
        if (subRule.test) {
          return isSassRule(subRule);
        }
        return false;
      });
    }
    return false;
  });
  if (!cssScope) {
    return config;
  }
  const extendSet = cssScope.oneOf
  const sassRule = extendSet.find(isSassRule);
  let indexForInsertion = sassRule ? extendSet.indexOf(sassRule) : extendSet.length - 1;
  const ruleUse = [...sassRule.use].filter((loader) => !loader.loader.includes('sass-loader'));
  ruleUse.push(stylusLoaderConf);

  const addConfig = [
    markRemovable({
      "sideEffects": true,
      "test": regexStylModules,
      "issuerLayer": {
        "or": [
          "rsc",
          "ssr",
          "app-pages-browser"
        ]
      },
      "use": [...ruleUse],
    }),
    markRemovable({
      "sideEffects": true,
      "test": regexStylModules,
      "issuerLayer": {
        "not": [ // NOT
          "rsc",
          "ssr",
          "app-pages-browser"
        ]
      },
      "use": [...ruleUse].filter((loader) => !loader.loader.includes('next-flight-css-loader')),
    })
  ];

  extendSet.splice(indexForInsertion, 0, ...addConfig);

  return config;
}
