var Container = require('../lib/container');
var assert = require('chai').assert;
var Promise = require('bluebird');

Promise.onPossiblyUnhandledRejection(function(error){
  // ignore promises which don't handle errors
});

suite('container', function() {
  setup(function() {
    this.container = new Container();
  });

  teardown(function() {
    this.container = null;
  });

  suite('register throws error', function() {

    test('with no arguments', function() {
      var container = this.container;
      assert.throw(function() {
        container.register({});
      }, /must have a name/i);
    });

    test('with no function', function() {
      var container = this.container;
      assert.throw(function() {
        container.register('foo');
      }, /must give a function/i);
    });

    test('already registered', function() {
      var container = new Container();
      container.register('first', function() {});
      assert.throw(function() {
        container.register('first', function() {});
      }, /already registered/i);
    });


  });

  suite('register/resolve', function() {

    test('`resolve` throws error if module is not registered', function(done) {
      this.container.resolve('doesntExist').done(function() {
        done(new Error('resolve should throw an error'));
      }, function(err) {
        if(/no module (:?.*?) registered/i.test(err.toString())) {
          done();
        } else {
          done(err);
        }
      });
    });

    test('module with no dependencies', function(done) {
      this.container.register('noDep', function() { return 'nodep'; });
      this.container.resolve('noDep').done(function(result) {
        assert.equal(result, 'nodep');
        done();
      });
    });

    test('module with a dependency', function(done) {
      var o1 = function() { return 'o1'; }
      var o2 = function(o1) { return o1+' augmented'; }
      this.container.register('o1', o1);
      this.container.register('o2', o2);
      this.container.resolve('o2').done(function(o2Module) {
        assert.equal(o2Module, 'o1 augmented');
        done();
      });

    });

    test('module with an explicit dependency', function(done) {
      var o1 = function() { return 'o1'; }
      var o2 = function(foo) { return foo+' augmented'; }
      this.container.register('o1', o1);
      this.container.register('o2', ['o1', o2]);
      this.container.resolve('o2').done(function(o2Module) {
        assert.equal(o2Module, 'o1 augmented');
        done();
      });
    });

    test('throw error when dependency is not found', function(done) {
      this.container.register('willFail', function(notHere) {return 'ok'; });
      this.container.resolve('willFail').then(function() {;
          done(new Error('resolve should throw an error'));
      }, function(err) {
        if(/dependency not found/i.test(err.toString())) {
          done();
        } else {
          done(err);
        }
      }).catch(done);
    });


  });

  test('can register existing objects', function() {
    var fs = require('fs');
    assert.equal(this.container.registerAndExport('fs', fs), fs);
  });

  suite('circular dependencies', function() {

    test('false positive', function(done) {
      this.container.registerAndExport('a', 'a');
      this.container.register('b', function(a) {
        return a+'b';
      });
      this.container.register('c', function(a, b) {
        return a+b+'c';
      });

      this.container.resolve('c').done(function() {
        done();
      });
    });

    test('throw error', function(done) {
      // a -> b -> c -> a
      this.container.register('a', function(c) { return c+'a'; });
      this.container.register('b', function(a) { return a+'b'; });
      this.container.register('c', function(b) { return b+'c'; });
      this.container.resolve('a').done(function() {
        done(new Error('Should throw an error'));
      }, function(err) {
        if(/circular dependency/i.test(String(err))) {
          done();
        } else {
          done(err);
        }
      });
    });

  });

});
