'use strict'
const neostandard = require('neostandard')

module.exports = [
  ...neostandard({ ignores: ['.yarn/**'] }),
  {
    rules: {
      'prefer-arrow-callback': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': 'error'
    }
  }
]
