/* global before, describe, it */

const assert = require('assert')
const clownface = require('../')
const rdf = require('rdf-ext')
const initExample = require('./support/example')
const Dataset = require('../lib/Dataset')

describe('Dataset', () => {
  let graph

  before(() => {
    return initExample().then(dataset => {
      graph = dataset
    })
  })

  describe('factory', () => {
    it('should create a Dataset object', () => {
      const cf = clownface.dataset(graph)

      assert(cf instanceof Dataset)
    })

    it('should create an empty context', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(cf._context.length, 1)
      assert.strictEqual(cf._context[0].dataset, graph)
      assert(!cf._context[0].graph)
      assert(!cf._context[0].term)
    })

    it('should throw an error if an unknown type is given', () => {
      let catched = false

      try {
        clownface.dataset(graph, new RegExp())
      } catch (e) {
        catched = true
      }

      assert.strictEqual(catched, true)
    })
  })

  describe('.term', () => {
    it('should be undefined if there is no context with a term', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.term, 'undefined')
    })

    it('should be the term of the context if there is only one term', () => {
      const term = rdf.literal('1')

      const cf = clownface.dataset(graph, term)

      assert(term.equals(cf.term))
    })

    it('should be undefined if there are multiple terms in the context', () => {
      const termA = rdf.literal('1')
      const termB = rdf.namedNode('http://example.org/')

      const cf = clownface.dataset(graph, [termA, termB])

      assert.strictEqual(typeof cf.term, 'undefined')
    })
  })

  describe('.terms', () => {
    it('should be an array property', () => {
      const cf = clownface.dataset(graph)

      assert(Array.isArray(cf.terms))
    })

    it('should be empty if there is no context with a term', () => {
      const cf = clownface.dataset(graph)

      const result = cf.terms

      assert.deepStrictEqual(result, [])
    })

    it('should contain all terms of the context', () => {
      const termA = rdf.literal('1')
      const termB = rdf.namedNode('http://example.org/')

      const cf = clownface.dataset(graph, [termA, termB])

      const result = cf.terms

      assert.strictEqual(result.length, 2)
      assert(termA.equals(result[0]))
      assert(termB.equals(result[1]))
    })
  })

  describe('.value', () => {
    it('should be undefined if there is no context with a term', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.value, 'undefined')
    })

    it('should be the value of the context if there is only one term', () => {
      const term = rdf.literal('1')

      const cf = clownface.dataset(graph, term)

      assert.strictEqual(cf.value, term.value)
    })

    it('should be undefined if there are multiple terms in the context', () => {
      const termA = rdf.literal('1')
      const termB = rdf.namedNode('http://example.org/')

      const cf = clownface.dataset(graph, [termA, termB])

      assert.strictEqual(typeof cf.value, 'undefined')
    })
  })

  describe('.values', () => {
    it('should be an array property', () => {
      const cf = clownface.dataset(graph)

      assert(Array.isArray(cf.values))
    })

    it('should be empty if there is no context with a term', () => {
      const cf = clownface.dataset(graph)

      assert.deepStrictEqual(cf.values, [])
    })

    it('should contain the values of the terms', () => {
      const termA = rdf.literal('1')
      const termB = rdf.namedNode('http://example.org/')

      const cf = clownface.dataset(graph, [termA, termB])

      const result = cf.values

      assert.strictEqual(result.length, 2)
      assert.strictEqual(result[0], termA.value)
      assert.strictEqual(result[1], termB.value)
    })
  })

  describe('.list', () => {
    const ns = {
      first: rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
      list: rdf.namedNode('http://example.org/list'),
      nil: rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'),
      rest: rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest')
    }

    const listGraph = () => {
      const start = rdf.blankNode()
      const item = [rdf.blankNode(), rdf.blankNode(), rdf.blankNode()]

      return rdf.dataset([
        rdf.quad(start, ns.list, item[0]),
        rdf.quad(item[0], ns.first, rdf.literal('1')),
        rdf.quad(item[0], ns.rest, item[1]),
        rdf.quad(item[1], ns.first, rdf.literal('2')),
        rdf.quad(item[1], ns.rest, item[2]),
        rdf.quad(item[2], ns.first, rdf.literal('3')),
        rdf.quad(item[2], ns.rest, ns.nil)
      ])
    }

    it('should be a function', () => {
      const cf = clownface.dataset(listGraph())

      assert.strictEqual(typeof cf.list, 'function')
    })

    it('should return an iterator', () => {
      const cf = clownface.dataset(listGraph())

      assert.strictEqual(typeof cf.out(ns.list).list()[Symbol.iterator], 'function')
    })

    it('should iterate over a single term context', () => {
      const cf = clownface.dataset(listGraph())

      const result = []

      for (const item of cf.out(ns.list).list()) {
        result.push(item.value)
      }

      assert.deepStrictEqual(result, ['1', '2', '3'])
    })

    it('should not iterate over a multiple term context', () => {
      const cf = clownface.dataset(listGraph().addAll(listGraph()))

      let list
      let touched = false

      try {
        list = cf.out(ns.list).list()[Symbol.iterator]
      } catch (e) {
        touched = true
      }

      assert(touched)
      assert(!list)
    })
  })

  describe('.node', () => {
    it('should be a function', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.node, 'function')
    })

    it('should return a new Dataset instance', () => {
      const term = rdf.namedNode('http://localhost:8080/data/person/stuart-bloom')
      const cf = clownface.dataset(graph)

      const result = cf.node(term)

      assert(result instanceof Dataset)
      assert.notStrictEqual(result, cf)
    })

    it('should use the dataset from the context', () => {
      const term = rdf.namedNode('http://localhost:8080/data/person/stuart-bloom')
      const cf = clownface.dataset(graph)

      const result = cf.node(term)

      assert.strictEqual(result._context[0].dataset, graph)
    })

    it('should use the given Named Node', () => {
      const term = rdf.namedNode('http://localhost:8080/data/person/stuart-bloom')
      const cf = clownface.dataset(graph)

      const result = cf.node(term)

      assert.strictEqual(result._context.length, 1)
      assert(term.equals(result._context[0].term))
    })

    it('should use the given string as Literal', () => {
      const value = '2311 North Los Robles Avenue, Aparment 4A'
      const cf = clownface.dataset(graph)

      const result = cf.node(value)

      assert.strictEqual(result._context.length, 1)
      assert.strictEqual(result._context[0].term.termType, 'Literal')
      assert.strictEqual(result._context[0].term.value, value)
    })

    it('should use the given number as Literal', () => {
      const cf = clownface.dataset(graph)

      const result = cf.node(123)

      assert.strictEqual(result._context.length, 1)
      assert.strictEqual(result._context[0].term.termType, 'Literal')
      assert.strictEqual(result._context[0].term.value, '123')
    })

    it('should throw an error if an unknown type is given', () => {
      const cf = clownface.dataset(graph)

      let result
      let catched = false

      try {
        result = cf.node(new RegExp()).nodes()
      } catch (e) {
        catched = true
      }

      assert.strictEqual(catched, true)
      assert.strictEqual(result, undefined)
    })

    it('should support multiple values in an array', () => {
      const cf = clownface.dataset(graph)

      const result = cf.node(['1', '2'])

      assert.strictEqual(result._context.length, 2)
      assert.strictEqual(result._context[0].term.termType, 'Literal')
      assert.strictEqual(result._context[0].term.value, '1')
      assert.strictEqual(result._context[1].term.termType, 'Literal')
      assert.strictEqual(result._context[1].term.value, '2')
    })
  })

  describe('.toArray', () => {
    it('should be a function', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.toArray, 'function')
    })

    it('should return an array', () => {
      const cf = clownface.dataset(graph)

      assert(Array.isArray(cf.toArray()))
    })

    it('should return a Dataset instance for every context object', () => {
      const cf = clownface.dataset(graph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      const result = cf.in(rdf.namedNode('http://schema.org/knows')).toArray()

      assert.strictEqual(result.length, 7)
      assert(result[0] instanceof Dataset)
    })
  })

  describe('.filter', () => {
    it('should be a function', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.filter, 'function')
    })

    it('should return a Dataset instance', () => {
      const cf = clownface.dataset(graph)

      assert(cf.filter(() => true) instanceof Dataset)
    })

    it('should call the function with Dataset parameter', () => {
      const cf = clownface.dataset(graph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      cf.in(rdf.namedNode('http://schema.org/knows'))
        .filter(item => {
          assert(item instanceof Dataset)

          return true
        })
    })

    it('should call the function for each context', () => {
      const cf = clownface.dataset(graph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      let count = 0

      cf.in(rdf.namedNode('http://schema.org/knows'))
        .filter(() => {
          count++

          return true
        })

      assert.strictEqual(count, 7)
    })

    it('should filter the context based on the return value of the function', () => {
      const cf = clownface.dataset(graph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      const result = cf.in(rdf.namedNode('http://schema.org/knows'))
        .filter(item => {
          return !item.terms.every(term => {
            return term.equals(rdf.namedNode('http://localhost:8080/data/person/howard-wolowitz'))
          })
        })

      assert.strictEqual(result._context.length, 6)
    })
  })

  describe('.forEach', () => {
    it('should be a function', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.forEach, 'function')
    })

    it('should call the function with Dataset parameter', () => {
      const cf = clownface.dataset(graph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      cf.in(rdf.namedNode('http://schema.org/knows'))
        .forEach(item => {
          assert(item instanceof Dataset)

          return true
        })
    })

    it('should call the function for each context', () => {
      const cf = clownface.dataset(graph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      let count = 0

      cf.in(rdf.namedNode('http://schema.org/knows'))
        .forEach(() => {
          count++

          return true
        })

      assert.strictEqual(count, 7)
    })
  })

  describe('.map', () => {
    it('should be a function', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.map, 'function')
    })

    it('should return an Array', () => {
      const cf = clownface.dataset(graph)

      assert(Array.isArray(cf.map(item => item)))
    })

    it('should call the function with Dataset parameter', () => {
      const cf = clownface.dataset(graph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      cf.in(rdf.namedNode('http://schema.org/knows'))
        .map(item => {
          assert(item instanceof Dataset)

          return true
        })
    })

    it('should call the function for each context', () => {
      const cf = clownface.dataset(graph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      let count = 0

      cf.in(rdf.namedNode('http://schema.org/knows'))
        .map(() => {
          count++

          return true
        })

      assert.strictEqual(count, 7)
    })

    it('should return an array of all return values', () => {
      const cf = clownface.dataset(graph)

      const result = cf.node(rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))
        .in(rdf.namedNode('http://schema.org/knows'))
        .map((item, index) => {
          return index
        })

      assert.deepStrictEqual(result, [0, 1, 2, 3, 4, 5, 6])
    })
  })

  describe('.toString', () => {
    it('should be a function', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.toString, 'function')
    })

    it('should return a string', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.toString(), 'string')
    })

    it('should return the value of a single term', () => {
      const cf = clownface.dataset(graph)

      const result = cf.node(rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))
        .out(rdf.namedNode('http://schema.org/givenName'))
        .toString()

      assert.strictEqual(result, 'Bernadette')
    })

    it('should return comma separated values if multiple terms', () => {
      const cf = clownface.dataset(graph)

      const givenName = cf.node([
        rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'),
        rdf.namedNode('http://localhost:8080/data/person/howard-wolowitz')
      ])
        .out(rdf.namedNode('http://schema.org/givenName'))
        .toString()

      assert.strictEqual(givenName, 'Bernadette,Howard')
    })
  })

  describe('.in', () => {
    it('should be a function', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.in, 'function')
    })

    it('should return a new Dataset instance', () => {
      const cf = clownface.dataset(graph, '2311 North Los Robles Avenue, Aparment 4A')

      const result = cf.in(rdf.namedNode('http://schema.org/streetAddress'))

      assert(result instanceof Dataset)
      assert.notStrictEqual(result, cf)
    })

    it('should search object -> subject', () => {
      const cf = clownface.dataset(graph, '2311 North Los Robles Avenue, Aparment 4A')

      const result = cf.in(rdf.namedNode('http://schema.org/streetAddress'))

      assert.strictEqual(result._context.length, 2)
      assert.strictEqual(result._context[0].term.termType, 'BlankNode')
    })

    it('should support multiple predicate values in an array', () => {
      const cf = clownface.dataset(graph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      const result = cf.in([
        rdf.namedNode('http://schema.org/spouse'),
        rdf.namedNode('http://schema.org/knows')
      ])

      assert.strictEqual(result._context.length, 8)
    })
  })

  describe('.out', () => {
    it('should be a function', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.out, 'function')
    })

    it('should return a new Dataset instance', () => {
      const cf = clownface.dataset(graph, rdf.namedNode('http://localhost:8080/data/person/amy-farrah-fowler'))

      const result = cf.out(rdf.namedNode('http://schema.org/jobTitle'))

      assert(result instanceof Dataset)
      assert.notStrictEqual(result, cf)
    })

    it('should search subject -> object', () => {
      const cf = clownface.dataset(graph, rdf.namedNode('http://localhost:8080/data/person/amy-farrah-fowler'))

      const result = cf.out(rdf.namedNode('http://schema.org/jobTitle'))

      assert.strictEqual(result._context.length, 1)
      assert.strictEqual(result._context[0].term.termType, 'Literal')
      assert.strictEqual(result._context[0].term.value, 'neurobiologist')
    })

    it('should support multiple predicate values in an array', () => {
      const cf = clownface.dataset(graph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      const result = cf.out([
        rdf.namedNode('http://schema.org/familyName'),
        rdf.namedNode('http://schema.org/givenName')
      ])

      assert.strictEqual(result._context.length, 2)
    })
  })

  describe('.has', () => {
    it('should be a function', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.has, 'function')
    })

    it('should return a new Dataset instance', () => {
      const predicate = rdf.namedNode('http://schema.org/givenName')
      const cf = clownface.dataset(graph)

      const result = cf.has(predicate, 'Stuart')

      assert(result instanceof Dataset)
      assert.notStrictEqual(result, cf)
    })

    it('should use the dataset from the context', () => {
      const predicate = rdf.namedNode('http://schema.org/givenName')
      const cf = clownface.dataset(graph)

      const result = cf.has(predicate, 'Stuart')

      assert.strictEqual(result._context[0].dataset, graph)
    })

    it('should use the found subject in the context', () => {
      const subject = rdf.namedNode('http://localhost:8080/data/person/stuart-bloom')
      const predicate = rdf.namedNode('http://schema.org/givenName')
      const cf = clownface.dataset(graph)

      const result = cf.has(predicate, 'Stuart')

      assert.strictEqual(result._context.length, 1)
      assert(subject.equals(result._context[0].term))
    })

    it('should support multiple predicates in an array', () => {
      const predicateA = rdf.namedNode('http://schema.org/knows')
      const predicateB = rdf.namedNode('http://schema.org/spouse')
      const object = rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski')
      const cf = clownface.dataset(graph)

      const result = cf.has([predicateA, predicateB], object)

      assert.strictEqual(result._context.length, 8)
    })

    it('should support multiple predicates in an array', () => {
      const predicate = rdf.namedNode('http://schema.org/givenName')
      const objectA = rdf.literal('Leonard')
      const objectB = rdf.literal('Sheldon')
      const cf = clownface.dataset(graph)

      const result = cf.has(predicate, [objectA, objectB])

      assert.strictEqual(result._context.length, 2)
    })

    it('should use context term as subject', () => {
      const subjectA = rdf.namedNode('http://localhost:8080/data/person/sheldon-cooper')
      const subjectB = rdf.namedNode('http://localhost:8080/data/person/stuart-bloom')
      const predicate = rdf.namedNode('http://schema.org/givenName')
      const objects = [
        rdf.literal('Leonard'),
        rdf.literal('Sheldon')
      ]

      const cf = clownface.dataset(graph, [subjectA, subjectB])

      const result = cf.has(predicate, objects)

      assert.strictEqual(result._context.length, 1)
      assert(result._context[0].term.equals(subjectA))
    })
  })

  describe('.deleteIn', () => {
    it('should be a function', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.deleteIn, 'function')
    })

    it('should return the called object', () => {
      const localGraph = rdf.dataset().addAll(graph)
      const cf = clownface.dataset(localGraph)

      assert.strictEqual(cf.deleteIn(), cf)
    })

    it('should remove quads based on the object value', () => {
      const localGraph = rdf.dataset().addAll(graph)
      const cf = clownface.dataset(localGraph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      cf.deleteIn()

      assert.strictEqual(localGraph.length, 118)
    })

    it('should remove quads based on the object value and predicate', () => {
      const localGraph = rdf.dataset().addAll(graph)
      const cf = clownface.dataset(localGraph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      cf.deleteIn(rdf.namedNode('http://schema.org/knows'))

      assert.strictEqual(localGraph.length, 119)
    })

    it('should remove quads based on the object value and multiple predicates', () => {
      const localGraph = rdf.dataset().addAll(graph)
      const cf = clownface.dataset(localGraph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      cf.deleteIn([
        rdf.namedNode('http://schema.org/knows'),
        rdf.namedNode('http://schema.org/spouse')
      ])

      assert.strictEqual(localGraph.length, 118)
    })
  })

  describe('.deleteOut', () => {
    it('should be a function', () => {
      const cf = clownface.dataset(graph)

      assert.strictEqual(typeof cf.deleteOut, 'function')
    })

    it('should return the called object', () => {
      const localGraph = rdf.dataset().addAll(graph)
      const cf = clownface.dataset(localGraph)

      assert.strictEqual(cf.deleteOut(), cf)
    })

    it('should remove quad based on the object value', () => {
      const localGraph = rdf.dataset().addAll(graph)
      const cf = clownface.dataset(localGraph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      cf.deleteOut()

      assert.strictEqual(localGraph.length, 113)
    })

    it('should remove quad based on the object value and predicate', () => {
      const localGraph = rdf.dataset().addAll(graph)
      const cf = clownface.dataset(localGraph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      cf.deleteOut(rdf.namedNode('http://schema.org/knows'))

      assert.strictEqual(localGraph.length, 119)
    })

    it('should remove quad based on the object value and multiple predicates', () => {
      const localGraph = rdf.dataset().addAll(graph)
      const cf = clownface.dataset(localGraph, rdf.namedNode('http://localhost:8080/data/person/bernadette-rostenkowski'))

      cf.deleteOut([
        rdf.namedNode('http://schema.org/knows'),
        rdf.namedNode('http://schema.org/spouse')
      ])

      assert.strictEqual(localGraph.length, 118)
    })
  })
})
