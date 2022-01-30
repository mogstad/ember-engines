import Application from '@ember/application';
import { run } from '@ember/runloop';
import EnginesInitializer from '../../initializers/engines';
import Engine from 'ember-engines/engine';
import { module, test } from 'qunit';

import Resolver from '../../resolver';
import config from '../../config/environment';

let App, app, appInstance;

module('Unit | EngineInstance', function(hooks) {
  hooks.beforeEach(function() {
    EnginesInitializer.initialize();

    App = Application.extend({
      Resolver,
      modulePrefix: config.modulePrefix,
      router: null,
      rootElement: '#ember-testing'
    });

    run(function() {
      app = App.create();
    });
  });

  hooks.afterEach(function() {
    if (appInstance) {
      run(appInstance, 'destroy');
    }

    if (app) {
      run(app, 'destroy');
    }
  });

  test('it can build a child engine instance without parent dependencies defined', function(assert) {
    assert.expect(1);

    let BlogEngine = Engine.extend({
      router: null,
      dependencies: Object.freeze({})
    });

    app.engines = undefined;

    app.register('engine:blog', BlogEngine);

    let appInstance = app.buildInstance();
    appInstance.setupRegistry();

    let blogEngineInstance = appInstance.buildChildEngineInstance('blog');

    assert.ok(blogEngineInstance);

    return blogEngineInstance.boot();
  });

  test('it can build a child engine instance with no dependencies', function(assert) {
    assert.expect(1);

    let BlogEngine = Engine.extend({ router: null });

    app.register('engine:blog', BlogEngine);

    let appInstance = app.buildInstance();
    appInstance.setupRegistry();

    let blogEngineInstance = appInstance.buildChildEngineInstance('blog');

    assert.ok(blogEngineInstance);

    return blogEngineInstance.boot();
  });

  test('it can build a child engine instance with dependencies', function(assert) {
    assert.expect(2);

    let BlogEngine = Engine.extend({
      router: null,
      dependencies: Object.freeze({
        services: ['store']
      })
    });

    app.engines = {
      blog: {
        dependencies: {
          services: ['store']
        }
      }
    };

    app.register('engine:blog', BlogEngine);

    let appInstance = app.buildInstance();
    appInstance.setupRegistry();

    let blogEngineInstance = appInstance.buildChildEngineInstance('blog');

    assert.ok(blogEngineInstance);

    return blogEngineInstance.boot().then(() => {
      assert.strictEqual(
        blogEngineInstance.lookup('service:store'),
        appInstance.lookup('service:store'),
        'services are identical'
      );
    });
  });

  test('it deprecates support for `router` service from host', function(assert) {
    assert.expect(2);

    let BlogEngine = Engine.extend({
      router: null,
      dependencies: Object.freeze({
        services: ['router']
      })
    });

    app.engines = {
      blog: {
        dependencies: {
          services: ['router']
        }
      }
    };

    app.register('engine:blog', BlogEngine);

    let appInstance = app.buildInstance();
    appInstance.setupRegistry();

    let blogEngineInstance = appInstance.buildChildEngineInstance('blog');

    assert.ok(blogEngineInstance);

    assert.deprecationsInclude(
      `Support for the host's router service has been deprecated. Please use a different name as 'hostRouter' or 'appRouter' instead of 'router'.`
    );
  });

  test('it can build a child engine instance with dependencies that are aliased', function(assert) {
    assert.expect(2);

    let BlogEngine = Engine.extend({
      router: null,
      dependencies: Object.freeze({
        services: [
          'data-store' // NOTE: Blog engine uses alias to 'store'
        ]
      })
    });

    app.engines = {
      blog: {
        dependencies: {
          services: [
            { 'data-store': 'store' } // NOTE: Main engine provides alias
          ]
        }
      }
    };

    app.register('engine:blog', BlogEngine);

    let appInstance = app.buildInstance();
    appInstance.setupRegistry();

    let blogEngineInstance = appInstance.buildChildEngineInstance('blog');

    assert.ok(blogEngineInstance);

    return blogEngineInstance.boot().then(() => {
      assert.strictEqual(
        blogEngineInstance.lookup('service:data-store'),
        appInstance.lookup('service:store'),
        'aliased services are identical'
      );
    });
  });

  test('it deprecates support for camelized engine names', async function(assert) {
    assert.expect(6);

    let NormalBlogEngine = Engine.extend({
      router: null,
      dependencies: Object.freeze({
        services: ['store']
      })
    });

    let SuperBlogEngine = Engine.extend({
      router: null,
      dependencies: Object.freeze({
        services: ['store']
      })
    });

    app.engines = {
      'normal-blog': {
        dependencies: {
          services: ['store']
        }
      },
      superBlog: {
        dependencies: {
          services: ['store']
        }
      }
    };

    app.register('engine:normal-blog', NormalBlogEngine);
    app.register('engine:super-blog', SuperBlogEngine);

    let appInstance = app.buildInstance();
    appInstance.setupRegistry();

    let normalBlogEngineInstance = appInstance.buildChildEngineInstance(
      'normal-blog'
    );
    assert.deprecationsExclude(
      `Support for camelized engine names has been deprecated. Please use 'normal-blog' instead of 'normalBlog'.`
    );

    let superBlogEngineInstance = appInstance.buildChildEngineInstance(
      'super-blog'
    );
    assert.deprecationsInclude(
      `Support for camelized engine names has been deprecated. Please use 'super-blog' instead of 'superBlog'.`
    );

    assert.ok(normalBlogEngineInstance);
    assert.ok(superBlogEngineInstance);

    await normalBlogEngineInstance.boot().then(() => {
      assert.strictEqual(
        normalBlogEngineInstance.lookup('service:store'),
        appInstance.lookup('service:store'),
        'services are identical'
      );
    });

    return superBlogEngineInstance.boot().then(() => {
      assert.strictEqual(
        superBlogEngineInstance.lookup('service:store'),
        appInstance.lookup('service:store'),
        'services are identical'
      );
    });
  });
});
